import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { AlertCircle, Clock, DollarSign, Wrench, ArrowLeft, Users, MapPin, Navigation, Calendar, Map } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MobileLayout } from "@/components/MobileLayout";
import { TechnicianMap } from "@/components/TechnicianMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingDialog } from "@/components/BookingDialog";

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
  latitude?: number;
  longitude?: number;
  avatar_url?: string;
}

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { coordinates, error: locationError, loading: locationLoading, refreshLocation } = useGeolocation();
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);

  useEffect(() => {
    loadDiagnosis();
  }, [id]);

  useEffect(() => {
    // Carica tecnici filtrati per specialità se la diagnosi è disponibile
    if (diagnosis) {
      loadAllTechnicians();
    }
  }, [diagnosis]);

  useEffect(() => {
    if (coordinates && diagnosis) {
      loadNearbyTechnicians();
    }
  }, [coordinates, diagnosis]);

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
    if (!coordinates || !diagnosis) return;

    try {
      // First try with 100km radius
      let { data, error } = await supabase.rpc('get_nearby_technicians', {
        user_lat: coordinates.latitude,
        user_lon: coordinates.longitude,
        max_distance_km: 100,
        limit_count: 50
      });

      if (error) throw error;
      
      // If no technicians found within 100km, try 300km
      if (!data || data.length === 0) {
        console.log("No technicians within 100km, expanding search to 300km");
        const result = await supabase.rpc('get_nearby_technicians', {
          user_lat: coordinates.latitude,
          user_lon: coordinates.longitude,
          max_distance_km: 300,
          limit_count: 50
        });
        
        if (result.error) throw result.error;
        data = result.data;
      }
      
      // Separa tecnici con specialità corrispondente e altri
      const recommendedSpecialty = diagnosis.recommended_specialty.toLowerCase();
      const matchingTechnicians: typeof data = [];
      const otherTechnicians: typeof data = [];
      
      data?.forEach(tech => {
        const hasMatchingSpecialty = tech.specialties.some(specialty => 
          specialty.toLowerCase().includes(recommendedSpecialty) ||
          recommendedSpecialty.includes(specialty.toLowerCase())
        );
        
        if (hasMatchingSpecialty) {
          matchingTechnicians.push(tech);
        } else {
          otherTechnicians.push(tech);
        }
      });
      
      // Mostra prima quelli con specialità corretta, poi gli altri
      const allTechnicians = [...matchingTechnicians, ...otherTechnicians];
      setTechnicians(allTechnicians.slice(0, 10));
      
      // If still no results at all, fallback to all technicians
      if (allTechnicians.length === 0) {
        console.log("No technicians found nearby, loading all technicians");
        loadTechniciansBySpecialty();
      }
    } catch (error: any) {
      console.error("Error loading nearby technicians:", error);
      loadTechniciansBySpecialty();
    }
  };

  const loadTechniciansBySpecialty = async () => {
    if (!diagnosis) return;
    
    try {
      const recommendedSpecialty = diagnosis.recommended_specialty.toLowerCase();
      
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('verified', true);

      if (error) throw error;
      
      // Filtra per specialità corrispondente
      const matchingTechnicians = data?.filter(tech => 
        tech.specialties.some(specialty => 
          specialty.toLowerCase().includes(recommendedSpecialty) ||
          recommendedSpecialty.includes(specialty.toLowerCase())
        )
      ) || [];
      
      // Ordina per rating e numero di lavori
      const sortedTechnicians = matchingTechnicians.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.total_jobs - a.total_jobs;
      });
      
      setTechnicians(sortedTechnicians.slice(0, 10));
    } catch (error: any) {
      console.error("Error loading technicians by specialty:", error);
    }
  };

  const loadAllTechnicians = async () => {
    // Carica tecnici filtrati per specialità invece di tutti
    loadTechniciansBySpecialty();
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

  const handleBookingClick = async (technician: Technician) => {
    if (!diagnosis) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per prenotare",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Apri il dialog per selezionare data e ora
    setSelectedTechnician(technician);
    setBookingDialogOpen(true);
  };

  const handleBookingConfirm = async (appointmentDate: Date, time: string) => {
    if (!diagnosis || !selectedTechnician) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Crea il job con la data selezionata e status 'requested'
      const { data: newJob, error } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          diagnosis_id: diagnosis.id,
          technician_id: selectedTechnician.id,
          status: 'requested',
          scheduled_date: appointmentDate.toISOString(),
          payment_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Richiesta Inviata!",
        description: `Richiesta inviata a ${selectedTechnician.full_name} per il ${appointmentDate.toLocaleDateString('it-IT')} alle ${time}`,
      });

      // Simula l'accettazione del tecnico dopo 5 secondi
      setTimeout(async () => {
        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            status: 'confirmed',
          })
          .eq('id', newJob.id);

        if (updateError) {
          console.error("Errore nell'aggiornamento del job:", updateError);
        }
      }, 5000);

      // Naviga alla pagina JobDetails
      navigate(`/jobs/${newJob.id}?new=true`);
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: "Errore",
        description: "Impossibile completare la prenotazione. Riprova.",
        variant: "destructive",
      });
    }
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
    <MobileLayout>
    <div className="min-h-screen bg-muted/30 py-6 sm:py-12 px-4">
      <div className="container max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="h-10 sm:h-11 touch-manipulation">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="text-sm sm:text-base">Dashboard</span>
          </Button>
        </Link>

        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 px-2">{diagnosis.problem_type}</h1>
          <Badge className={`${getUrgencyColor(diagnosis.urgency_level)} text-white text-sm sm:text-base px-3 py-1`}>
            URGENZA {getUrgencyLabel(diagnosis.urgency_level)}
          </Badge>
        </div>

        {/* Location Alert */}
        {locationError && (
          <Alert className="text-sm">
            <MapPin className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm line-clamp-2">{locationError}</span>
              <Button variant="outline" size="sm" onClick={refreshLocation} className="shrink-0 h-8 touch-manipulation">
                <Navigation className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Riprova</span>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {locationLoading && (
          <Alert className="text-sm">
            <MapPin className="h-4 w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              Rilevamento posizione in corso...
            </AlertDescription>
          </Alert>
        )}

        {/* Image */}
        <Card className="overflow-hidden shadow-medium">
          <img 
            src={diagnosis.image_url} 
            alt="Problema di riparazione" 
            className="w-full h-48 sm:h-64 md:h-80 object-cover"
          />
        </Card>

        {/* Key Details */}
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center">
                <DollarSign className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Costo Stimato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-bold">
                €{diagnosis.estimated_cost_min} - €{diagnosis.estimated_cost_max}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center">
                <Clock className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Tempo Stimato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-bold">
                {diagnosis.estimated_time_hours} {diagnosis.estimated_time_hours === 1 ? 'ora' : 'ore'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center">
                <Wrench className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Specializzazione
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-bold">{diagnosis.recommended_specialty}</p>
            </CardContent>
          </Card>
        </div>

        {/* Analysis */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center text-base sm:text-lg">
              <AlertCircle className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Analisi AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Possibile Causa:</h3>
              <p className="text-sm sm:text-base text-muted-foreground">{diagnosis.possible_cause}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Analisi Dettagliata:</h3>
              <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-line">{diagnosis.ai_analysis}</p>
            </div>
          </CardContent>
        </Card>

        {/* Matched Technicians */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Users className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
              {coordinates ? 'Tecnici Nelle Vicinanze' : 'Tecnici Raccomandati'}
              {technicians.length > 0 && technicians[0]?.distance_km && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (fino a {Math.round(technicians[technicians.length - 1].distance_km)} km)
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {coordinates 
                ? 'Ordinati per distanza dalla tua posizione'
                : 'Tecnici più votati disponibili'
              }
            </CardDescription>
          </CardHeader>
          
          {coordinates && technicians.length > 0 && technicians.some(t => t.latitude && t.longitude) ? (
            <Tabs defaultValue="list" className="w-full">
              <div className="px-6 pb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="list" className="text-sm sm:text-base">
                    <Users className="mr-2 h-4 w-4" />
                    Lista
                  </TabsTrigger>
                  <TabsTrigger value="map" className="text-sm sm:text-base">
                    <Map className="mr-2 h-4 w-4" />
                    Mappa
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="list" className="mt-0">
                <CardContent className="space-y-3 sm:space-y-4">
                  {technicians.map((tech) => (
                    <Card key={tech.id} className="bg-gradient-card border-border touch-manipulation active:scale-[0.98] transition-transform">
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="shrink-0">
                            {tech.avatar_url ? (
                              <img 
                                src={tech.avatar_url} 
                                alt={tech.full_name}
                                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover border-2 border-border"
                              />
                            ) : (
                              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                                <Users className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                              </div>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                              <CardTitle className="text-base sm:text-lg truncate">{tech.full_name}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="shrink-0 text-sm">⭐ {tech.rating}</Badge>
                                {tech.distance_km && (
                                  <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                    <MapPin className="h-3 w-3" />
                                    <span className="text-xs">{formatDistance(tech.distance_km)}</span>
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <CardDescription className="text-xs sm:text-sm line-clamp-1 mb-2">
                              {tech.specialties.join(', ')}
                            </CardDescription>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              {tech.total_jobs} lavori completati • €{tech.hourly_rate}/ora
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          className="w-full h-11 sm:h-10 touch-manipulation active:scale-95 transition-transform"
                          onClick={() => handleBookingClick(tech)}
                        >
                          Prenota Ora
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </TabsContent>

              <TabsContent value="map" className="mt-0">
                <CardContent>
                  <TechnicianMap
                    userLocation={{
                      latitude: coordinates.latitude,
                      longitude: coordinates.longitude,
                    }}
                    technicians={technicians.filter((t): t is Technician & { latitude: number; longitude: number } => 
                      t.latitude !== undefined && t.longitude !== undefined
                    )}
                    onTechnicianSelect={(tech) => handleBookingClick(tech as Technician)}
                  />
                </CardContent>
              </TabsContent>
            </Tabs>
          ) : (
            <CardContent className="space-y-3 sm:space-y-4">
              {technicians.length === 0 ? (
                <Alert>
                  <AlertDescription className="text-xs sm:text-sm">
                    {coordinates 
                      ? 'Nessun tecnico trovato vicino alla tua posizione'
                      : 'Nessun tecnico disponibile al momento nella tua zona'
                    }
                  </AlertDescription>
                </Alert>
              ) : (
                technicians.map((tech) => (
                  <Card key={tech.id} className="bg-gradient-card border-border touch-manipulation active:scale-[0.98] transition-transform">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                            <CardTitle className="text-base sm:text-lg truncate">{tech.full_name}</CardTitle>
                            {tech.distance_km && (
                              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                <MapPin className="h-3 w-3" />
                                <span className="text-xs">{formatDistance(tech.distance_km)}</span>
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="text-xs sm:text-sm line-clamp-1">
                            {tech.specialties.join(', ')}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-sm">⭐ {tech.rating}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {tech.total_jobs} lavori • €{tech.hourly_rate}/ora
                        </div>
                        <Button 
                          className="w-full sm:w-auto h-11 sm:h-10 touch-manipulation active:scale-95 transition-transform"
                          onClick={() => handleBookingClick(tech)}
                        >
                          Prenota Ora
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>

    {/* Booking Dialog */}
    {selectedTechnician && (
      <BookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        technicianName={selectedTechnician.full_name}
        onConfirm={handleBookingConfirm}
      />
    )}
    </MobileLayout>
  );
};

export default Results;