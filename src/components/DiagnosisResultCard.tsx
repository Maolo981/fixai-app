import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Euro,
  RefreshCw,
  Shield,
  Wrench,
  Zap,
} from "lucide-react";
import { DiagnosisResult } from "@/hooks/useDiagnosis";
import { cn } from "@/lib/utils";

interface DiagnosisResultCardProps {
  result: DiagnosisResult;
  onFindProfessional?: () => void;
  onNewDiagnosis?: () => void;
}

const gravitaConfig: Record<string, { label: string; color: string; bg: string; icon: typeof AlertTriangle }> = {
  basso:   { label: "Basso",   color: "text-green-700",  bg: "bg-green-100 border-green-300", icon: Shield },
  medio:   { label: "Medio",   color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-300", icon: Clock },
  alto:    { label: "Alto",    color: "text-orange-700", bg: "bg-orange-100 border-orange-300", icon: AlertTriangle },
  urgente: { label: "Urgente", color: "text-red-700",    bg: "bg-red-100 border-red-300", icon: Zap },
};

const categoriaIcons: Record<string, string> = {
  idraulica: "💧",
  elettrica: "⚡",
  serrature_infissi: "🚪",
  elettrodomestici: "🔌",
  hvac: "❄️",
  edilizia: "🏗️",
  altro: "🔧",
};

export function DiagnosisResultCard({ result, onFindProfessional, onNewDiagnosis }: DiagnosisResultCardProps) {
  const config = gravitaConfig[result.gravita] || gravitaConfig.medio;
  const GravitaIcon = config.icon;
  const catIcon = categoriaIcons[result.categoria] || "🔧";
  const isUrgent = result.gravita === "alto" || result.gravita === "urgente";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{catIcon}</span>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{result.tipo_problema}</h3>
              <p className="text-sm text-muted-foreground capitalize">{result.categoria.replace("_", " / ")}</p>
            </div>
            <Badge className={cn("gap-1 px-3 py-1 border", config.bg, config.color)}>
              <GravitaIcon className="h-3.5 w-3.5" />
              {config.label}
            </Badge>
          </div>

          {/* Gravity bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Gravità</span>
              <span className="font-semibold">{result.gravita_score}/10</span>
            </div>
            <Progress value={result.gravita_score * 10} className="h-2.5" />
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm leading-relaxed">{result.descrizione_problema}</p>
        </CardContent>
      </Card>

      {/* Urgent warning */}
      {isUrgent && result.azioni_immediate && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400 text-sm mb-1">Azioni immediate consigliate</p>
              <p className="text-sm text-red-600 dark:text-red-300">{result.azioni_immediate}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost estimate */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Euro className="h-3.5 w-3.5" />
            Preventivo stimato
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">€{result.preventivo_min}</span>
            <span className="text-muted-foreground text-lg">–</span>
            <span className="text-3xl font-bold text-primary">€{result.preventivo_max}</span>
          </div>
          <p className="text-xs text-muted-foreground">Prezzo di mercato indicativo, il professionista confermerà il costo finale.</p>
        </CardContent>
      </Card>

      {/* Professional + time */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Wrench className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Professionista necessario</p>
              <p className="font-medium text-sm">{result.professionista_necessario}</p>
            </div>
          </div>
          {result.tempo_stimato && (
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Tempo stimato</p>
                <p className="font-medium text-sm">{result.tempo_stimato}</p>
              </div>
            </div>
          )}
          {result.note_aggiuntive && (
            <p className="text-xs text-muted-foreground italic border-t pt-3 mt-2">{result.note_aggiuntive}</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3 pt-2">
        {onFindProfessional && (
          <Button onClick={onFindProfessional} className="w-full gap-2 h-12 text-base" size="lg">
            Trova professionista disponibile
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        {onNewDiagnosis && (
          <Button onClick={onNewDiagnosis} variant="outline" className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Nuova diagnosi
          </Button>
        )}
      </div>
    </div>
  );
}
