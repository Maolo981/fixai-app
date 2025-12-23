import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Download, Home, CheckCircle, Share, Plus, Zap, WifiOff, Bell, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

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

  const benefits = [
    { icon: Zap, title: "Accesso Rapido", description: "Avvia l'app in un tocco dalla home" },
    { icon: WifiOff, title: "Funziona Offline", description: "Accedi alle diagnosi salvate senza connessione" },
    { icon: Bell, title: "Notifiche Push", description: "Ricevi aggiornamenti in tempo reale" },
    { icon: Shield, title: "Sicuro & Veloce", description: "Esperienza nativa senza scaricare MB" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-8 pb-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="relative mx-auto w-24 h-24 mb-6"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl animate-pulse" />
            <div className="relative w-full h-full bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center shadow-2xl">
              <Smartphone className="h-12 w-12 text-primary-foreground" />
            </div>
          </motion.div>
          
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
            Installa RepairApp
          </h1>
          <p className="text-muted-foreground text-lg">
            L'app sempre a portata di mano
          </p>
        </motion.div>

        {/* Status Card */}
        {isInstalled ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-green-500/50 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-6 w-6" />
                  App installata con successo!
                </CardTitle>
                <CardDescription className="text-green-600 dark:text-green-400">
                  Puoi trovare RepairApp nella tua schermata home
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/')} className="w-full bg-green-600 hover:bg-green-700">
                  <Home className="mr-2 h-4 w-4" />
                  Vai alla Home
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Install Action Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {deferredPrompt ? (
                <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <CardHeader className="relative">
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-primary" />
                      Pronta per l'installazione
                    </CardTitle>
                    <CardDescription>
                      Un solo clic per aggiungere l'app alla tua schermata home
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <Button onClick={handleInstall} className="w-full" size="lg">
                      <Download className="mr-2 h-5 w-5" />
                      Installa RepairApp
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-primary" />
                      Come installare l'app
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* iOS Instructions */}
                    {isIOS && (
                      <motion.div 
                        className="space-y-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <span className="text-white text-sm">🍎</span>
                          </div>
                          iPhone / iPad (Safari)
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-sm font-bold text-primary">1</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Tocca l'icona Condividi</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Share className="h-4 w-4" /> (quadrato con freccia in basso)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-sm font-bold text-primary">2</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Scorri e trova "Aggiungi a Home"</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Plus className="h-4 w-4" /> potrebbe essere in fondo al menu
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-sm font-bold text-primary">3</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Tocca "Aggiungi"</p>
                              <p className="text-sm text-muted-foreground">in alto a destra</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Android Instructions */}
                    {!isIOS && (
                      <motion.div 
                        className="space-y-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                            <span className="text-white text-sm">🤖</span>
                          </div>
                          Android (Chrome)
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-sm font-bold text-primary">1</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Tocca il menu</p>
                              <p className="text-sm text-muted-foreground">(tre puntini in alto a destra)</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-sm font-bold text-primary">2</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Seleziona "Installa app"</p>
                              <p className="text-sm text-muted-foreground">o "Aggiungi a schermata Home"</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-sm font-bold text-primary">3</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Conferma l'installazione</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                      <Home className="mr-2 h-4 w-4" />
                      Continua nel Browser
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </>
        )}

        {/* Benefits Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold mb-4 text-center">Perché installare l'app?</h2>
          <div className="grid grid-cols-2 gap-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{benefit.title}</h3>
                    <p className="text-xs text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Trust Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center py-4"
        >
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            Sicuro • Nessun dato personale condiviso • Gratis
          </p>
        </motion.div>
      </div>
    </div>
  );
}
