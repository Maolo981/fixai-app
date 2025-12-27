import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle,
  Euro,
  Users,
  TrendingUp,
  Scale,
  Heart
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase15({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Demo Label */}
      <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2">
        <p className="text-xs text-amber-800 dark:text-amber-200 text-center font-medium">
          🎭 DEMO – riepilogo modello ibrido
        </p>
      </div>

      {/* Title Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="py-6 text-center">
          <Scale className="h-12 w-12 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Un modello equilibrato</h2>
          <p className="text-sm text-muted-foreground">
            Sostenibilità senza forzature
          </p>
        </CardContent>
      </Card>

      {/* Key Points */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Come funziona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <Euro className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Fee di servizio garantita</p>
              <p className="text-xs text-muted-foreground">
                FIXO guadagna sempre dalla fee alla conferma dell'appuntamento
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Incentivo al pagamento in-app</p>
              <p className="text-xs text-muted-foreground">
                FIXO guadagna di più se il pagamento avviene in piattaforma
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Libertà di scelta</p>
              <p className="text-xs text-muted-foreground">
                Cliente e tecnico mantengono piena libertà sul metodo di pagamento
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <Heart className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Solo incentivi, nessun obbligo</p>
              <p className="text-xs text-muted-foreground">
                Offriamo vantaggi concreti, non imposizioni
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Philosophy */}
      <Card className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 border-green-200">
        <CardContent className="py-5">
          <div className="text-center space-y-3">
            <p className="text-sm font-medium">
              FIXO non forza il pagamento in piattaforma.
            </p>
            <p className="text-sm text-muted-foreground">
              Offre vantaggi concreti per chi sceglie di restare.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Trasparenza
              </Badge>
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Libertà
              </Badge>
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Sostenibilità
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onNext}>
        <CheckCircle className="h-4 w-4 mr-2" />
        Continua demo
      </Button>

      <p className="text-sm text-center text-muted-foreground">
        Concludi la demo
      </p>
    </div>
  );
}