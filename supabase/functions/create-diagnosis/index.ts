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

    // Collect input data from messages
    const userMessages = messages.filter(m => m.role === 'user');
    const inputText = userMessages.map(m => m.content).join('\n');
    const inputImages = userMessages
      .filter(m => m.imageUrl)
      .map(m => m.imageUrl as string);

    // Analizza la conversazione con l'AI per estrarre dati strutturati usando tool calling
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    const systemPrompt = `Sei un assistente specializzato nell'analisi di problemi di riparazione domestica. 
Analizza la conversazione e estrai informazioni strutturate sul problema descritto dall'utente.
Sii specifico e fornisci stime realistiche basate su problemi comuni in Italia.
Per ai_steps, fornisci 3-4 passaggi tipici che un tecnico seguirebbe.
Per ai_risk, descrivi brevemente cosa potrebbe peggiorare se l'utente rimanda l'intervento.
Per ai_probability, stima quanto sei sicuro della diagnosi (0-100).`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        tools: [
          {
            type: "function",
            function: {
              name: "create_diagnosis",
              description: "Crea una diagnosi strutturata del problema di riparazione con tutti i dettagli necessari",
              parameters: {
                type: "object",
                properties: {
                  problem_type: {
                    type: "string",
                    description: "Tipo di problema (es. Perdita rubinetto, Cortocircuito, Caldaia non funziona)"
                  },
                  category: {
                    type: "string",
                    enum: ["idraulico", "elettrico", "riscaldamento", "condizionamento", "serrature", "elettrodomestici", "generale"],
                    description: "Categoria del problema"
                  },
                  urgency_level: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "Livello di urgenza del problema"
                  },
                  recommended_specialty: {
                    type: "string",
                    description: "Specialità raccomandata (es. Idraulico, Elettricista, Tecnico Caldaie)"
                  },
                  ai_analysis: {
                    type: "string",
                    description: "Breve riassunto dell'analisi (max 150 caratteri)"
                  },
                  possible_cause: {
                    type: "string",
                    description: "Causa probabile del problema in 1-2 frasi"
                  },
                  ai_probability: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                    description: "Probabilità/confidenza della diagnosi (0-100)"
                  },
                  ai_risk: {
                    type: "string",
                    description: "Cosa potrebbe peggiorare se l'utente rimanda l'intervento (max 100 caratteri)"
                  },
                  ai_steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-4 passaggi tipici dell'intervento (es. 'Controllo valvola', 'Sostituzione guarnizione')"
                  },
                  estimated_cost_min: {
                    type: "number",
                    description: "Costo minimo stimato in euro (inclusa manodopera)"
                  },
                  estimated_cost_max: {
                    type: "number",
                    description: "Costo massimo stimato in euro (inclusa manodopera e ricambi)"
                  },
                  estimated_time_hours: {
                    type: "number",
                    description: "Ore stimate per la riparazione"
                  }
                },
                required: [
                  "problem_type", 
                  "category",
                  "urgency_level", 
                  "recommended_specialty", 
                  "ai_analysis",
                  "possible_cause",
                  "ai_probability",
                  "ai_risk",
                  "ai_steps",
                  "estimated_cost_min",
                  "estimated_cost_max"
                ],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_diagnosis" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Errore AI:', aiResponse.status, errorText);
      throw new Error('Errore nell\'analisi AI');
    }

    const aiData = await aiResponse.json();
    
    // Estrai i dati dalla chiamata alla funzione
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    if (!toolCall || !toolCall.function.arguments) {
      console.error('Nessuna chiamata alla funzione trovata:', aiData);
      throw new Error('Impossibile estrarre dati strutturati dalla conversazione');
    }

    const diagnosisData = JSON.parse(toolCall.function.arguments);
    console.log('Diagnosis data from AI:', diagnosisData);

    // Salva la diagnosi nel database con tutti i nuovi campi
    const { data: diagnosis, error: dbError } = await supabase
      .from('diagnoses')
      .insert({
        user_id: user.id,
        problem_type: diagnosisData.problem_type || 'Non specificato',
        category: diagnosisData.category || 'generale',
        urgency_level: diagnosisData.urgency_level || 'medium',
        recommended_specialty: diagnosisData.recommended_specialty || 'Generico',
        ai_analysis: diagnosisData.ai_analysis || 'Analisi completata',
        possible_cause: diagnosisData.possible_cause || null,
        ai_probability: diagnosisData.ai_probability || 80,
        ai_risk: diagnosisData.ai_risk || 'Il problema potrebbe peggiorare nel tempo.',
        ai_steps: diagnosisData.ai_steps || ['Controllo iniziale', 'Diagnosi', 'Riparazione'],
        estimated_cost_min: diagnosisData.estimated_cost_min || null,
        estimated_cost_max: diagnosisData.estimated_cost_max || null,
        estimated_time_hours: diagnosisData.estimated_time_hours ? Math.round(diagnosisData.estimated_time_hours) : null,
        input_text: inputText,
        input_images: inputImages,
        image_url: inputImages[0] || '',
        status: 'completed'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Errore DB:', dbError);
      throw dbError;
    }

    console.log('Diagnosis saved:', diagnosis);

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
