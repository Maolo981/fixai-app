import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Briefcase, User, X, ChevronRight, ChevronLeft } from "lucide-react";

interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: any;
  placement: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    target: "welcome",
    title: "Benvenuto in AI Repair! 👋",
    description: "Scopriamo insieme come funziona la tua nuova app di riparazione intelligente",
    icon: Camera,
    placement: "bottom",
  },
  {
    target: "diagnose-tab",
    title: "Le tue Diagnosi",
    description: "Qui troverai tutte le diagnosi AI che hai creato. Carica una foto e l'AI analizzerà il problema!",
    icon: Camera,
    placement: "bottom",
  },
  {
    target: "bookings-tab",
    title: "Le tue Prenotazioni",
    description: "Gestisci tutte le prenotazioni con i tecnici, controlla lo stato e comunica con loro",
    icon: Briefcase,
    placement: "bottom",
  },
  {
    target: "settings-tab",
    title: "Impostazioni",
    description: "Personalizza le notifiche e gestisci il tuo profilo",
    icon: User,
    placement: "bottom",
  },
];

export const OnboardingTour = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("hasSeenOnboardingTour");
    if (!hasSeenTour) {
      // Aspetta un po' prima di mostrare il tour per dare tempo alla pagina di caricare
      setTimeout(() => setIsActive(true), 1000);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    localStorage.setItem("hasSeenOnboardingTour", "true");
    setIsActive(false);
  };

  const skipTour = () => {
    completeTour();
  };

  if (!isActive) return null;

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]">
        {/* Overlay molto più scuro */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          onClick={skipTour}
        />

        {/* Card del tour - perfettamente centrata */}
        <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="w-full max-w-lg"
          >
            <Card className="shadow-strong border-2 border-primary/30 bg-card">
              <CardContent className="p-6 sm:p-8 space-y-5">
              {/* Close button con più contrasto */}
              <button
                onClick={skipTour}
                className="absolute top-4 right-4 p-2 rounded-full bg-muted/80 hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Icon più grande e visibile */}
              <div className="flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full bg-gradient-hero shadow-glow">
                <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-white drop-shadow-lg" />
              </div>

              {/* Content con font più grandi */}
              <div className="text-center space-y-3">
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground">{step.title}</h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed px-2">
                  {step.description}
                </p>
              </div>

              {/* Progress bar più visibile */}
              <div className="space-y-3">
                <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    className="h-full bg-gradient-hero shadow-md"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm font-semibold text-center text-foreground">
                  Passo {currentStep + 1} di {tourSteps.length}
                </p>
              </div>

              {/* Buttons più grandi */}
              <div className="flex gap-3 pt-2">
                {currentStep > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={handlePrev} 
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    <ChevronLeft className="h-5 w-5 mr-2" />
                    Indietro
                  </Button>
                )}
                <Button 
                  onClick={handleNext} 
                  className="flex-1 h-12 text-base font-semibold shadow-medium hover:shadow-strong transition-all"
                >
                  {currentStep < tourSteps.length - 1 ? (
                    <>
                      Avanti
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </>
                  ) : (
                    "Iniziamo! 🚀"
                  )}
                </Button>
              </div>

              {/* Skip button più visibile */}
              <button
                onClick={skipTour}
                className="w-full pt-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                Salta tour
              </button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
