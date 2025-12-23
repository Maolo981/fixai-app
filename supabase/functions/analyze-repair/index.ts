import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Sei un esperto diagnostico di riparazioni domestiche. Analizza le immagini di riparazione e fornisci un'analisi strutturata IN ITALIANO.
            
            CRITICO: Restituisci SOLO JSON valido senza blocchi di codice markdown. Usa \\n per le interruzioni di riga nel testo.
            
            Restituisci questa esatta struttura JSON (tutti i testi devono essere IN ITALIANO):
            {
              "problemType": "Nome breve del problema (max 5 parole)",
              "urgencyLevel": "low" OR "medium" OR "high",
              "possibleCause": "Spiegazione dettagliata",
              "estimatedCostMin": number,
              "estimatedCostMax": number,
              "estimatedTimeHours": number,
              "recommendedSpecialty": "Plumbing" OR "Electrical" OR "HVAC" OR "Appliances" OR "Heating" OR "Boiler" OR "General",
              "aiAnalysis": "Testo di analisi dettagliata"
            }`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Per favore analizza questo problema di riparazione domestica e fornisci una diagnosi dettagliata IN ITALIANO. Restituisci SOLO l\'oggetto JSON, senza formattazione markdown.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI service rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service quota exceeded. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI Response:', content.substring(0, 200) + '...');

    // Clean and parse JSON response
    let diagnosis;
    try {
      // Remove markdown code blocks if present
      let jsonStr = content.trim();
      
      // Remove ```json and ``` markers
      jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/g, '');
      
      // Try to find JSON object if wrapped in extra text
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      // Parse the JSON
      diagnosis = JSON.parse(jsonStr);
      
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Attempted to parse:', content);
      
      // Fallback: try to extract data using regex
      try {
        const extractField = (field: string) => {
          const regex = new RegExp(`"${field}":\\s*"([^"]*)"`, 'i');
          const match = content.match(regex);
          return match ? match[1] : null;
        };
        
        const extractNumber = (field: string) => {
          const regex = new RegExp(`"${field}":\\s*(\\d+\\.?\\d*)`, 'i');
          const match = content.match(regex);
          return match ? parseFloat(match[1]) : 0;
        };

        diagnosis = {
          problemType: extractField('problemType') || 'Repair Issue',
          urgencyLevel: extractField('urgencyLevel') || 'medium',
          possibleCause: extractField('possibleCause') || 'Unable to determine cause from image',
          estimatedCostMin: extractNumber('estimatedCostMin') || 50,
          estimatedCostMax: extractNumber('estimatedCostMax') || 200,
          estimatedTimeHours: extractNumber('estimatedTimeHours') || 2,
          recommendedSpecialty: extractField('recommendedSpecialty') || 'General',
          aiAnalysis: extractField('aiAnalysis') || 'Please consult with a professional technician for accurate diagnosis.'
        };
        
        console.log('Used fallback parsing');
      } catch (fallbackError) {
        console.error('Fallback parsing failed:', fallbackError);
        throw new Error('Failed to parse AI response');
      }
    }

    // Validate response structure
    if (!diagnosis.problemType || !diagnosis.urgencyLevel || !diagnosis.recommendedSpecialty) {
      throw new Error('Invalid diagnosis structure from AI');
    }

    // Save diagnosis to database
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authentication');
    }

    // Insert diagnosis
    const { data: savedDiagnosis, error: insertError } = await supabase
      .from('diagnoses')
      .insert({
        user_id: user.id,
        image_url: imageUrl,
        problem_type: diagnosis.problemType,
        urgency_level: diagnosis.urgencyLevel,
        possible_cause: diagnosis.possibleCause || 'See analysis for details',
        estimated_cost_min: diagnosis.estimatedCostMin || 0,
        estimated_cost_max: diagnosis.estimatedCostMax || 0,
        estimated_time_hours: diagnosis.estimatedTimeHours || 1,
        recommended_specialty: diagnosis.recommendedSpecialty,
        ai_analysis: diagnosis.aiAnalysis || 'Analysis completed successfully.',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      throw new Error('Failed to save diagnosis');
    }

    console.log('Diagnosis saved successfully');

    return new Response(
      JSON.stringify(savedDiagnosis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-repair function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});