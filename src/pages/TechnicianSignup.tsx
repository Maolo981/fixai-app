import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MobileLayout } from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench, ArrowLeft, MapPin, Euro, Users } from "lucide-react";
import { z } from "zod";

const specialtiesOptions = [
  "Idraulico",
  "Elettricista",
  "Fabbro",
  "Tecnico HVAC",
  "Tecnico Elettrodomestici",
  "Falegname",
  "Imbianchino",
  "Giardiniere",
  "Tecnico Caldaie",
];

const signupSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "Password minimo 6 caratteri"),
  fullName: z.string().min(2, "Nome completo richiesto"),
  hourlyRate: z.number().min(1, "Tariffa oraria richiesta").max(500, "Tariffa massima €500/h"),
  serviceRadius: z.number().min(1, "Raggio minimo 1 km").max(100, "Raggio massimo 100 km"),
  specialties: z.array(z.string()).min(1, "Seleziona almeno una specialità"),
});

export default function TechnicianSignup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [serviceRadius, setServiceRadius] = useState("15");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast({
            title: "Posizione rilevata",
            description: "La tua posizione è stata salvata",
          });
        },
        (error) => {
          toast({
            title: "Errore",
            description: "Impossibile rilevare la posizione. Assicurati di concedere i permessi.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Non supportato",
        description: "Il tuo browser non supporta la geolocalizzazione",
        variant: "destructive",
      });
    }
  };

  const handleToggleSpecialty = (specialty: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty]
    );
  };

  const handleAccountCreation = async () => {
    try {
      setLoading(true);

      // Validate email and password
      const accountValidation = z.object({
        email: z.string().email("Email non valida"),
        password: z.string().min(6, "Password minimo 6 caratteri"),
      });

      const result = accountValidation.safeParse({ email, password });
      if (!result.success) {
        toast({
          title: "Errore validazione",
          description: result.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Account creato",
          description: "Ora completa la tua registrazione come tecnico",
        });
        setStep(2);
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTechnicianRegistration = async () => {
    try {
      setLoading(true);

      // Validate all data
      const validation = signupSchema.safeParse({
        email,
        password,
        fullName,
        hourlyRate: parseFloat(hourlyRate),
        serviceRadius: parseInt(serviceRadius),
        specialties: selectedSpecialties,
      });

      if (!validation.success) {
        toast({
          title: "Errore validazione",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      if (!location) {
        toast({
          title: "Posizione mancante",
          description: "Devi condividere la tua posizione per continuare",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utente non autenticato");

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_technician: true })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Create technician record
      const { error: techError } = await supabase.from("technicians").insert({
        profile_id: user.id,
        full_name: fullName,
        specialties: selectedSpecialties,
        hourly_rate: parseFloat(hourlyRate),
        service_radius_km: parseInt(serviceRadius),
        latitude: location.lat,
        longitude: location.lng,
        verified: false,
        availability_status: "available",
        rating: 0,
        total_jobs: 0,
      });

      if (techError) throw techError;

      toast({
        title: "Registrazione completata!",
        description: "Il tuo account tecnico è stato creato. Verrai verificato a breve.",
      });

      navigate("/technician-dashboard");
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout showBottomNav={false}>
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="container max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wrench className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Registrati come Tecnico</h1>
            <p className="text-muted-foreground">
              {step === 1
                ? "Crea il tuo account per iniziare"
                : "Completa il tuo profilo professionale"}
            </p>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mb-8">
            <div
              className={`h-2 w-24 rounded-full transition-colors ${
                step >= 1 ? "bg-primary" : "bg-muted"
              }`}
            />
            <div
              className={`h-2 w-24 rounded-full transition-colors ${
                step >= 2 ? "bg-primary" : "bg-muted"
              }`}
            />
          </div>

          {step === 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>Dati Account</CardTitle>
                <CardDescription>
                  Crea le tue credenziali di accesso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    placeholder="Mario Rossi"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="mario@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimo 6 caratteri"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleAccountCreation}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Creazione..." : "Continua"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Specialità
                  </CardTitle>
                  <CardDescription>
                    Seleziona le tue competenze professionali
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {specialtiesOptions.map((specialty) => (
                      <div
                        key={specialty}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={specialty}
                          checked={selectedSpecialties.includes(specialty)}
                          onCheckedChange={() => handleToggleSpecialty(specialty)}
                        />
                        <Label
                          htmlFor={specialty}
                          className="text-sm cursor-pointer"
                        >
                          {specialty}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5" />
                    Tariffa e Area
                  </CardTitle>
                  <CardDescription>
                    Imposta la tua tariffa oraria e raggio di servizio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="hourlyRate">Tariffa Oraria (€/h)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      min="1"
                      max="500"
                      placeholder="50"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="serviceRadius">
                      Raggio di Servizio (km)
                    </Label>
                    <Input
                      id="serviceRadius"
                      type="number"
                      min="1"
                      max="100"
                      value={serviceRadius}
                      onChange={(e) => setServiceRadius(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Posizione
                  </CardTitle>
                  <CardDescription>
                    Condividi la tua posizione per ricevere richieste
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {location ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <MapPin className="h-5 w-5" />
                      <span className="font-medium">Posizione salvata</span>
                    </div>
                  ) : (
                    <Button
                      onClick={requestLocation}
                      variant="outline"
                      className="w-full"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Rileva Posizione
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={handleTechnicianRegistration}
                disabled={loading || !location}
                className="w-full"
                size="lg"
              >
                {loading ? "Registrazione..." : "Completa Registrazione"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
