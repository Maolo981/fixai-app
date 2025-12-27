import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileLayout } from "@/components/MobileLayout";
import { AIDiagnosisCard } from "@/components/AIDiagnosisCard";

interface Diagnosis {
  id: string;
  problem_type: string;
  urgency_level: string;
  possible_cause: string | null;
  estimated_cost_min: number | null;
  estimated_cost_max: number | null;
  estimated_time_hours: number | null;
  recommended_specialty: string;
  ai_analysis: string;
  image_url: string;
  created_at: string;
  input_text: string | null;
  input_images: string[] | null;
  category: string | null;
  ai_probability: number | null;
  ai_risk: string | null;
  ai_steps: string[] | null;
  status: string | null;
}

const DiagnosisDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiagnosis();
  }, [id]);

  const loadDiagnosis = async () => {
    try {
      const { data, error } = await supabase
        .from('diagnoses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDiagnosis(data);
    } catch (error: any) {
      console.error("Error loading diagnosis:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare la diagnosi",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleFindTechnician = () => {
    if (diagnosis) {
      navigate(`/results/${diagnosis.id}`);
    }
  };

  const handleEditDiagnosis = () => {
    navigate("/diagnose");
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen bg-muted/30 py-6 px-4">
          <div className="container max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!diagnosis) {
    return (
      <MobileLayout>
        <div className="min-h-screen bg-muted/30 py-6 px-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Diagnosi non trovata</p>
            <Button onClick={() => navigate("/dashboard")}>
              Torna alla Dashboard
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const formattedDate = new Date(diagnosis.created_at).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <MobileLayout>
      <div className="min-h-screen bg-muted/30 py-6 px-4">
        <div className="container max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{diagnosis.problem_type}</h1>
              <p className="text-sm text-muted-foreground">{formattedDate}</p>
            </div>
          </div>

          {/* Image if available */}
          {diagnosis.image_url && (
            <div className="rounded-lg overflow-hidden">
              <img 
                src={diagnosis.image_url} 
                alt="Foto del problema"
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* AI Diagnosis Card */}
          <AIDiagnosisCard 
            diagnosis={diagnosis}
            onFindTechnician={handleFindTechnician}
            onEditDiagnosis={handleEditDiagnosis}
            showActions={true}
          />
        </div>
      </div>
    </MobileLayout>
  );
};

export default DiagnosisDetail;
