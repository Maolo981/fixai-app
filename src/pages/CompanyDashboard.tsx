import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  MessageCircle, 
  Star, 
  Briefcase,
  Plus,
  LogOut,
  Loader2,
  Mail,
  Phone,
  UserPlus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  vat_number: string | null;
}

interface TeamMember {
  id: string;
  technician_id: string;
  role: string;
  joined_at: string;
  technician: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    rating: number;
    total_jobs: number;
    specialties: string[];
  };
}

interface TeamJob {
  id: string;
  status: string;
  scheduled_date: string | null;
  final_cost: number | null;
  technician_id: string;
  created_at: string;
  diagnoses: {
    problem_type: string;
  } | null;
  profiles: {
    full_name: string;
  } | null;
}

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [jobs, setJobs] = useState<TeamJob[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user owns a company
    const { data: companyData, error } = await supabase
      .from("companies")
      .select("*")
      .eq("owner_id", session.user.id)
      .single();

    if (error || !companyData) {
      navigate("/dashboard");
      return;
    }

    setCompany(companyData);
    await loadTeamMembers(companyData.id);
    await loadTeamJobs(companyData.id);
    setLoading(false);
  };

  const loadTeamMembers = async (companyId: string) => {
    const { data } = await supabase
      .from("company_members")
      .select(`
        id,
        technician_id,
        role,
        joined_at,
        technicians (
          id,
          full_name,
          avatar_url,
          rating,
          total_jobs,
          specialties
        )
      `)
      .eq("company_id", companyId);

    if (data) {
      setMembers(data.map((m: any) => ({
        ...m,
        technician: m.technicians
      })));
    }
  };

  const loadTeamJobs = async (companyId: string) => {
    // Get all technician IDs in the company
    const { data: memberData } = await supabase
      .from("company_members")
      .select("technician_id")
      .eq("company_id", companyId);

    if (!memberData || memberData.length === 0) return;

    const techIds = memberData.map(m => m.technician_id);

    const { data: jobsData } = await supabase
      .from("jobs")
      .select(`
        id,
        status,
        scheduled_date,
        final_cost,
        technician_id,
        created_at,
        diagnoses (problem_type),
        profiles!jobs_user_id_fkey (full_name)
      `)
      .in("technician_id", techIds)
      .order("created_at", { ascending: false })
      .limit(50);

    if (jobsData) {
      setJobs(jobsData as unknown as TeamJob[]);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !company) return;

    setInviting(true);
    try {
      // Find technician by profile email
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail)
        .single();

      if (!profile) {
        toast({
          title: "Utente non trovato",
          description: "Nessun account trovato con questa email",
          variant: "destructive",
        });
        setInviting(false);
        return;
      }

      const { data: technician } = await supabase
        .from("technicians")
        .select("id")
        .eq("profile_id", profile.id)
        .single();

      if (!technician) {
        toast({
          title: "Non è un tecnico",
          description: "L'utente deve essere registrato come tecnico",
          variant: "destructive",
        });
        setInviting(false);
        return;
      }

      // Add to company
      const { error } = await supabase
        .from("company_members")
        .insert({
          company_id: company.id,
          technician_id: technician.id,
          role: "member",
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Già membro",
            description: "Questo tecnico è già nel team",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        // Update technician's company_id
        await supabase
          .from("technicians")
          .update({ company_id: company.id })
          .eq("id", technician.id);

        toast({
          title: "Membro aggiunto!",
          description: "Il tecnico è stato aggiunto al team",
        });
        setInviteDialogOpen(false);
        setInviteEmail("");
        loadTeamMembers(company.id);
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getTeamStats = () => {
    const completedJobs = jobs.filter(j => j.status === "completed").length;
    const totalRevenue = jobs
      .filter(j => j.status === "completed" && j.final_cost)
      .reduce((sum, j) => sum + (j.final_cost || 0), 0);
    const avgRating = members.length > 0
      ? members.reduce((sum, m) => sum + (m.technician?.rating || 0), 0) / members.length
      : 0;

    return { completedJobs, totalRevenue, avgRating };
  };

  if (loading) {
    return (
      <MobileLayout showBottomNav={false}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  const stats = getTeamStats();

  return (
    <MobileLayout showBottomNav={false}>
      <div className="min-h-screen bg-muted/30 pb-6">
        {/* Header */}
        <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold">{company?.name}</h1>
                <p className="text-sm text-white/80">Dashboard Aziendale</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-white/20">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Users className="h-5 w-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-xs text-white/80">Tecnici</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Briefcase className="h-5 w-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.completedJobs}</p>
              <p className="text-xs text-white/80">Lavori</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1" />
              <p className="text-2xl font-bold">€{stats.totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-white/80">Totale</p>
            </div>
          </div>
        </header>

        <div className="px-4 -mt-4">
          <Tabs defaultValue="team" className="w-full">
            <TabsList className="w-full bg-card shadow-soft">
              <TabsTrigger value="team" className="flex-1">
                <Users className="h-4 w-4 mr-1" />
                Team
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="jobs" className="flex-1">
                <Briefcase className="h-4 w-4 mr-1" />
                Lavori
              </TabsTrigger>
            </TabsList>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-4 mt-4">
              <Button 
                onClick={() => setInviteDialogOpen(true)}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Aggiungi Tecnico al Team
              </Button>

              {members.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Nessun tecnico nel team</p>
                    <p className="text-sm text-muted-foreground">Invita i tecnici a unirsi alla tua azienda</p>
                  </CardContent>
                </Card>
              ) : (
                members.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          {member.technician?.avatar_url ? (
                            <img 
                              src={member.technician.avatar_url} 
                              alt={member.technician.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <Users className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{member.technician?.full_name}</h3>
                            <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                              {member.role === "owner" ? "Proprietario" : member.role === "manager" ? "Manager" : "Membro"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              {member.technician?.rating?.toFixed(1) || "0.0"}
                            </span>
                            <span>{member.technician?.total_jobs || 0} lavori</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {member.technician?.specialties?.slice(0, 3).map((s, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Individuali</CardTitle>
                  <CardDescription>Statistiche per ogni tecnico del team</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {members.map((member) => {
                    const memberJobs = jobs.filter(j => j.technician_id === member.technician_id);
                    const completed = memberJobs.filter(j => j.status === "completed").length;
                    const revenue = memberJobs
                      .filter(j => j.status === "completed" && j.final_cost)
                      .reduce((sum, j) => sum + (j.final_cost || 0), 0);

                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">
                              {member.technician?.full_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{member.technician?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {completed} lavori completati
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">€{revenue.toFixed(0)}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 text-yellow-500" />
                            {member.technician?.rating?.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Jobs Tab */}
            <TabsContent value="jobs" className="space-y-4 mt-4">
              {jobs.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Nessun lavoro</p>
                  </CardContent>
                </Card>
              ) : (
                jobs.slice(0, 20).map((job) => {
                  const assignedMember = members.find(m => m.technician_id === job.technician_id);
                  return (
                    <Card key={job.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{job.diagnoses?.problem_type || "Lavoro"}</h3>
                            <p className="text-sm text-muted-foreground">
                              Cliente: {job.profiles?.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Assegnato a: {assignedMember?.technician?.full_name || "N/A"}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              job.status === "completed" ? "default" :
                              job.status === "in_progress" ? "secondary" : "outline"
                            }>
                              {job.status === "completed" ? "Completato" :
                               job.status === "in_progress" ? "In Corso" :
                               job.status === "confirmed" ? "Confermato" : job.status}
                            </Badge>
                            {job.final_cost && (
                              <p className="text-sm font-bold text-primary mt-1">
                                €{job.final_cost.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Invite Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Tecnico</DialogTitle>
              <DialogDescription>
                Inserisci l'email del tecnico che vuoi aggiungere al team. 
                Il tecnico deve essere già registrato sulla piattaforma.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email del Tecnico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tecnico@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleInviteMember} disabled={inviting || !inviteEmail}>
                {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Aggiungi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

export default CompanyDashboard;
