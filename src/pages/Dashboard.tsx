import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Camera, LogOut, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Diagnosis {
  id: string;
  problem_type: string;
  urgency_level: string;
  created_at: string;
  estimated_cost_min: number;
  estimated_cost_max: number;
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    loadDiagnoses();
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Disconnesso",
      description: "Sei stato disconnesso con successo",
    });
    navigate("/");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/">
            <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              AI Repair Finder
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Bentornato!</h2>
            <p className="text-xl text-muted-foreground mb-6">
              Pronto a diagnosticare un nuovo problema di riparazione?
            </p>
            <Link to="/diagnose">
              <Button size="lg" className="shadow-medium">
                <Camera className="mr-2 h-5 w-5" />
                Inizia Nuova Diagnosi
              </Button>
            </Link>
          </div>

          {/* Recent Diagnoses */}
          <div>
            <h3 className="text-2xl font-bold mb-6">Le Tue Diagnosi Recenti</h3>
            {diagnoses.length === 0 ? (
              <Card className="text-center py-12 shadow-soft">
                <CardContent>
                  <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Nessuna diagnosi ancora. Inizia caricando la tua prima immagine di riparazione!
                  </p>
                  <Link to="/diagnose">
                    <Button>Crea Prima Diagnosi</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {diagnoses.map((diagnosis) => (
                  <Link key={diagnosis.id} to={`/results/${diagnosis.id}`}>
                    <Card className="shadow-soft hover:shadow-medium transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{diagnosis.problem_type}</CardTitle>
                          <Badge 
                            variant={
                              diagnosis.urgency_level === 'high' 
                                ? 'destructive' 
                                : diagnosis.urgency_level === 'medium'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {getUrgencyLabel(diagnosis.urgency_level)}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(diagnosis.created_at).toLocaleDateString('it-IT')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Costo stimato: €{diagnosis.estimated_cost_min} - €{diagnosis.estimated_cost_max}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;