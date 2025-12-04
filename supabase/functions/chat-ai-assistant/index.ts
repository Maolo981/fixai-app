import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, jobContext, userType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = userType === 'technician' 
      ? `Sei un assistente AI esperto per tecnici della piattaforma FIXO.

Contesto del lavoro:
- Tipo di problema: ${jobContext?.problemType || 'Non specificato'}
- Analisi AI: ${jobContext?.aiAnalysis || 'Non disponibile'}
- Costo stimato: €${jobContext?.estimatedCostMin || '?'} - €${jobContext?.estimatedCostMax || '?'}
- Tempo stimato: ${jobContext?.estimatedHours || '?'} ore

Puoi aiutare i tecnici con:
- Suggerimenti tecnici per la riparazione
- Consigli sulla stima dei costi
- Best practices per la comunicazione con il cliente
- Suggerimenti per la creazione di preventivi
- Problemi tecnici comuni e soluzioni

Rispondi in italiano, in modo professionale e tecnico. Sii conciso ma completo.`
      : `Sei un assistente AI di FIXO che aiuta i clienti durante la chat con il tecnico.

Contesto del lavoro:
- Tipo di problema: ${jobContext?.problemType || 'Non specificato'}
- Possibile causa: ${jobContext?.possibleCause || 'Non identificata'}
- Urgenza: ${jobContext?.urgencyLevel || 'Non specificata'}
- Costo stimato: €${jobContext?.estimatedCostMin || '?'} - €${jobContext?.estimatedCostMax || '?'}

Puoi aiutare i clienti con:
- Spiegare cosa significa la diagnosi AI
- Suggerire domande da fare al tecnico
- Spiegare preventivi e costi
- Consigli su cosa preparare prima dell'intervento
- Rispondere a dubbi sulla riparazione

Rispondi in italiano, in modo chiaro e amichevole. Sii rassicurante ma onesto.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Troppe richieste, riprova più tardi." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti AI esauriti." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Errore del servizio AI" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat AI assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
