import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Euro,
  CheckCircle,
  BadgeCheck,
  Shield,
  Sparkles
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase13({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Demo Label */}
      <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2">
        <p className="text-xs text-amber-800 dark:text-amber-200 text-center font-medium">
          🎭 DEMO – spiegazione modello di guadagno
        </p>
      </div>

      {/* Title Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="py-6 text-center">
          <Euro className="h-12 w-12 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Fee di servizio FIXO</h2>
          <p className="text-sm text-muted-foreground">
            Come funziona la conferma dell'appuntamento
          </p>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Alla conferma dell'appuntamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            FIXO applica una piccola fee di servizio fissa per l'organizzazione dell'intervento.
          </p>

          {/* Example */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Fee di servizio FIXO</span>
              <span className="font-bold text-lg text-primary">€5 - €10</span>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Utilizzo della piattaforma</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Gestione richiesta</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Organizzazione dell'intervento</span>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Nota:</strong> La fee è indipendente dal metodo di pagamento finale scelto per l'intervento.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <div className="flex flex-wrap justify-center gap-2">
        <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-300">
          <BadgeCheck className="h-3 w-3 mr-1" />
          Fee fissa
        </Badge>
        <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-300">
          <Shield className="h-3 w-3 mr-1" />
          Trasparente
        </Badge>
        <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-300">
          <Sparkles className="h-3 w-3 mr-1" />
          Una tantum
        </Badge>
      </div>

      {/* Value Explanation */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <p className="text-sm text-center text-muted-foreground">
            FIXO guadagna per aver organizzato correttamente l'intervento: 
            far incontrare cliente e tecnico, gestire disponibilità e chat, 
            ridurre perdite di tempo.
          </p>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onNext}>
        Continua demo
      </Button>

      <p className="text-sm text-center text-muted-foreground">
        Scopri le opzioni di pagamento dell'intervento
      </p>
    </div>
  );
}
