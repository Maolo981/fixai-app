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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChatDialog } from "@/components/ChatDialog";
import { ReviewDialog } from "@/components/ReviewDialog";
import { QuoteRequestCard } from "@/components/QuoteRequestCard";

interface Quote {
  id: string;
  description: string;
  estimated_hours: number;
  hourly_rate: number;
  total_cost: number;
  parts_cost: number;
  notes: string | null;
  status: string;
  expires_at: string;
  technicians: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

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
  quotes?: Quote[];
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
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

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
          ),
          quotes!quotes_job_id_fkey (
            id,
            description,
            estimated_hours,
            hourly_rate,
            total_cost,
            parts_cost,
            notes,
            status,
            expires_at,
            technicians (full_name, avatar_url)
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error("Errore nel caricamento del job:", error);
        throw error;
      }
      
      if (!data) {
        toast({
          title: "Prenotazione non trovata",
          description: "Questa prenotazione non esiste o è stata eliminata",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      
      console.log("Job caricato con successo:", data);
      setJob(data as unknown as Job);
    } catch (error: any) {
      console.error("Errore completo:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare i dettagli della prenotazione",
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
      case 'scheduled':
        return { label: 'Programmato', icon: Calendar, color: 'text-blue-600' };
      case 'in_progress':
        return { label: 'In Corso', icon: AlertCircle, color: 'text-orange-600' };
      case 'completed':
        return { label: 'Completato', icon: CheckCircle, color: 'text-green-600' };
      case 'cancelled':
        return { label: 'Annullato', icon: XCircle, color: 'text-red-600' };
      default:
        return { label: status, icon: Clock, color: 'text-gray-600' };
    }
  };

  const handleCancelJob = async () => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Prenotazione annullata",
        description: "La prenotazione è stata annullata con successo",
      });

      setCancelDialogOpen(false);
      loadJobDetails();
    } catch (error: any) {
      console.error('Error cancelling job:', error);
      toast({
        title: "Errore",
        description: "Impossibile annullare la prenotazione",
        variant: "destructive",
      });
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
          {job.diagnoses ? (
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
                {job.diagnoses.estimated_time_hours && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tempo stimato</span>
                    <span className="font-medium">{job.diagnoses.estimated_time_hours}h</span>
                  </div>
                )}
                {job.diagnoses.estimated_cost_min && job.diagnoses.estimated_cost_max && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Costo stimato</span>
                    <span className="font-medium">
                      €{job.diagnoses.estimated_cost_min} - €{job.diagnoses.estimated_cost_max}
                    </span>
                  </div>
                )}
                {job.diagnoses.ai_analysis && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground">{job.diagnoses.ai_analysis}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  Dettagli diagnosi non disponibili
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quotes Section */}
          {job.quotes && job.quotes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Preventivi Ricevuti</h2>
              {job.quotes.map((quote) => (
                <QuoteRequestCard
                  key={quote.id}
                  quote={quote}
                  onQuoteUpdated={loadJobDetails}
                />
              ))}
            </div>
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
            {(job.status === 'requested' || job.status === 'confirmed' || job.status === 'scheduled') && (
              <Button
                onClick={() => setCancelDialogOpen(true)}
                size="lg"
                variant="destructive"
                className="w-full"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Annulla Prenotazione
              </Button>
            )}

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

        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Annulla prenotazione</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler annullare questa prenotazione? Il tecnico verrà notificato dell'annullamento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Indietro</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelJob} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Annulla Prenotazione
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MobileLayout>
  );
};

export default JobDetails;
