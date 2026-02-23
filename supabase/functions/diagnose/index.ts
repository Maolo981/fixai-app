import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `Sei FixoAI, un esperto diagnostico per problemi domestici in Italia. Analizza la foto del problema domestico e rispondi SEMPRE in formato JSON valido (senza markdown, senza backtick, solo JSON puro). Il JSON deve avere: tipo_problema, categoria (una tra: idraulica, elettrica, serrature_infissi, elettrodomestici, hvac, edilizia, altro), descrizione_problema (2-3 frasi in italiano), gravita (basso/medio/alto/urgente), gravita_score (1-10), azioni_immediate, preventivo_min, preventivo_max (in euro, prezzi mercato italiano 2025: idraulica base 50-150€, complessa 150-500€, elettrica base 40-120€, complessa 200-800€, serrature 80-250€, elettrodomestici 80-300€, HVAC 100-400€, edilizia 200-1000€), tempo_stimato, professionista_necessario, note_aggiuntive. Se la foto non mostra un problema domestico, rispondi con tipo_problema='non_riconosciuto' e gravita_score=0.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, userId, description } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'URL immagine obbligatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticazione necessaria' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Utente non autenticato' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resolvedUserId = userId || user.id;

    // Call Lovable AI Gateway (vision-capable model)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    const userContent: any[] = [];
    if (description) {
      userContent.push({ type: 'text', text: `Descrizione del problema: ${description}. Analizza la foto e fornisci la diagnosi in JSON.` });
    } else {
      userContent.push({ type: 'text', text: 'Analizza questa foto di un problema domestico e fornisci la diagnosi in JSON.' });
    }
    userContent.push({ type: 'image_url', image_url: { url: imageUrl } });

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Troppe richieste. Riprova tra qualche minuto.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crediti AI esauriti. Contatta il supporto.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errText);
      throw new Error(`Errore AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error('Nessuna risposta dall\'AI');

    console.log('AI raw:', rawContent.substring(0, 300));

    // Parse JSON from AI response
    let diagnosis: any;
    try {
      let jsonStr = rawContent.trim()
        .replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/g, '');
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
      diagnosis = JSON.parse(jsonStr);
    } catch {
      console.error('JSON parse failed, raw:', rawContent);
      throw new Error('Impossibile interpretare la risposta AI');
    }

    // Save to database
    const { data: saved, error: insertError } = await supabase
      .from('diagnoses')
      .insert({
        user_id: resolvedUserId,
        image_url: imageUrl,
        user_description: description || null,
        // Italian fields
        tipo_problema: diagnosis.tipo_problema || 'non_riconosciuto',
        category: diagnosis.categoria || 'altro',
        descrizione_problema: diagnosis.descrizione_problema || '',
        gravita: diagnosis.gravita || 'medio',
        gravita_score: Math.min(10, Math.max(0, parseInt(diagnosis.gravita_score) || 5)),
        azioni_immediate: diagnosis.azioni_immediate || '',
        preventivo_min: parseFloat(diagnosis.preventivo_min) || 0,
        preventivo_max: parseFloat(diagnosis.preventivo_max) || 0,
        tempo_stimato: diagnosis.tempo_stimato || '',
        professionista_necessario: diagnosis.professionista_necessario || '',
        note_aggiuntive: diagnosis.note_aggiuntive || '',
        // Legacy fields (keep for backwards compat)
        problem_type: diagnosis.tipo_problema || 'Diagnosi AI',
        urgency_level: diagnosis.gravita || 'medium',
        possible_cause: diagnosis.descrizione_problema || '',
        recommended_specialty: diagnosis.professionista_necessario || 'General',
        ai_analysis: JSON.stringify(diagnosis),
        estimated_cost_min: parseFloat(diagnosis.preventivo_min) || 0,
        estimated_cost_max: parseFloat(diagnosis.preventivo_max) || 0,
        input_text: description || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('DB error:', insertError);
      throw new Error('Errore nel salvataggio della diagnosi');
    }

    return new Response(
      JSON.stringify({ diagnosis: saved, diagnosisId: saved.id, saved: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('diagnose error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

