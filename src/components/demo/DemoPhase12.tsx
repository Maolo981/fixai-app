import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle,
  Euro,
  CreditCard,
  Clock,
  Wrench,
  Shield,
  Zap
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase12({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Demo Label */}
      <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2">
        <p className="text-xs text-amber-800 dark:text-amber-200 text-center font-medium">
          🎭 DEMO – nessun pagamento reale
        </p>
      </div>

      {/* Completion Banner */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-300 border-2">
        <CardContent className="py-6">
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
              Intervento Completato!
            </h3>
            <p className="text-sm text-green-600 dark:text-green-300">
              Il tecnico ha terminato il lavoro con successo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cost Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary" />
              Costo Finale
            </CardTitle>
            <Badge className="bg-green-500">Calcolato</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Work Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Manodopera (1h 45min)</span>
              <span className="font-medium">€78,75</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ricambi utilizzati</span>
              <span className="font-medium">€35,00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diritto di chiamata</span>
              <span className="font-medium">€15,00</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>Totale</span>
              <span className="text-primary">€128,75</span>
            </div>
          </div>

          {/* Pre-auth vs Final */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span>Confronto importi</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Pre-autorizzato</p>
                <p className="font-medium">€70,00</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Finale</p>
                <p className="font-bold text-primary">€128,75</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Completed */}
      <Card className="border-2 border-green-300">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium flex items-center gap-2">
                Pagamento Automatico
                <CheckCircle className="h-4 w-4 text-green-500" />
              </p>
              <p className="text-sm text-muted-foreground">
                •••• 4242 · €128,75
              </p>
            </div>
            <Badge className="bg-green-500">Completato</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                Pagamento senza pensieri
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Il pagamento avviene automaticamente a lavoro concluso, 
                <strong> senza contanti</strong> e <strong>senza accordi fuori piattaforma</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Value Props */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-xs text-muted-foreground">Sicuro</p>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <Wrench className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-xs text-muted-foreground">Tracciato</p>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <CreditCard className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-xs text-muted-foreground">Automatico</p>
        </div>
      </div>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onNext}>
        <CheckCircle className="h-4 w-4 mr-2" />
        Continua demo
      </Button>
    </div>
  );
}
