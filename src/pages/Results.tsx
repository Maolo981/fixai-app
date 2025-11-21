import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { AlertCircle, Clock, DollarSign, Wrench, ArrowLeft, Users, MapPin, Navigation } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Diagnosis {
  id: string;
  problem_type: string;
  urgency_level: string;
  possible_cause: string;
  estimated_cost_min: number;
  estimated_cost_max: number;
  estimated_time_hours: number;
  recommended_specialty: string;
  ai_analysis: string;
  image_url: string;
}

interface Technician {
  id: string;
  full_name: string;
  specialties: string[];
  hourly_rate: number;
  rating: number;
  total_jobs: number;
  distance_km?: number;
}

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { coordinates, error: locationError, loading: locationLoading, refreshLocation } = useGeolocation();
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDiagnosis();
  }, [id]);

  useEffect(() => {
    if (coordinates) {
      loadNearbyTechnicians();
    }
  }, [coordinates]);

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

  const loadNearbyTechnicians = async () => {
    if (!coordinates) return;

    try {
      const { data, error } = await supabase.rpc('get_nearby_technicians', {
        user_lat: coordinates.latitude,
        user_lon: coordinates.longitude,
        max_distance_km: 50,
        limit_count: 10
      });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error: any) {
      console.error("Error loading nearby technicians:", error);
      // Fallback: load all technicians without distance
      loadAllTechnicians();
    }
  };

  const loadAllTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('verified', true)
        .limit(3);

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error: any) {
      console.error("Error loading technicians:", error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return 'bg-urgency-high';
      case 'medium':
        return 'bg-urgency-medium';
      case 'low':
        return 'bg-urgency-low';
      default:
        return 'bg-muted';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return 'ALTA';
      case 'medium':
        return 'MEDIA';
      case 'low':
        return 'BASSA';
      default:
        return urgency.toUpperCase();
    }
  };

  const formatDistance = (distance: number | undefined) => {
    if (!distance) return null;
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 py-12 px-4">
        <div className="container max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!diagnosis) return null;

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="container max-w-4xl mx-auto space-y-6">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla Dashboard
          </Button>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">{diagnosis.problem_type}</h1>
          <Badge className={`${getUrgencyColor(diagnosis.urgency_level)} text-white`}>
            URGENZA {getUrgencyLabel(diagnosis.urgency_level)}
          </Badge>
        </div>

        {/* Location Alert */}
        {locationError && (
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{locationError}</span>
              <Button variant="outline" size="sm" onClick={refreshLocation}>
                <Navigation className="mr-2 h-4 w-4" />
                Riprova
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {locationLoading && (
          <Alert>
            <MapPin className="h-4 w-4" />
            <AlertDescription>
              Rilevamento posizione in corso...
            </AlertDescription>
          </Alert>
        )}

        {/* Image */}
        <Card className="overflow-hidden shadow-medium">
          <img 
            src={diagnosis.image_url} 
            alt="Problema di riparazione" 
            className="w-full h-64 object-cover"
          />
        </Card>

        {/* Key Details */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <DollarSign className="mr-2 h-4 w-4 text-primary" />
                Costo Stimato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                €{diagnosis.estimated_cost_min} - €{diagnosis.estimated_cost_max}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="mr-2 h-4 w-4 text-primary" />
                Tempo Stimato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {diagnosis.estimated_time_hours} {diagnosis.estimated_time_hours === 1 ? 'ora' : 'ore'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Wrench className="mr-2 h-4 w-4 text-primary" />
                Specializzazione
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{diagnosis.recommended_specialty}</p>
            </CardContent>
          </Card>
        </div>

        {/* Analysis */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-primary" />
              Analisi AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Possibile Causa:</h3>
              <p className="text-muted-foreground">{diagnosis.possible_cause}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Analisi Dettagliata:</h3>
              <p className="text-muted-foreground whitespace-pre-line">{diagnosis.ai_analysis}</p>
            </div>
          </CardContent>
        </Card>

        {/* Matched Technicians */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-secondary" />
              {coordinates ? 'Tecnici Nelle Vicinanze' : 'Tecnici Raccomandati'}
            </CardTitle>
            <CardDescription>
              {coordinates 
                ? 'Tecnici più votati ordinati per distanza dalla tua posizione'
                : 'Tecnici più votati disponibili'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {technicians.length === 0 ? (
              <Alert>
                <AlertDescription>
                  {coordinates 
                    ? 'Nessun tecnico trovato nel raggio di 50 km'
                    : 'Nessun tecnico disponibile al momento'
                  }
                </AlertDescription>
              </Alert>
            ) : (
              technicians.map((tech) => (
                <Card key={tech.id} className="bg-gradient-card border-border">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{tech.full_name}</CardTitle>
                          {tech.distance_km && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {formatDistance(tech.distance_km)}
                            </Badge>
                          )}
                        </div>
                        <CardDescription>
                          {tech.specialties.join(', ')}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">⭐ {tech.rating}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {tech.total_jobs} lavori completati • €{tech.hourly_rate}/ora
                      </div>
                      <Button>Prenota Ora</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Results;