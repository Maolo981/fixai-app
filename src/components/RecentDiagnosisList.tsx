import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Brain, ChevronRight, Clock, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Diagnosis {
  id: string;
  problem_type: string;
  urgency_level: string;
  created_at: string;
  status: string | null;
  ai_probability: number | null;
}

interface RecentDiagnosisListProps {
  userId?: string;
  onNewDiagnosis?: () => void;
  limit?: number;
}

export function RecentDiagnosisList({ userId, onNewDiagnosis, limit = 3 }: RecentDiagnosisListProps) {
  const navigate = useNavigate();
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadRecentDiagnoses();
    }
  }, [userId]);

  const loadRecentDiagnoses = async () => {
    try {
      const { data, error } = await supabase
        .from('diagnoses')
        .select('id, problem_type, urgency_level, created_at, status, ai_probability')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setDiagnoses(data || []);
    } catch (error) {
      console.error("Error loading diagnoses:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return <Badge className="bg-destructive text-destructive-foreground text-xs">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white text-xs">Media</Badge>;
      case 'low':
        return <Badge className="bg-green-500 text-white text-xs">Bassa</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{urgency}</Badge>;
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'completed':
        return 'Completata';
      case 'assigned':
        return 'Assegnata';
      case 'booked':
        return 'Prenotata';
      case 'in_progress':
        return 'In corso';
      case 'done':
        return 'Terminata';
      default:
        return 'In attesa';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Poco fa';
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Diagnosis Button */}
      <Button 
        onClick={onNewDiagnosis || (() => navigate('/diagnose'))} 
        className="w-full gap-2 h-12"
        size="lg"
      >
        <Plus className="h-5 w-5" />
        Inizia Nuova Diagnosi
      </Button>

      {/* Recent Diagnoses */}
      {diagnoses.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground px-1">
            Diagnosi recenti
          </h3>
          
          {diagnoses.map((diagnosis) => (
            <Card 
              key={diagnosis.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/diagnosis/${diagnosis.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10 shrink-0">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">
                        {diagnosis.problem_type}
                      </p>
                      {getUrgencyBadge(diagnosis.urgency_level)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(diagnosis.created_at)}</span>
                      <span>•</span>
                      <span>{getStatusLabel(diagnosis.status)}</span>
                      {diagnosis.ai_probability && (
                        <>
                          <span>•</span>
                          <span className="text-primary font-medium">
                            {diagnosis.ai_probability}% match
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}

          {diagnoses.length >= limit && (
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={() => navigate('/dashboard?tab=diagnosi')}
            >
              Vedi tutte le diagnosi
            </Button>
          )}
        </div>
      )}

      {/* Empty state */}
      {diagnoses.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Brain className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Nessuna diagnosi recente. Inizia una nuova diagnosi per ricevere assistenza AI.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
