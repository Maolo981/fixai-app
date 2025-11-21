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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the messages with system prompt
    const systemPrompt = `Sei un assistente esperto di FIXO, specializzato in diagnosi di problemi di riparazione domestica.

Il tuo compito è:
1. Analizzare le immagini e i video caricati dall'utente
2. Identificare il tipo di problema (idraulico, elettrico, edile, etc.)
3. Fornire una diagnosi chiara e professionale
4. Stimare i costi di riparazione (min e max in EUR)
5. Indicare il livello di urgenza (basso, medio, alto)
6. Suggerire la specialità del tecnico necessario
7. Dare consigli pratici

Quando analizzi un'immagine o video, fornisci SEMPRE:
- Tipo di problema identificato
- Causa probabile
- Livello di urgenza (basso/medio/alto)
- Stima costi: min e max in EUR
- Specialità tecnico consigliata
- Tempo stimato di riparazione in ore

Per i video, analizza attentamente i movimenti, i rumori visibili e tutti i dettagli dinamici che possono aiutare nella diagnosi.

Rispondi sempre in italiano, in modo chiaro e professionale.`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: any) => {
        const contentParts: any[] = [{ type: "text", text: msg.content }];
        
        if (msg.imageUrl) {
          contentParts.push({
            type: "image_url",
            image_url: { url: msg.imageUrl }
          });
        }
        
        if (msg.videoUrl) {
          contentParts.push({
            type: "video_url",
            video_url: { url: msg.videoUrl }
          });
        }
        
        if (contentParts.length > 1) {
          return {
            role: msg.role,
            content: contentParts
          };
        }
        
        return { role: msg.role, content: msg.content };
      })
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
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
          JSON.stringify({ error: "Crediti esauriti." }),
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
    console.error("Diagnose chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
