import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Camera, LogOut, User, Clock, Briefcase, Calendar, Star, MessageCircle, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MobileLayout } from "@/components/MobileLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { QuickFeedbackDialog } from "@/components/QuickFeedbackDialog";
import { ChatDialog } from "@/components/ChatDialog";
import { NotificationSettings } from "@/components/NotificationSettings";
import { useNotifications } from "@/hooks/useNotifications";
import { OnboardingTour } from "@/components/OnboardingTour";
import { EmptyState } from "@/components/EmptyState";
import { PullToRefresh } from "@/components/PullToRefresh";
import { SwipeableCard } from "@/components/SwipeableCard";
import { Skeleton } from "@/components/ui/skeleton";
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

interface Diagnosis {
  id: string;
  problem_type: string;
  urgency_level: string;
  created_at: string;
  estimated_cost_min: number;
  estimated_cost_max: number;
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
  };
  technicians?: {
    full_name: string;
    hourly_rate: number;
  };
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [diagnosisToDelete, setDiagnosisToDelete] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [jobToCancel, setJobToCancel] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  // Initialize notifications
  useNotifications(user?.id);

  useEffect(() => {
    checkUser();
    loadDiagnoses();
    loadJobs();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }
    
    // Check if user is a technician
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_technician")
      .eq("id", session.user.id)
      .single();

    const isTechnician = profile?.is_technician || false;
    localStorage.setItem('is_technician', String(isTechnician));

    if (isTechnician) {
      // Redirect technicians to their dashboard
      navigate("/technician-dashboard");
      return;
    }
    
    setUser(session.user);
    setLoading(false);
  };

  const loadDiagnoses = async () => {
    try {
      const { data, error } = await supabase
        .from('diagnoses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDiagnoses(data || []);
    } catch (error: any) {
      console.error('Error loading diagnoses:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          diagnoses (problem_type, urgency_level, estimated_time_hours),
          technicians (full_name, hourly_rate)
        `)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      console.error('Error loading jobs:', error);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadDiagnoses(), loadJobs()]);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Disconnesso",
      description: "Sei stato disconnesso con successo",
    });
    navigate("/");
  };

  const handleDeleteDiagnosis = async () => {
    if (!diagnosisToDelete) return;

    try {
      const { error } = await supabase
        .from('diagnoses')
        .delete()
        .eq('id', diagnosisToDelete);

      if (error) throw error;

      toast({
        title: "Diagnosi eliminata",
        description: "La diagnosi è stata eliminata con successo",
      });

      loadDiagnoses();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare la diagnosi",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDiagnosisToDelete(null);
    }
  };

  const handleCancelJob = async () => {
    if (!jobToCancel) return;

    // Validazione del motivo
    if (!cancellationReason.trim()) {
      toast({
        title: "Motivo richiesto",
        description: "Inserisci il motivo dell'annullamento",
        variant: "destructive",
      });
      return;
    }

    if (cancellationReason.trim().length < 10) {
      toast({
        title: "Motivo troppo breve",
        description: "Il motivo deve essere di almeno 10 caratteri",
        variant: "destructive",
      });
      return;
    }

    if (cancellationReason.length > 500) {
      toast({
        title: "Motivo troppo lungo",
        description: "Il motivo non può superare 500 caratteri",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'cancelled',
          cancellation_reason: cancellationReason.trim()
        })
        .eq('id', jobToCancel);

      if (error) throw error;

      toast({
        title: "Prenotazione annullata",
        description: "La prenotazione è stata annullata con successo",
      });

      loadJobs();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile annullare la prenotazione",
        variant: "destructive",
      });
    } finally {
      setCancelDialogOpen(false);
      setJobToCancel(null);
      setCancellationReason("");
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return 'alta';
      case 'medium':
        return 'media';
      case 'low':
        return 'bassa';
      default:
        return urgency;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'In Attesa';
      case 'confirmed':
        return 'Confermato';
      case 'in_progress':
        return 'In Corso';
      case 'completed':
        return 'Completato';
      case 'cancelled':
        return 'Annullato';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'confirmed':
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen bg-muted/30 px-4 py-6">
          <div className="container mx-auto max-w-6xl space-y-6">
            <div className="flex justify-between items-center mb-6">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
            <div className="text-center space-y-4 mb-8">
              <Skeleton className="h-10 w-48 mx-auto" />
              <Skeleton className="h-6 w-96 mx-auto" />
              <Skeleton className="h-14 w-full max-w-md mx-auto" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="shadow-soft">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <OnboardingTour />
      <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
          <Link to="/">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              FIXO
            </h1>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="h-9 sm:h-10 touch-manipulation">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Esci</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 sm:py-12">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Bentornato!</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 sm:mb-6 px-4">
              Pronto a diagnosticare un nuovo problema?
            </p>
            <Link to="/diagnose" className="inline-block w-full max-w-md px-4">
              <Button size="lg" className="w-full h-14 sm:h-16 shadow-medium touch-manipulation active:scale-95 transition-transform">
                <Camera className="mr-2 h-6 w-6 sm:h-7 sm:w-7" />
                <span className="text-base sm:text-lg">Inizia Nuova Diagnosi</span>
              </Button>
            </Link>
          </div>

          {/* Tabs for Diagnoses and Jobs */}
          <Tabs defaultValue="diagnoses" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-12 sm:h-14 mx-4 sm:mx-0">
              <TabsTrigger value="diagnoses" className="text-xs sm:text-base">
                <Camera className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Diagnosi</span>
                <span className="sm:hidden">Diagnosi</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="text-xs sm:text-base">
                <Briefcase className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Prenotazioni</span>
                <span className="sm:hidden">Lavori</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-base">
                <User className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Impostazioni</span>
                <span className="sm:hidden">Altro</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="diagnoses" id="diagnose-tab">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 px-4 sm:px-0">Le Tue Diagnosi Recenti</h3>
              {diagnoses.length === 0 ? (
                <EmptyState
                  icon={Camera}
                  title="Nessuna diagnosi ancora"
                  description="Inizia caricando la tua prima immagine e scopri cosa l'AI può fare per te! 🚀"
                  actionLabel="Crea Prima Diagnosi"
                  onAction={() => navigate("/diagnose")}
                  illustration="📸"
                />
              ) : (
                <div className="grid gap-4 sm:gap-6 px-4 sm:px-0 sm:grid-cols-2 lg:grid-cols-3">
                  {diagnoses.map((diagnosis) => (
                    <SwipeableCard
                      key={diagnosis.id}
                      onDelete={() => {
                        setDiagnosisToDelete(diagnosis.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Card className="shadow-soft hover:shadow-medium transition-all h-full relative group">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDiagnosisToDelete(diagnosis.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link to={`/results/${diagnosis.id}`} className="block">
                          <CardHeader className="pb-3 pr-10">
                            <div className="flex justify-between items-start gap-2">
                              <CardTitle className="text-base sm:text-lg line-clamp-2">{diagnosis.problem_type}</CardTitle>
                              <Badge 
                                variant={
                                  diagnosis.urgency_level === 'high' 
                                    ? 'destructive' 
                                    : diagnosis.urgency_level === 'medium'
                                    ? 'default'
                                    : 'secondary'
                                }
                                className="shrink-0"
                              >
                                {getUrgencyLabel(diagnosis.urgency_level)}
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center gap-1 text-xs sm:text-sm">
                              <Clock className="h-3 w-3" />
                              {new Date(diagnosis.created_at).toLocaleDateString('it-IT')}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Costo stimato: €{diagnosis.estimated_cost_min} - €{diagnosis.estimated_cost_max}
                            </p>
                          </CardContent>
                        </Link>
                      </Card>
                    </SwipeableCard>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookings" id="bookings-tab">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 px-4 sm:px-0">Le Tue Prenotazioni</h3>
              {jobs.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="Nessuna prenotazione attiva"
                  description="Trova un tecnico qualificato e prenota il tuo primo intervento! 🔧"
                  actionLabel="Inizia Nuova Diagnosi"
                  onAction={() => navigate("/diagnose")}
                  illustration="📋"
                />
              ) : (
                <div className="grid gap-4 sm:gap-6 px-4 sm:px-0 sm:grid-cols-2 lg:grid-cols-3">
                  {jobs.map((job) => (
                    <Card key={job.id} className="shadow-soft hover:shadow-medium transition-all h-full">
                      <Link 
                        to={job.technician_id ? `/jobs/${job.id}` : `/results/${job.diagnosis_id}`} 
                        className="block"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start gap-2">
                            <CardTitle className="text-base sm:text-lg line-clamp-2">
                              {job.diagnoses?.problem_type || 'Riparazione'}
                            </CardTitle>
                            <Badge variant={getStatusVariant(job.status)} className="shrink-0">
                              {getStatusLabel(job.status)}
                            </Badge>
                          </div>
                        <CardDescription className="text-xs sm:text-sm space-y-1">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {job.technicians?.full_name || 'Tecnico non assegnato'}
                          </div>
                          {job.scheduled_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(job.scheduled_date).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                          {job.diagnoses?.estimated_time_hours && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Durata stimata: {job.diagnoses.estimated_time_hours}h
                            </div>
                          )}
                        </CardDescription>
                      </CardHeader>
                      </Link>
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">
                            {job.final_cost 
                              ? `€${job.final_cost}` 
                              : job.technicians && `€${job.technicians.hourly_rate}/ora`}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {job.payment_status === 'pending' ? 'Da pagare' : 
                             job.payment_status === 'paid' ? 'Pagato' : job.payment_status}
                          </Badge>
                        </div>

                        {(job.status === 'scheduled' || job.status === 'in_progress') && job.technician_id && (
                          <Button
                            onClick={() => {
                              setSelectedJob(job);
                              setChatDialogOpen(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full touch-manipulation"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Apri Chat
                          </Button>
                        )}

                        {(job.status === 'requested' || job.status === 'confirmed' || job.status === 'scheduled') && (
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setJobToCancel(job.id);
                              setCancelDialogOpen(true);
                            }}
                            size="sm"
                            variant="destructive"
                            className="w-full touch-manipulation"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Annulla Prenotazione
                          </Button>
                        )}

                        {job.status === 'completed' && !job.user_rating && (
                          <Button
                            onClick={() => {
                              setSelectedJob(job);
                              setReviewDialogOpen(true);
                            }}
                            size="sm"
                            className="w-full touch-manipulation"
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Com'è andato?
                          </Button>
                        )}

                        {job.user_rating && (
                          <div className="pt-3 border-t space-y-2">
                            <div className="flex items-center gap-2">
                              {job.user_rating >= 3 ? (
                                <span className="text-green-500 font-medium flex items-center gap-1">
                                  👍 Soddisfatto
                                </span>
                              ) : (
                                <span className="text-red-500 font-medium flex items-center gap-1">
                                  👎 Non soddisfatto
                                </span>
                              )}
                            </div>
                            {job.user_review && (
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">
                                {job.user_review}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings">
              <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
                <h3 className="text-xl sm:text-2xl font-bold">Impostazioni</h3>
                <NotificationSettings userId={user?.id} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina diagnosi</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa diagnosi? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDiagnosis} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) setCancellationReason("");
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Annulla prenotazione</AlertDialogTitle>
            <AlertDialogDescription>
              Per favore, spiega il motivo dell'annullamento. Il tecnico riceverà questa informazione.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2 py-4">
            <Label htmlFor="cancellation-reason">
              Motivo dell'annullamento <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder="Es: Ho trovato un'altra soluzione, cambio di programma, ecc..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {cancellationReason.length}/500 caratteri (minimo 10)
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Indietro</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelJob} 
              disabled={cancellationReason.trim().length < 10}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Conferma Annullamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedJob && (
        <>
          <QuickFeedbackDialog
            open={reviewDialogOpen}
            onOpenChange={setReviewDialogOpen}
            jobId={selectedJob.id}
            technicianName={selectedJob.technicians?.full_name || "Tecnico"}
            onFeedbackSubmitted={loadJobs}
          />
          <ChatDialog
            open={chatDialogOpen}
            onOpenChange={setChatDialogOpen}
            jobId={selectedJob.id}
            technicianName={selectedJob.technicians?.full_name || "Tecnico"}
          />
        </>
      )}
    </div>
      </PullToRefresh>
    </MobileLayout>
  );
};

export default Dashboard;