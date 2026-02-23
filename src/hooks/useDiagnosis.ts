import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DiagnosisResult {
  id: string;
  tipo_problema: string;
  categoria: string;
  descrizione_problema: string;
  gravita: string;
  gravita_score: number;
  azioni_immediate: string;
  preventivo_min: number;
  preventivo_max: number;
  tempo_stimato: string;
  professionista_necessario: string;
  note_aggiuntive: string;
  image_url: string;
  user_description: string | null;
  status: string;
  created_at: string;
}

export function useDiagnosis() {
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [diagnosisId, setDiagnosisId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const diagnose = async (file: File, description?: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setDiagnosisId(null);

    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Devi effettuare l'accesso per usare la diagnosi");

      // Upload photo to diagnosis-photos bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('diagnosis-photos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw new Error(`Errore caricamento foto: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('diagnosis-photos')
        .getPublicUrl(fileName);

      // Call edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/diagnose`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            imageUrl: publicUrl,
            userId: user.id,
            description: description || undefined,
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: 'Errore sconosciuto' }));
        throw new Error(errData.error || `Errore ${resp.status}`);
      }

      const data = await resp.json();
      
      const diagResult: DiagnosisResult = {
        id: data.diagnosis.id,
        tipo_problema: data.diagnosis.tipo_problema || data.diagnosis.problem_type,
        categoria: data.diagnosis.categoria || 'altro',
        descrizione_problema: data.diagnosis.descrizione_problema || data.diagnosis.possible_cause || '',
        gravita: data.diagnosis.gravita || data.diagnosis.urgency_level || 'medio',
        gravita_score: data.diagnosis.gravita_score || 5,
        azioni_immediate: data.diagnosis.azioni_immediate || '',
        preventivo_min: data.diagnosis.preventivo_min || data.diagnosis.estimated_cost_min || 0,
        preventivo_max: data.diagnosis.preventivo_max || data.diagnosis.estimated_cost_max || 0,
        tempo_stimato: data.diagnosis.tempo_stimato || '',
        professionista_necessario: data.diagnosis.professionista_necessario || data.diagnosis.recommended_specialty || '',
        note_aggiuntive: data.diagnosis.note_aggiuntive || '',
        image_url: data.diagnosis.image_url,
        user_description: data.diagnosis.user_description || null,
        status: data.diagnosis.status || 'pending',
        created_at: data.diagnosis.created_at,
      };

      setResult(diagResult);
      setDiagnosisId(data.diagnosisId);
    } catch (err: any) {
      console.error('useDiagnosis error:', err);
      setError(err.message || 'Errore durante la diagnosi');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setDiagnosisId(null);
    setError(null);
    setIsLoading(false);
  };

  return { diagnose, result, diagnosisId, isLoading, error, reset };
}
