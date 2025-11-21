import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Nessuna autorizzazione');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Utente non autenticato');
    }

    const { messages } = await req.json() as { messages: Message[] };

    // Analizza la conversazione con l'AI per estrarre dati strutturati
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    const analysisPrompt = `Analizza questa conversazione di diagnosi e estrai le seguenti informazioni in formato JSON:
- problem_type: tipo di problema (es. "Elettrico", "Idraulico", "Riscaldamento", ecc.)
- urgency_level: livello di urgenza ("low", "medium", "high")
- recommended_specialty: specialità raccomandata (es. "Elettricista", "Idraulico", "Tecnico HVAC", ecc.)
- ai_analysis: un breve riassunto dell'analisi (max 200 caratteri)
- possible_cause: possibile causa del problema
- estimated_cost_min: costo minimo stimato in euro (numero)
- estimated_cost_max: costo massimo stimato in euro (numero)
- estimated_time_hours: ore stimate per la riparazione (numero)
- image_url: URL dell'immagine se presente nella conversazione, altrimenti stringa vuota

Rispondi SOLO con un oggetto JSON valido, senza altro testo.`;

    const aiMessages = [
      { role: 'system', content: analysisPrompt },
      ...messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.imageUrl && { imageUrl: m.imageUrl }),
        ...(m.videoUrl && { videoUrl: m.videoUrl })
      }))
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: aiMessages,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Errore AI:', errorText);
      throw new Error('Errore nell\'analisi AI');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Estrai JSON dal contenuto
    let diagnosisData;
    try {
      // Prova a fare il parse diretto
      diagnosisData = JSON.parse(content);
    } catch {
      // Se fallisce, cerca un blocco JSON nel testo
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        diagnosisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Impossibile estrarre dati strutturati dalla conversazione');
      }
    }

    // Salva la diagnosi nel database
    const { data: diagnosis, error: dbError } = await supabase
      .from('diagnoses')
      .insert({
        user_id: user.id,
        problem_type: diagnosisData.problem_type || 'Non specificato',
        urgency_level: diagnosisData.urgency_level || 'medium',
        recommended_specialty: diagnosisData.recommended_specialty || 'Generico',
        ai_analysis: diagnosisData.ai_analysis || 'Analisi completata',
        possible_cause: diagnosisData.possible_cause || null,
        estimated_cost_min: diagnosisData.estimated_cost_min || null,
        estimated_cost_max: diagnosisData.estimated_cost_max || null,
        estimated_time_hours: diagnosisData.estimated_time_hours || null,
        image_url: diagnosisData.image_url || messages.find(m => m.imageUrl)?.imageUrl || '',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Errore DB:', dbError);
      throw dbError;
    }

    return new Response(
      JSON.stringify({ diagnosis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Errore:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
