import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MobileLayout } from "@/components/MobileLayout";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  MessageCircle,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { ChatDialog } from "@/components/ChatDialog";
import { ReviewDialog } from "@/components/ReviewDialog";

interface Job {
  id: string;
  created_at: string;
  scheduled_date: string | null;
  status: string;
  payment_status: string;
  diagnosis_id: string;
  technician_id: string;
  user_rating: number | null;
  user_review: string | null;
  final_cost: number | null;
  diagnoses?: {
    problem_type: string;
    urgency_level: string;
    estimated_time_hours: number;
    estimated_cost_min: number;
    estimated_cost_max: number;
    ai_analysis: string;
    image_url: string;
  };
  technicians?: {
    full_name: string;
    hourly_rate: number;
    specialties: string[];
    rating: number;
    total_jobs: number;
    avatar_url?: string;
  };
}

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    loadJobDetails();
    
    // Controlla se è una nuova prenotazione
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('new') === 'true') {
      setShowConfirmation(true);
      setChatDialogOpen(true);
      // Rimuovi il parametro dall'URL
      window.history.replaceState({}, '', `/jobs/${id}`);
    }
  }, [id]);

  const loadJobDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          diagnoses (
            problem_type,
            urgency_level,
            estimated_time_hours,
            estimated_cost_min,
            estimated_cost_max,
            ai_analysis,
            image_url
          ),
          technicians (
            full_name,
            hourly_rate,
            specialties,
            rating,
            total_jobs
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile caricare i dettagli della prenotazione",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'requested':
        return { label: 'Richiesto', icon: Clock, color: 'text-blue-500' };
      case 'pending':
        return { label: 'In Attesa', icon: Clock, color: 'text-yellow-600' };
      case 'confirmed':
        return { label: 'Confermato', icon: CheckCircle, color: 'text-green-600' };
      case 'in_progress':
        return { label: 'In Corso', icon: AlertCircle, color: 'text-blue-600' };
      case 'completed':
        return { label: 'Completato', icon: CheckCircle, color: 'text-green-600' };
      case 'cancelled':
        return { label: 'Annullato', icon: XCircle, color: 'text-red-600' };
      default:
        return { label: status, icon: Clock, color: 'text-gray-600' };
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p>Caricamento...</p>
        </div>
      </MobileLayout>
    );
  }

  if (!job) {
    return null;
  }

  const statusInfo = getStatusInfo(job.status);
  const StatusIcon = statusInfo.icon;

  return (
    <MobileLayout>
      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <header className="bg-card border-b sticky top-0 z-40 shadow-soft">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold">Dettagli Prenotazione</h1>
                <p className="text-xs text-muted-foreground">
                  {job.diagnoses?.problem_type}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
          {/* Confirmation Banner */}
          {showConfirmation && (
            <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      Prenotazione Confermata!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Ora puoi chattare con il tecnico nella chat qui sotto.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
                <div>
                  <CardTitle>Stato: {statusInfo.label}</CardTitle>
                  <CardDescription>
                    Creato il {new Date(job.created_at).toLocaleDateString('it-IT')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Diagnosis Image */}
          {job.diagnoses?.image_url && (
            <Card>
              <CardContent className="p-4">
                <img
                  src={job.diagnoses.image_url}
                  alt="Problema"
                  className="w-full rounded-lg"
                />
              </CardContent>
            </Card>
          )}

          {/* Diagnosis Details */}
          {job.diagnoses && (
            <Card>
              <CardHeader>
                <CardTitle>Dettagli Diagnosi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Urgenza</span>
                  <Badge 
                    variant={
                      job.diagnoses.urgency_level === 'high' 
                        ? 'destructive' 
                        : job.diagnoses.urgency_level === 'medium'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {job.diagnoses.urgency_level === 'high' ? 'Alta' : 
                     job.diagnoses.urgency_level === 'medium' ? 'Media' : 'Bassa'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tempo stimato</span>
                  <span className="font-medium">{job.diagnoses.estimated_time_hours}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Costo stimato</span>
                  <span className="font-medium">
                    €{job.diagnoses.estimated_cost_min} - €{job.diagnoses.estimated_cost_max}
                  </span>
                </div>
                {job.diagnoses.ai_analysis && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground">{job.diagnoses.ai_analysis}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Technician Details */}
          {job.technicians && (
            <Card>
              <CardHeader>
                <CardTitle>Tecnico Assegnato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {job.technicians.avatar_url ? (
                    <img 
                      src={job.technicians.avatar_url} 
                      alt={job.technicians.full_name}
                      className="h-16 w-16 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{job.technicians.full_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{job.technicians.rating}/5</span>
                      <span>•</span>
                      <span>{job.technicians.total_jobs} lavori completati</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tariffa oraria</span>
                    <span className="font-medium">€{job.technicians.hourly_rate}/ora</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.technicians.specialties.map((specialty, idx) => (
                      <Badge key={idx} variant="outline">{specialty}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Appointment Details */}
          {job.scheduled_date && (
            <Card>
              <CardHeader>
                <CardTitle>Appuntamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span>
                    {new Date(job.scheduled_date).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stato pagamento</span>
                <Badge variant={job.payment_status === 'paid' ? 'default' : 'secondary'}>
                  {job.payment_status === 'pending' ? 'Da pagare' : 
                   job.payment_status === 'paid' ? 'Pagato' : job.payment_status}
                </Badge>
              </div>
              {job.final_cost && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Costo finale</span>
                  <span className="text-2xl font-bold">€{job.final_cost}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3 pb-6">
            {(job.status === 'requested' || job.status === 'pending' || job.status === 'confirmed' || job.status === 'in_progress') && job.technician_id && (
              <Button
                onClick={() => setChatDialogOpen(true)}
                size="lg"
                className="w-full"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Apri Chat con il Tecnico
              </Button>
            )}

            {job.status === 'completed' && !job.user_rating && (
              <Button
                onClick={() => setReviewDialogOpen(true)}
                size="lg"
                className="w-full"
              >
                <Star className="h-5 w-5 mr-2" />
                Lascia una Recensione
              </Button>
            )}

            {job.user_rating && (
              <Card>
                <CardHeader>
                  <CardTitle>La Tua Recensione</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= (job.user_rating || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  {job.user_review && (
                    <p className="text-sm text-muted-foreground">{job.user_review}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <ChatDialog
          open={chatDialogOpen}
          onOpenChange={setChatDialogOpen}
          jobId={job.id}
          technicianName={job.technicians?.full_name || ''}
        />

        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          jobId={job.id}
          technicianName={job.technicians?.full_name || ''}
          onReviewSubmitted={loadJobDetails}
        />
      </div>
    </MobileLayout>
  );
};

export default JobDetails;
