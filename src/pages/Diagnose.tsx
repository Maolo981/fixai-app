import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Diagnose = () => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

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
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="container max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-hero bg-clip-text text-transparent">
            Diagnosi Riparazione AI
          </h1>
          <p className="text-xl text-muted-foreground">
            Carica una foto del tuo problema di riparazione per un'analisi AI istantanea
          </p>
        </div>

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Carica Immagine Riparazione</CardTitle>
            <CardDescription>
              Scatta una foto chiara che mostri l'area del problema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!imagePreview ? (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Camera className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Clicca per caricare</span> o trascina e rilascia
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG o JPEG (MAX. 10MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Anteprima"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
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
                  className="w-full"
                  size="lg"
                >
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {analyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {uploading ? "Caricamento..." : analyzing ? "Analisi con AI..." : "Analizza Immagine"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Diagnose;