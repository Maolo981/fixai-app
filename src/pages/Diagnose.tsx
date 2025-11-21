import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Camera, MapPin, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { MobileLayout } from "@/components/MobileLayout";

const Diagnose = () => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { coordinates, error: locationError, loading: locationLoading, refreshLocation } = useGeolocation();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast({
          title: "Autenticazione Richiesta",
          description: "Accedi per utilizzare la funzione di diagnosi",
        });
        navigate("/auth");
      }
    });
  }, [navigate, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Troppo Grande",
          description: "Seleziona un'immagine inferiore a 10MB",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!imageFile) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Upload image to storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('repair-images')
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('repair-images')
        .getPublicUrl(fileName);

      setUploading(false);
      setAnalyzing(true);

      // Call AI analysis function
      const { data: diagnosis, error: analysisError } = await supabase.functions.invoke('analyze-repair', {
        body: { imageUrl: publicUrl }
      });

      if (analysisError) {
        throw analysisError;
      }

      toast({
        title: "Analisi Completata",
        description: "La tua riparazione è stata diagnosticata con successo",
      });

      navigate(`/results/${diagnosis.id}`);

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile analizzare l'immagine. Riprova.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <MobileLayout>
    <div className="min-h-screen bg-muted/30 py-6 sm:py-12 px-4">
      <div className="container max-w-3xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Diagnosi Riparazione AI
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4">
            Carica una foto per un'analisi AI istantanea
          </p>
        </div>

        {/* Location Status */}
        <div className="mb-4 sm:mb-6">
          {locationLoading && (
            <Alert className="text-sm">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
              <AlertDescription>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm">Rilevamento posizione...</span>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {locationError && (
            <Alert className="text-sm">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
              <AlertDescription className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm line-clamp-2">{locationError}</span>
                <Button variant="outline" size="sm" onClick={refreshLocation} className="shrink-0 h-8 touch-manipulation">
                  <Navigation className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Riprova</span>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {coordinates && !locationLoading && (
            <Alert className="text-sm">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <AlertDescription>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm">✓ Posizione rilevata</span>
                  <Button variant="ghost" size="sm" onClick={refreshLocation} className="shrink-0 h-8 touch-manipulation">
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Card className="shadow-medium">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">Carica Immagine Riparazione</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Scatta una foto chiara del problema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {!imagePreview ? (
              <label className="flex flex-col items-center justify-center w-full h-56 sm:h-64 border-2 border-dashed border-border rounded-xl cursor-pointer bg-muted/50 active:bg-muted transition-colors touch-manipulation">
                <div className="flex flex-col items-center justify-center py-5">
                  <Camera className="w-14 h-14 sm:w-16 sm:h-16 text-muted-foreground mb-4" />
                  <p className="mb-2 text-sm sm:text-base text-muted-foreground text-center px-4">
                    <span className="font-semibold">Tocca per caricare</span>
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">PNG, JPG o JPEG (MAX. 10MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Anteprima"
                    className="w-full h-56 sm:h-64 object-cover rounded-xl"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-3 right-3 h-9 sm:h-10 touch-manipulation"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview("");
                    }}
                  >
                    Rimuovi
                  </Button>
                </div>
                
                <Button
                  onClick={handleUploadAndAnalyze}
                  disabled={uploading || analyzing}
                  className="w-full h-14 sm:h-16 text-base sm:text-lg touch-manipulation active:scale-95 transition-transform"
                  size="lg"
                >
                  {uploading && <Loader2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6 animate-spin" />}
                  {analyzing && <Loader2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6 animate-spin" />}
                  {uploading ? "Caricamento..." : analyzing ? "Analisi con AI..." : "Analizza Immagine"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </MobileLayout>
  );
};

export default Diagnose;