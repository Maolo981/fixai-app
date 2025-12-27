import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Clock, CheckCircle, Calendar, Bell, MessageCircle, X, CalendarDays, TrendingUp, User, Car, Zap, Users, LogOut } from "lucide-react";
import { TechnicianJobRequestCard } from "@/components/TechnicianJobRequestCard";
import { CreateQuoteDialog } from "@/components/CreateQuoteDialog";
import { QuoteCard } from "@/components/QuoteCard";
import { TechnicianCalendar } from "@/components/TechnicianCalendar";
import { TechnicianEarnings } from "@/components/TechnicianEarnings";
import { TechnicianProfile } from "@/components/TechnicianProfile";
import { TechnicianLocationTracker } from "@/components/TechnicianLocationTracker";
import { NavigationButton } from "@/components/NavigationButton";
import { ClientRatingDialog } from "@/components/ClientRatingDialog";
import { ClientRatingsTab } from "@/components/ClientRatingsTab";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  label: string;
}

interface Job {
  id: string;
  user_id: string;
  status: string;
  scheduled_date: string | null;
  final_cost: number | null;
  created_at: string;
  is_urgent?: boolean;
  urgency_surcharge?: number;
  preferred_slots?: TimeSlot[];
  flexible?: boolean;
  estimated_duration?: number;
  user_notes?: string;
  diagnoses: {
    problem_type: string;
    ai_analysis: string;
    urgency_level?: string;
    estimated_cost_min?: number;
    estimated_cost_max?: number;
    estimated_time_hours?: number;
  } | null;
  profiles: {
    full_name: string;
    phone: string;
  } | null;
}

interface Quote {
  id: string;
  job_id: string;
  description: string;
  estimated_hours: number;
  hourly_rate: number;
  total_cost: number;
  parts_cost: number;
  notes: string | null;
  status: string;
  expires_at: string;
  created_at: string;
}

interface Notification {
  id: string;
  technician_id: string;
  job_id: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function TechnicianDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [selectedJobForQuote, setSelectedJobForQuote] = useState<Job | null>(null);
  const [selectedJobForRating, setSelectedJobForRating] = useState<Job | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const defaultTab = searchParams.get('tab') || 'earnings';

  useEffect(() => {
    checkTechnicianAccess();
  }, []);

  useEffect(() => {
    if (technicianId) {
      loadJobs();
      loadQuotes();
      loadNotifications();
      subscribeToUpdates();
    }
  }, [technicianId]);

  const checkTechnicianAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Set localStorage for technician status
    localStorage.setItem('is_technician', 'true');

    const { data: technician } = await supabase
      .from("technicians")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!technician) {
      localStorage.setItem('is_technician', 'false');
      toast({
        title: "Accesso negato",
        description: "Solo i tecnici possono accedere a questa pagina",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setTechnicianId(technician.id);
  };

  const loadJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("jobs")
      .select(`
        *,
        diagnoses (problem_type, ai_analysis, urgency_level, estimated_cost_min, estimated_cost_max, estimated_time_hours)
      `)
      .eq("technician_id", technicianId)
      .order("is_urgent", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile caricare i lavori",
        variant: "destructive",
      });
    } else {
      // Load profiles separately for each job
      const jobsWithProfiles = await Promise.all(
        (data || []).map(async (job) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", job.user_id)
            .single();
          
          return {
            ...job,
            profiles: profileData,
            preferred_slots: (job.preferred_slots as unknown) as TimeSlot[] | undefined,
          } as Job;
        })
      );
      setJobs(jobsWithProfiles as Job[]);
    }
    setLoading(false);
  };

  const loadQuotes = async () => {
    const { data } = await supabase
      .from("quotes")
      .select("*")
      .eq("technician_id", technicianId)
      .order("created_at", { ascending: false });

    setQuotes(data || []);
  };

  const loadNotifications = async () => {
    const { data } = await supabase
      .from("technician_notifications")
      .select("*")
      .eq("technician_id", technicianId)
      .order("created_at", { ascending: false });

    setNotifications(data || []);
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel("technician-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
          filter: `technician_id=eq.${technicianId}`,
        },
        () => loadJobs()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quotes",
          filter: `technician_id=eq.${technicianId}`,
        },
        () => loadQuotes()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "technician_notifications",
          filter: `technician_id=eq.${technicianId}`,
        },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    // Trova il job per ottenere i dettagli
    const job = jobs.find(j => j.id === jobId);
    
    const { error } = await supabase
      .from("jobs")
      .update({ status: newStatus })
      .eq("id", jobId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
        variant: "destructive",
      });
      return;
    }

    // Se il tecnico accetta (confirmed), crea uno slot occupato
    if (newStatus === "confirmed" && job?.scheduled_date && technicianId) {
      const startTime = new Date(job.scheduled_date);
      // Stima durata di 2 ore per default
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 2);

      await supabase
        .from("technician_schedules")
        .insert({
          technician_id: technicianId,
          job_id: jobId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: "booked"
        });
    }

    // Se il lavoro è completato o annullato, aggiorna lo schedule
    if ((newStatus === "completed" || newStatus === "cancelled") && technicianId) {
      await supabase
        .from("technician_schedules")
        .update({ status: newStatus })
        .eq("job_id", jobId);
    }

    toast({
      title: "Successo",
      description: newStatus === "confirmed" 
        ? "Lavoro accettato! Lo slot è stato bloccato nel calendario." 
        : "Stato aggiornato",
    });
    
    // Se completato, mostra il dialog per valutare il cliente
    if (newStatus === "completed" && job) {
      setSelectedJobForRating(job);
    }
    
    loadJobs();
  };

  const markNotificationAsRead = async (notificationId: string) => {
    await supabase
      .from("technician_notifications")
      .update({ read: true })
      .eq("id", notificationId);
    
    loadNotifications();
  };

  const handleStartChat = async (notification: Notification) => {
    if (!notification.job_id) return;

    // Marca come letta
    await markNotificationAsRead(notification.id);

    // Naviga alla pagina del job per avviare la chat
    navigate(`/jobs/${notification.job_id}?startChat=true`);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      requested: { label: "Richiesto", variant: "secondary" },
      confirmed: { label: "Confermato", variant: "default" },
      en_route: { label: "In Viaggio", variant: "default" },
      in_progress: { label: "In Corso", variant: "default" },
      completed: { label: "Completato", variant: "outline" },
      cancelled: { label: "Annullato", variant: "destructive" },
    };
    return statusMap[status] || { label: status, variant: "secondary" };
  };

  const filterJobsByStatus = (status: string | string[]) => {
    if (Array.isArray(status)) {
      return jobs.filter((job) => status.includes(job.status));
    }
    return jobs.filter((job) => job.status === status);
  };

  // Jobs con slot orari da gestire
  const pendingSlotJobs = jobs.filter(
    (job) => (job.status === 'requested' || job.status === 'pending_technician_confirmation') && 
             (job.preferred_slots?.length || job.flexible)
  );

  // Jobs richiesti senza slot (legacy flow)
  const legacyRequestedJobs = jobs.filter(
    (job) => job.status === 'requested' && !job.preferred_slots?.length && !job.flexible
  );

  const unreadNotifications = notifications.filter(n => !n.read);

  if (loading) {
    return (
      <MobileLayout showBottomNav={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showBottomNav={false}>
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard Tecnico</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.removeItem('is_technician');
              navigate('/auth');
            }}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </div>

        {/* Notifiche Non Lette */}
        {unreadNotifications.length > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Nuove Notifiche ({unreadNotifications.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {unreadNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-background rounded-lg p-3 border space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(notification.created_at), "d MMM yyyy, HH:mm", { locale: it })}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {notification.job_id && notification.type === 'booking_request' && (
                    <Button
                      size="sm"
                      onClick={() => handleStartChat(notification)}
                      className="w-full"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Avvia Chat con il Cliente
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{filterJobsByStatus("requested").length}</div>
              <p className="text-sm text-muted-foreground">Nuove Richieste</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{filterJobsByStatus("in_progress").length}</div>
              <p className="text-sm text-muted-foreground">In Corso</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 pb-2">
            <TabsList className="inline-flex w-max min-w-full sm:grid sm:grid-cols-8 sm:w-full gap-1">
              <TabsTrigger value="profile" className="gap-1 px-3 whitespace-nowrap">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profilo</span>
              </TabsTrigger>
              <TabsTrigger value="earnings" className="gap-1 px-3 whitespace-nowrap">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Guadagni</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1 px-3 whitespace-nowrap">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Calendario</span>
              </TabsTrigger>
              <TabsTrigger value="clients" className="gap-1 px-3 whitespace-nowrap">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Clienti</span>
              </TabsTrigger>
              <TabsTrigger value="requested" className="px-3 whitespace-nowrap text-xs sm:text-sm">
                Richieste
              </TabsTrigger>
              <TabsTrigger value="confirmed" className="px-3 whitespace-nowrap text-xs sm:text-sm">
                Confermati
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="px-3 whitespace-nowrap text-xs sm:text-sm">
                In Viaggio/Corso ({filterJobsByStatus("en_route").length + filterJobsByStatus("in_progress").length})
              </TabsTrigger>
              <TabsTrigger value="quotes" className="px-3 whitespace-nowrap text-xs sm:text-sm">
                Preventivi
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile" className="mt-4">
            {technicianId && <TechnicianProfile technicianId={technicianId} />}
          </TabsContent>

          <TabsContent value="earnings" className="mt-4">
            {technicianId && <TechnicianEarnings technicianId={technicianId} />}
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            {technicianId && <TechnicianCalendar technicianId={technicianId} />}
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            {technicianId && <ClientRatingsTab technicianId={technicianId} />}
          </TabsContent>

          <TabsContent value="requested" className="space-y-4">
            {/* Nuove richieste con slot orari */}
            {pendingSlotJobs.map((job) => (
              <TechnicianJobRequestCard
                key={job.id}
                job={job}
                onJobUpdated={loadJobs}
                onStartChat={() => navigate(`/jobs/${job.id}?startChat=true`)}
              />
            ))}

            {/* Legacy requests senza slot */}
            {legacyRequestedJobs.map((job) => (
              <Card key={job.id} className={job.is_urgent ? 'border-red-500 border-2 bg-red-500/5' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{job.diagnoses?.problem_type}</CardTitle>
                        {job.is_urgent && (
                          <Badge variant="destructive" className="bg-red-500 text-white animate-pulse">
                            <Zap className="h-3 w-3 mr-1" />
                            URGENTE
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cliente: {job.profiles?.full_name}
                      </p>
                    </div>
                    <Badge {...getStatusBadge(job.status)}>{getStatusBadge(job.status).label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {job.is_urgent && job.urgency_surcharge && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Intervento urgente - Supplemento €{job.urgency_surcharge}
                      </p>
                    </div>
                  )}
                  <p className="text-sm">{job.diagnoses?.ai_analysis}</p>
                  {job.scheduled_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      {new Date(job.scheduled_date).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/jobs/${job.id}?startChat=true`)}
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateJobStatus(job.id, "confirmed")}
                      className={`flex-1 ${job.is_urgent ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    >
                      Accetta
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedJobForQuote(job)}
                    className="w-full"
                  >
                    Invia Preventivo
                  </Button>
                </CardContent>
              </Card>
            ))}

            {pendingSlotJobs.length === 0 && legacyRequestedJobs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nessuna richiesta</p>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="space-y-4">
            {filterJobsByStatus("confirmed").map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{job.diagnoses?.problem_type}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cliente: {job.profiles?.full_name}
                      </p>
                    </div>
                    <Badge {...getStatusBadge(job.status)}>{getStatusBadge(job.status).label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {job.scheduled_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      {new Date(job.scheduled_date).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/jobs/${job.id}?startChat=true`)}
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                    <NavigationButton
                      userId={job.user_id}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateJobStatus(job.id, "en_route")}
                      className="w-full"
                    >
                      <Car className="h-4 w-4 mr-2" />
                      Sono in Viaggio
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => updateJobStatus(job.id, "in_progress")}
                      className="w-full"
                    >
                      <Wrench className="h-4 w-4 mr-2" />
                      Inizia Lavoro
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filterJobsByStatus("confirmed").length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nessun lavoro confermato</p>
            )}
          </TabsContent>

          <TabsContent value="in_progress" className="space-y-4">
            {/* En Route Jobs */}
            {filterJobsByStatus("en_route").map((job) => (
              <Card key={job.id} className="border-orange-500/30 bg-orange-500/5">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{job.diagnoses?.problem_type}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cliente: {job.profiles?.full_name}
                      </p>
                    </div>
                    <Badge className="bg-orange-500">In Viaggio</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <TechnicianLocationTracker
                    jobId={job.id}
                    technicianId={technicianId || ""}
                    enabled={true}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/jobs/${job.id}?startChat=true`)}
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                    <NavigationButton
                      userId={job.user_id}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => updateJobStatus(job.id, "in_progress")}
                    className="w-full"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Sono Arrivato - Inizia Lavoro
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {/* In Progress Jobs */}
            {filterJobsByStatus("in_progress").map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{job.diagnoses?.problem_type}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cliente: {job.profiles?.full_name}
                      </p>
                    </div>
                    <Badge {...getStatusBadge(job.status)}>{getStatusBadge(job.status).label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/jobs/${job.id}?startChat=true`)}
                      className="flex-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                    <NavigationButton
                      userId={job.user_id}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => updateJobStatus(job.id, "completed")}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completa Lavoro
                  </Button>
                </CardContent>
              </Card>
            ))}
            {filterJobsByStatus("in_progress").length === 0 && filterJobsByStatus("en_route").length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nessun lavoro in corso o in viaggio</p>
            )}
          </TabsContent>

          <TabsContent value="quotes" className="space-y-4">
            {quotes.map((quote) => (
              <QuoteCard key={quote.id} quote={quote} />
            ))}
            {quotes.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nessun preventivo inviato</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateQuoteDialog
        job={selectedJobForQuote}
        technicianId={technicianId}
        open={!!selectedJobForQuote}
        onOpenChange={(open) => !open && setSelectedJobForQuote(null)}
        onQuoteCreated={() => {
          loadQuotes();
          setSelectedJobForQuote(null);
        }}
      />

      <ClientRatingDialog
        open={!!selectedJobForRating}
        onOpenChange={(open) => !open && setSelectedJobForRating(null)}
        jobId={selectedJobForRating?.id || ""}
        clientName={selectedJobForRating?.profiles?.full_name || "Cliente"}
        onRatingSubmitted={() => {
          setSelectedJobForRating(null);
          loadJobs();
        }}
      />
    </MobileLayout>
  );
}
