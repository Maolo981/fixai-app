import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Download, Home, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <Smartphone className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-3xl font-bold">Installa RepairApp</h1>
          <p className="text-muted-foreground">
            Accedi rapidamente all'app direttamente dalla tua schermata home
          </p>
        </div>

        {isInstalled ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                App già installata!
              </CardTitle>
              <CardDescription className="text-green-600 dark:text-green-400">
                L'app è già installata sul tuo dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')} className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Vai alla Home
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {deferredPrompt ? (
              <Card>
                <CardHeader>
                  <CardTitle>Pronta per l'installazione</CardTitle>
                  <CardDescription>
                    Clicca il pulsante qui sotto per installare l'app sul tuo dispositivo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleInstall} className="w-full" size="lg">
                    <Download className="mr-2 h-5 w-5" />
                    Installa App
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Come installare l'app</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Su iPhone/iPad (Safari):</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Tocca l'icona di condivisione (quadrato con freccia)</li>
                      <li>Scorri e seleziona "Aggiungi a Home"</li>
                      <li>Tocca "Aggiungi" in alto a destra</li>
                    </ol>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Su Android (Chrome):</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Tocca il menu (tre puntini)</li>
                      <li>Seleziona "Installa app" o "Aggiungi a schermata Home"</li>
                      <li>Conferma l'installazione</li>
                    </ol>
                  </div>

                  <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                    <Home className="mr-2 h-4 w-4" />
                    Continua nel Browser
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Vantaggi dell'installazione:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Accesso rapido dalla schermata home</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Funziona offline per diagnosi salvate</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Esperienza a schermo intero senza barra del browser</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Caricamento più veloce</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
