import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, MessageSquare, Brain, Euro, Wrench, X, ChevronRight, ChevronLeft } from "lucide-react";

const tourSteps = [
  {
    title: "Scatta una foto 📸",
    description: "Fotografa il problema domestico o carica un'immagine dalla galleria. Più è chiara, più precisa sarà la diagnosi.",
    icon: Camera,
  },
  {
    title: "Descrivi il problema",
    description: "Aggiungi una breve descrizione facoltativa per aiutare FixoAI a capire meglio la situazione.",
    icon: MessageSquare,
  },
  {
    title: "FixoAI analizza tutto 🧠",
    description: "L'intelligenza artificiale analizza la foto, identifica il problema, stima i costi e suggerisce il professionista giusto.",
    icon: Brain,
  },
  {
    title: "Preventivo e azione",
    description: "Ricevi un preventivo indicativo e puoi trovare subito un professionista disponibile nella tua zona.",
    icon: Euro,
  },
];

const STORAGE_KEY = "hasSeenDiagnosisTour";

interface DiagnosisTourProps {
  onComplete?: () => void;
}

export function DiagnosisTour({ onComplete }: DiagnosisTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const t = setTimeout(() => setIsActive(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const finish = () => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
    onComplete?.();
  };

  const next = () => (step < tourSteps.length - 1 ? setStep(step + 1) : finish());
  const prev = () => step > 0 && setStep(step - 1);

  if (!isActive) return null;

  const current = tourSteps[step];
  const Icon = current.icon;
  const progress = ((step + 1) / tourSteps.length) * 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          onClick={finish}
        />

        <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="w-full max-w-lg"
          >
            <Card className="shadow-strong border-2 border-primary/30 bg-card relative">
              <CardContent className="p-6 sm:p-8 space-y-5">
                <button
                  onClick={finish}
                  className="absolute top-4 right-4 p-2 rounded-full bg-muted/80 hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Step number pills */}
                <div className="flex justify-center gap-2">
                  {tourSteps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/60" : "w-2 bg-muted"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-full bg-gradient-hero shadow-glow">
                  <Icon className="h-10 w-10 text-white drop-shadow-lg" />
                </div>

                <div className="text-center space-y-3">
                  <h3 className="text-2xl font-bold text-foreground">{current.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed px-2">
                    {current.description}
                  </p>
                </div>

                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-hero"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  {step > 0 && (
                    <Button variant="outline" onClick={prev} className="flex-1 h-12 text-base font-semibold">
                      <ChevronLeft className="h-5 w-5 mr-1" />
                      Indietro
                    </Button>
                  )}
                  <Button onClick={next} className="flex-1 h-12 text-base font-semibold">
                    {step < tourSteps.length - 1 ? (
                      <>
                        Avanti
                        <ChevronRight className="h-5 w-5 ml-1" />
                      </>
                    ) : (
                      "Prova ora! 🚀"
                    )}
                  </Button>
                </div>

                <button
                  onClick={finish}
                  className="w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
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
}
