import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  AlertTriangle, 
  Clock, 
  Euro, 
  CheckCircle2, 
  Wrench,
  Camera,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIDiagnosisCardProps {
  diagnosis: {
    id: string;
    problem_type: string;
    possible_cause?: string | null;
    ai_probability?: number | null;
    urgency_level: string;
    ai_risk?: string | null;
    ai_steps?: string[] | null;
    estimated_cost_min?: number | null;
    estimated_cost_max?: number | null;
    ai_analysis?: string;
    input_text?: string | null;
    input_images?: string[] | null;
  };
  onFindTechnician?: () => void;
  onEditDiagnosis?: () => void;
  showActions?: boolean;
}

export function AIDiagnosisCard({ 
  diagnosis, 
  onFindTechnician, 
  onEditDiagnosis,
  showActions = true 
}: AIDiagnosisCardProps) {
  const getUrgencyConfig = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return { 
          label: 'Alta', 
          className: 'bg-destructive text-destructive-foreground',
          icon: AlertTriangle
        };
      case 'medium':
        return { 
          label: 'Media', 
          className: 'bg-yellow-500 text-white',
          icon: Clock
        };
      case 'low':
        return { 
          label: 'Bassa', 
          className: 'bg-green-500 text-white',
          icon: CheckCircle2
        };
      default:
        return { 
          label: urgency, 
          className: 'bg-muted text-muted-foreground',
          icon: Clock
        };
    }
  };

  const urgencyConfig = getUrgencyConfig(diagnosis.urgency_level);
  const UrgencyIcon = urgencyConfig.icon;
  
  // Default values if AI data is missing
  const probability = diagnosis.ai_probability ?? 85;
  const steps = diagnosis.ai_steps ?? [
    "Controllo e ispezione iniziale",
    "Identificazione del guasto",
    "Riparazione o sostituzione componenti",
    "Test di verifica finale"
  ];
  const risk = diagnosis.ai_risk ?? "Il problema potrebbe peggiorare causando danni maggiori e costi più elevati.";
  const problemSummary = diagnosis.possible_cause ?? diagnosis.ai_analysis ?? "Problema identificato in base alla descrizione fornita.";

  const hasEnoughData = diagnosis.input_text || (diagnosis.input_images && diagnosis.input_images.length > 0);

  if (!hasEnoughData && showActions) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/30">
        <CardContent className="py-8 text-center">
          <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Ci serve un dettaglio in più</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Aggiungi una foto o descrivi meglio il problema per ottenere una diagnosi più precisa.
          </p>
          {onEditDiagnosis && (
            <Button onClick={onEditDiagnosis} variant="outline" className="gap-2">
              <Camera className="h-4 w-4" />
              Aggiungi foto
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Diagnosi AI</CardTitle>
              <CardDescription className="text-xs">
                Risultato basato su foto e descrizione
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4 space-y-5">
          {/* Problema probabile */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Probabile causa
            </label>
            <p className="text-sm leading-relaxed">
              {problemSummary}
            </p>
          </div>

          {/* Probabilità */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Probabilità
              </label>
              <span className="text-sm font-semibold text-primary">{probability}%</span>
            </div>
            <Progress value={probability} className="h-2" />
          </div>

          {/* Urgenza */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Quanto è urgente
            </label>
            <div className="flex items-center gap-2">
              <Badge className={cn("gap-1.5 py-1 px-3", urgencyConfig.className)}>
                <UrgencyIcon className="h-3.5 w-3.5" />
                {urgencyConfig.label}
              </Badge>
            </div>
          </div>

          {/* Rischio */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              Se rimandi potrebbe...
            </label>
            <p className="text-sm text-muted-foreground italic">
              {risk}
            </p>
          </div>

          {/* Intervento tipico */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" />
              Cosa faremo
            </label>
            <ul className="space-y-1.5">
              {steps.slice(0, 4).map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Costo stimato */}
          {(diagnosis.estimated_cost_min || diagnosis.estimated_cost_max) && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Euro className="h-3.5 w-3.5" />
                Stima costi
              </label>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary">
                  €{diagnosis.estimated_cost_min ?? 0}
                </span>
                <span className="text-muted-foreground">-</span>
                <span className="text-2xl font-bold text-primary">
                  €{diagnosis.estimated_cost_max ?? 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Il costo finale sarà confermato dal tecnico dopo il sopralluogo
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      {showActions && (
        <div className="space-y-3">
          {onFindTechnician && (
            <Button 
              onClick={onFindTechnician} 
              className="w-full gap-2 h-12 text-base"
              size="lg"
            >
              Trova tecnico adatto
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {onEditDiagnosis && (
            <Button 
              onClick={onEditDiagnosis} 
              variant="ghost" 
              className="w-full text-muted-foreground"
            >
              Modifica descrizione / aggiungi foto
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
