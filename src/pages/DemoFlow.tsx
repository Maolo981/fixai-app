import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  ArrowRight, 
  Home,
  Camera,
  User,
  Calendar,
  Bell,
  MessageCircle,
  Clock,
  CheckCircle,
  Car,
  Wrench,
  CreditCard,
  Star,
  Play,
  RotateCcw
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

const PHASES = [
  { 
    id: 1, 
    title: "Il cliente descrive il problema", 
    role: "cliente",
    icon: Camera,
    description: "Diagnosi intelligente del problema"
  },
  { 
    id: 2, 
    title: "Il cliente sceglie il tecnico", 
    role: "cliente",
    icon: User,
    description: "Selezione del professionista"
  },
  { 
    id: 3, 
    title: "Il cliente propone data e ora", 
    role: "cliente",
    icon: Calendar,
    description: "Scelta delle fasce orarie"
  },
  { 
    id: 4, 
    title: "Il tecnico riceve la richiesta", 
    role: "tecnico",
    icon: Bell,
    description: "Nuova richiesta in arrivo"
  },
  { 
    id: 5, 
    title: "Chiarimenti prima della conferma", 
    role: "entrambi",
    icon: MessageCircle,
    description: "Chat con contatti bloccati"
  },
  { 
    id: 6, 
    title: "Il tecnico conferma l'orario", 
    role: "tecnico",
    icon: Clock,
    description: "Selezione slot calendario"
  },
  { 
    id: 7, 
    title: "Appuntamento confermato", 
    role: "cliente",
    icon: CheckCircle,
    description: "Conferma e sblocco contatti"
  },
  { 
    id: 8, 
    title: "Intervento in corso", 
    role: "tecnico",
    icon: Car,
    description: "In viaggio → In corso"
  },
  { 
    id: 9, 
    title: "Intervento completato", 
    role: "tecnico",
    icon: Wrench,
    description: "Fine lavoro e riepilogo"
  },
  { 
    id: 10, 
    title: "Pagamento e valutazione", 
    role: "cliente",
    icon: Star,
    description: "Pagamento e recensione"
  },
];

const DemoFlow = () => {
  const navigate = useNavigate();
  const [currentPhase, setCurrentPhase] = useState(0);

  const phase = PHASES[currentPhase];
  const progress = ((currentPhase + 1) / PHASES.length) * 100;

  const goNext = () => {
    if (currentPhase < PHASES.length - 1) {
      setCurrentPhase(currentPhase + 1);
    }
  };

  const goPrev = () => {
    if (currentPhase > 0) {
      setCurrentPhase(currentPhase - 1);
    }
  };

  const restart = () => {
    setCurrentPhase(0);
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
      default: return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "cliente":
        return <Badge className="bg-blue-500">👤 Cliente</Badge>;
      case "tecnico":
        return <Badge className="bg-orange-500">🔧 Tecnico</Badge>;
      case "entrambi":
        return <Badge className="bg-purple-500">👥 Entrambi</Badge>;
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
                  Demo Flusso Completo
                </h1>
                <p className="text-xs text-muted-foreground">
                  Scopri come funziona FIXO
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={restart}
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Progress */}
        <div className="bg-card border-b px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Fase {currentPhase + 1} di {PHASES.length}
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
              <phase.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-primary">
                  FASE {phase.id}
                </span>
                {getRoleBadge(phase.role)}
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
            🎭 Questa è una DEMO - I dati sono fittizi, nessuna azione è reale
          </p>
        </div>

        {/* Phase Content */}
        <div className="container mx-auto px-4 py-6 max-w-lg">
          {renderPhaseContent()}
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
              Indietro
            </Button>
            {currentPhase < PHASES.length - 1 ? (
              <Button
                onClick={goNext}
                className="flex-1"
              >
                Avanti
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/")}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Fine Demo
              </Button>
            )}
          </div>

          {/* Step Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {PHASES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPhase(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentPhase 
                    ? "w-6 bg-primary" 
                    : index < currentPhase
                      ? "w-2 bg-green-500"
                      : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Spacer */}
        <div className="h-32" />
      </div>
    </MobileLayout>
  );
};

export default DemoFlow;
