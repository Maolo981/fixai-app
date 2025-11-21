import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { AlertCircle, Clock, DollarSign, Wrench, ArrowLeft, Users, MapPin, Navigation, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MobileLayout } from "@/components/MobileLayout";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [bookingDialog, setBookingDialog] = useState(false);
  const [bookingData, setBookingData] = useState({
    scheduledDate: "",
    notes: ""
  });
  const [bookingLoading, setBookingLoading] = useState(false);

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

  const handleBookingClick = (technician: Technician) => {
    setSelectedTechnician(technician);
    setBookingDialog(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedTechnician || !diagnosis) return;
    
    setBookingLoading(true);
    
    try {
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

      const { error } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          diagnosis_id: diagnosis.id,
          technician_id: selectedTechnician.id,
          scheduled_date: bookingData.scheduledDate ? new Date(bookingData.scheduledDate).toISOString() : null,
          status: 'pending',
          payment_status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Prenotazione Confermata!",
        description: `Hai prenotato ${selectedTechnician.full_name}. Verrai contattato a breve.`,
      });

      setBookingDialog(false);
      navigate("/dashboard");
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: "Errore",
        description: "Impossibile completare la prenotazione. Riprova.",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
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
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {coordinates 
                ? 'Ordinati per distanza dalla tua posizione'
                : 'Tecnici più votati disponibili'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {technicians.length === 0 ? (
              <Alert>
                <AlertDescription className="text-xs sm:text-sm">
                  {coordinates 
                    ? 'Nessun tecnico trovato nel raggio di 50 km'
                    : 'Nessun tecnico disponibile al momento'
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
        </Card>
      </div>

      {/* Booking Dialog */}
      <Dialog open={bookingDialog} onOpenChange={setBookingDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Conferma Prenotazione</DialogTitle>
            <DialogDescription className="text-sm">
              Stai per prenotare {selectedTechnician?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="scheduled-date" className="text-sm">Data Preferita (opzionale)</Label>
              <Input
                id="scheduled-date"
                type="datetime-local"
                className="h-12 text-base"
                value={bookingData.scheduledDate}
                onChange={(e) => setBookingData({ ...bookingData, scheduledDate: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            
            <div>
              <Label htmlFor="notes" className="text-sm">Note Aggiuntive (opzionale)</Label>
              <Textarea
                id="notes"
                placeholder="Descrivi meglio il problema o specifica orari preferiti..."
                className="min-h-24 text-base"
                value={bookingData.notes}
                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
              />
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tecnico:</span>
                <span className="font-medium">{selectedTechnician?.full_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tariffa:</span>
                <span className="font-medium">€{selectedTechnician?.hourly_rate}/ora</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Costo stimato:</span>
                <span className="font-medium">€{diagnosis?.estimated_cost_min} - €{diagnosis?.estimated_cost_max}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setBookingDialog(false)}
              className="h-12 touch-manipulation"
              disabled={bookingLoading}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleConfirmBooking}
              className="h-12 touch-manipulation"
              disabled={bookingLoading}
            >
              {bookingLoading ? "Prenotazione..." : "Conferma Prenotazione"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </MobileLayout>
  );
};

export default Results;