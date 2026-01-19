import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  ArrowRight, 
  Home,
  Camera,
  Zap,
  User,
  Calendar,
  Bell,
  CheckCircle,
  Car,
  Wrench,
  CreditCard,
  Star,
  Play,
  RotateCcw,
  Euro,
  Globe
} from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { DemoPhase1 } from "@/components/demo/DemoPhase1";
import { DemoPhase2 } from "@/components/demo/DemoPhase2";
import { DemoPhase3 } from "@/components/demo/DemoPhase3";
import { DemoPhase4 } from "@/components/demo/DemoPhase4";
import { DemoPhase5 } from "@/components/demo/DemoPhase5";
import { DemoPhase6 } from "@/components/demo/DemoPhase6";
import { DemoPhase7 } from "@/components/demo/DemoPhase7";
import { DemoPhase8 } from "@/components/demo/DemoPhase8";
import { DemoPhase9 } from "@/components/demo/DemoPhase9";
import { DemoPhase10 } from "@/components/demo/DemoPhase10";
import { DemoPhase11 } from "@/components/demo/DemoPhase11";
import { DemoPhase12 } from "@/components/demo/DemoPhase12";
import { DemoLanguageProvider, useDemoLanguage } from "@/contexts/DemoLanguageContext";

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeInOut" as const,
  duration: 0.3,
};

const PHASE_ICONS = [
  Camera, Zap, User, Calendar, Bell, CheckCircle, Car, Wrench, CreditCard, Star, CheckCircle, Euro
];

const PHASE_ROLES = [
  "cliente", "sistema", "cliente", "cliente", "tecnico", "tecnico", "cliente", "tecnico", "cliente", "cliente", "sistema", "info"
];

function DemoFlowContent() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useDemoLanguage();
  const [currentPhase, setCurrentPhase] = useState(0);
  const [direction, setDirection] = useState(0);
  
  const phases = t.phases;
  const phase = phases[currentPhase];
  const PhaseIcon = PHASE_ICONS[currentPhase];
  const phaseRole = PHASE_ROLES[currentPhase];
  const progress = ((currentPhase + 1) / phases.length) * 100;

  const goNext = () => {
    if (currentPhase < phases.length - 1) {
      setDirection(1);
      setCurrentPhase(currentPhase + 1);
    }
  };

  const goPrev = () => {
    if (currentPhase > 0) {
      setDirection(-1);
      setCurrentPhase(currentPhase - 1);
    }
  };

  const goToPhase = (index: number) => {
    setDirection(index > currentPhase ? 1 : -1);
    setCurrentPhase(index);
  };

  const restart = () => {
    setDirection(-1);
    setCurrentPhase(0);
  };

  const toggleLang = () => {
    setLang(lang === "it" ? "en" : "it");
  };

  const renderPhaseContent = () => {
    switch (currentPhase) {
      case 0: return <DemoPhase1 onNext={goNext} />;
      case 1: return <DemoPhase2 onNext={goNext} />;
      case 2: return <DemoPhase3 onNext={goNext} />;
      case 3: return <DemoPhase4 onNext={goNext} />;
      case 4: return <DemoPhase5 onNext={goNext} />;
      case 5: return <DemoPhase6 onNext={goNext} />;
      case 6: return <DemoPhase7 onNext={goNext} />;
      case 7: return <DemoPhase8 onNext={goNext} />;
      case 8: return <DemoPhase9 onNext={goNext} />;
      case 9: return <DemoPhase10 onNext={goNext} />;
      case 10: return <DemoPhase11 onNext={goNext} />;
      case 11: return <DemoPhase12 onNext={() => navigate("/")} />;
      default: return null;
    }
  };

  const getRoleBadge = (role: string) => {
    const roleKey = role as keyof typeof t.roles;
    const roleText = t.roles[roleKey];
    switch (role) {
      case "cliente":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{roleText}</span>;
      case "tecnico":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">{roleText}</span>;
      case "sistema":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{roleText}</span>;
      case "info":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{roleText}</span>;
      default:
        return null;
    }
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        {/* Header */}
        <header className="bg-card border-b sticky top-0 z-50 shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
              >
                <Home className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  {t.demoTitle}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {t.demoSubtitle}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleLang}
                  className="text-xs font-bold"
                >
                  <Globe className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={restart}
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </div>
            </div>
            {/* Language indicator */}
            <div className="flex justify-center mt-1">
              <button
                onClick={toggleLang}
                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                {lang.toUpperCase()}
              </button>
            </div>
          </div>
        </header>

        {/* Progress */}
        <div className="bg-card border-b px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {t.phase} {currentPhase + 1} {t.of} {phases.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Phase Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <PhaseIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-primary">
                  {t.phase.toUpperCase()} {currentPhase + 1}
                </span>
                {getRoleBadge(phaseRole)}
              </div>
              <h2 className="font-semibold">{phase.title}</h2>
            </div>
          </div>
          <p className="text-sm text-muted-foreground pl-13">
            {phase.description}
          </p>
        </div>

        {/* Demo Notice */}
        <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700 px-4 py-2">
          <p className="text-xs text-amber-800 dark:text-amber-200 text-center font-medium">
            {t.demoNotice}
          </p>
        </div>

        {/* Phase Content */}
        <div className="container mx-auto px-4 py-6 max-w-lg overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPhase}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
            >
              {renderPhaseContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 z-50">
          <div className="container mx-auto max-w-lg flex gap-3">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={currentPhase === 0}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.back}
            </Button>
            {currentPhase < phases.length - 1 ? (
              <Button
                onClick={goNext}
                className="flex-1"
              >
                {t.next}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/")}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {t.endDemo}
              </Button>
            )}
          </div>

          {/* Step Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {phases.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => goToPhase(index)}
                className={`h-2 rounded-full ${
                  index === currentPhase 
                    ? "bg-primary" 
                    : index < currentPhase
                      ? "bg-green-500"
                      : "bg-muted-foreground/30"
                }`}
                animate={{
                  width: index === currentPhase ? 24 : 8,
                }}
                transition={{ duration: 0.2 }}
              />
            ))}
          </div>
        </div>

        {/* Bottom Spacer */}
        <div className="h-32" />
      </div>
    </MobileLayout>
  );
}

const DemoFlow = () => {
  const [searchParams] = useSearchParams();
  const langParam = searchParams.get("lang");
  const initialLang = langParam === "en" ? "en" : "it";

  return (
    <DemoLanguageProvider initialLang={initialLang}>
      <DemoFlowContent />
    </DemoLanguageProvider>
  );
};

export default DemoFlow;
