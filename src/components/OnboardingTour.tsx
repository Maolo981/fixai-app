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
      <div className="fixed inset-0 z-[100] pointer-events-none">
        {/* Overlay scuro */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm pointer-events-auto"
          onClick={skipTour}
        />

        {/* Card del tour */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4 pointer-events-auto"
        >
          <Card className="shadow-strong border-2 border-primary/20">
            <CardContent className="p-6 space-y-4">
              {/* Close button */}
              <button
                onClick={skipTour}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Icon */}
              <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-gradient-hero">
                <Icon className="h-8 w-8 text-white" />
              </div>

              {/* Content */}
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-hero"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {currentStep + 1} di {tourSteps.length}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={handlePrev} className="flex-1">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Indietro
                  </Button>
                )}
                <Button onClick={handleNext} className="flex-1">
                  {currentStep < tourSteps.length - 1 ? (
                    <>
                      Avanti
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    "Iniziamo! 🚀"
                  )}
                </Button>
              </div>

              {/* Skip button */}
              <button
                onClick={skipTour}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Salta tour
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
