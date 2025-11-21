import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Camera, LogOut, User, Clock, Briefcase, Calendar, Star, MessageCircle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MobileLayout } from "@/components/MobileLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewDialog } from "@/components/ReviewDialog";
import { ChatDialog } from "@/components/ChatDialog";
import { NotificationSettings } from "@/components/NotificationSettings";
import { useNotifications } from "@/hooks/useNotifications";
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
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      console.error('Error loading jobs:', error);
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Caricamento...</p>
      </div>
    );
  }

  return (
    <MobileLayout>
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
          <Link to="/">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              AI Repair
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

            <TabsContent value="diagnoses">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 px-4 sm:px-0">Le Tue Diagnosi Recenti</h3>
              {diagnoses.length === 0 ? (
                <Card className="text-center py-8 sm:py-12 shadow-soft mx-4 sm:mx-0">
                  <CardContent>
                    <Camera className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm sm:text-base text-muted-foreground mb-4 px-4">
                      Nessuna diagnosi ancora. Inizia caricando la tua prima immagine!
                    </p>
                    <Link to="/diagnose" className="inline-block w-full max-w-xs px-4">
                      <Button className="w-full h-12 sm:h-14 touch-manipulation">Crea Prima Diagnosi</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:gap-6 px-4 sm:px-0 sm:grid-cols-2 lg:grid-cols-3">
                  {diagnoses.map((diagnosis) => (
                    <Card key={diagnosis.id} className="shadow-soft hover:shadow-medium transition-all h-full relative group">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
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
                        <CardHeader className="pb-3">
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
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookings">
              <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 px-4 sm:px-0">Le Tue Prenotazioni</h3>
              {jobs.length === 0 ? (
                <Card className="text-center py-8 sm:py-12 shadow-soft mx-4 sm:mx-0">
                  <CardContent>
                    <Briefcase className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm sm:text-base text-muted-foreground mb-4 px-4">
                      Nessuna prenotazione attiva. Trova un tecnico per iniziare!
                    </p>
                    <Link to="/diagnose" className="inline-block w-full max-w-xs px-4">
                      <Button className="w-full h-12 sm:h-14 touch-manipulation">Inizia Nuova Diagnosi</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:gap-6 px-4 sm:px-0 sm:grid-cols-2 lg:grid-cols-3">
                  {jobs.map((job) => (
                    <Card key={job.id} className="shadow-soft hover:shadow-medium transition-all h-full">
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
                            Lascia una recensione
                          </Button>
                        )}

                        {job.user_rating && (
                          <div className="pt-3 border-t space-y-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= job.user_rating!
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
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

      {selectedJob && (
        <>
          <ReviewDialog
            open={reviewDialogOpen}
            onOpenChange={setReviewDialogOpen}
            jobId={selectedJob.id}
            technicianName={selectedJob.technicians?.full_name || "Tecnico"}
            onReviewSubmitted={loadJobs}
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
    </MobileLayout>
  );
};

export default Dashboard;