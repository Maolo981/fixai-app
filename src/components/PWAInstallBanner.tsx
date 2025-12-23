import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Zap, WifiOff, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if user dismissed the banner recently
    const dismissedAt = localStorage.getItem('pwa-banner-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt);
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < threeDays) {
        return;
      }
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Show iOS banner after delay
    if (isIOSDevice) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Listen for install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe"
      >
        <div className="max-w-lg mx-auto">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl shadow-2xl p-4 text-primary-foreground relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex items-start gap-4">
              {/* App Icon */}
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                  <Smartphone className="h-7 w-7" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg mb-1">Installa RepairApp</h3>
                <p className="text-sm text-primary-foreground/80 mb-3">
                  Aggiungi alla schermata home per un accesso rapido
                </p>

                {/* Benefits */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
                    <Zap className="h-3 w-3" /> Veloce
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
                    <WifiOff className="h-3 w-3" /> Offline
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
                    <Star className="h-3 w-3" /> Gratis
                  </span>
                </div>

                {isIOS ? (
                  <>
                    {!showIOSInstructions ? (
                      <Button
                        onClick={() => setShowIOSInstructions(true)}
                        className="bg-white text-primary hover:bg-white/90 font-semibold"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Come installare
                      </Button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-white/10 rounded-lg p-3 text-sm"
                      >
                        <p className="font-medium mb-2">Su Safari:</p>
                        <ol className="list-decimal list-inside space-y-1 text-primary-foreground/90">
                          <li>Tocca <span className="font-semibold">Condividi</span> (quadrato con freccia)</li>
                          <li>Scorri e tocca <span className="font-semibold">"Aggiungi a Home"</span></li>
                          <li>Conferma con <span className="font-semibold">"Aggiungi"</span></li>
                        </ol>
                      </motion.div>
                    )}
                  </>
                ) : (
                  <Button
                    onClick={handleInstall}
                    className="bg-white text-primary hover:bg-white/90 font-semibold"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Installa ora
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
