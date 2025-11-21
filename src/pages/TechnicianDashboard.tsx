import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Clock, CheckCircle, Calendar, DollarSign } from "lucide-react";
import { CreateQuoteDialog } from "@/components/CreateQuoteDialog";
import { QuoteCard } from "@/components/QuoteCard";

interface Job {
  id: string;
  user_id: string;
  status: string;
  scheduled_date: string | null;
  final_cost: number | null;
  created_at: string;
  diagnoses: {
    problem_type: string;
    ai_analysis: string;
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

export default function TechnicianDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [selectedJobForQuote, setSelectedJobForQuote] = useState<Job | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkTechnicianAccess();
  }, []);

  useEffect(() => {
    if (technicianId) {
      loadJobs();
      loadQuotes();
      subscribeToUpdates();
    }
  }, [technicianId]);

  const checkTechnicianAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: technician } = await supabase
      .from("technicians")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!technician) {
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
        diagnoses (problem_type, ai_analysis)
      `)
      .eq("technician_id", technicianId)
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
          };
        })
      );
      setJobs(jobsWithProfiles);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
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
    } else {
      toast({
        title: "Successo",
        description: "Stato aggiornato",
      });
      loadJobs();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      requested: { label: "Richiesto", variant: "secondary" },
      confirmed: { label: "Confermato", variant: "default" },
      in_progress: { label: "In Corso", variant: "default" },
      completed: { label: "Completato", variant: "outline" },
      cancelled: { label: "Annullato", variant: "destructive" },
    };
    return statusMap[status] || { label: status, variant: "secondary" };
  };

  const filterJobsByStatus = (status: string) => {
    return jobs.filter((job) => job.status === status);
  };

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard Tecnico</h1>
          <Button variant="outline" onClick={() => navigate("/profile")}>
            Profilo
          </Button>
        </div>

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
        <Tabs defaultValue="requested" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="requested">Richieste</TabsTrigger>
            <TabsTrigger value="confirmed">Confermati</TabsTrigger>
            <TabsTrigger value="in_progress">In Corso</TabsTrigger>
            <TabsTrigger value="quotes">Preventivi</TabsTrigger>
          </TabsList>

          <TabsContent value="requested" className="space-y-4">
            {filterJobsByStatus("requested").map((job) => (
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
                      onClick={() => updateJobStatus(job.id, "confirmed")}
                      className="flex-1"
                    >
                      Accetta
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedJobForQuote(job)}
                      className="flex-1"
                    >
                      Invia Preventivo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filterJobsByStatus("requested").length === 0 && (
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
                  <Button
                    size="sm"
                    onClick={() => updateJobStatus(job.id, "in_progress")}
                    className="w-full"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Inizia Lavoro
                  </Button>
                </CardContent>
              </Card>
            ))}
            {filterJobsByStatus("confirmed").length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nessun lavoro confermato</p>
            )}
          </TabsContent>

          <TabsContent value="in_progress" className="space-y-4">
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
                <CardContent>
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
            {filterJobsByStatus("in_progress").length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nessun lavoro in corso</p>
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
    </MobileLayout>
  );
}
