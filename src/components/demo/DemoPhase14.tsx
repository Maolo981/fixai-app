import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CreditCard,
  Wallet,
  CheckCircle,
  XCircle,
  Shield,
  Star,
  History,
  Headphones
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase14({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Demo Label */}
      <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2">
        <p className="text-xs text-amber-800 dark:text-amber-200 text-center font-medium">
          🎭 DEMO – opzioni di pagamento
        </p>
      </div>

      {/* Title */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="py-5 text-center">
          <Wallet className="h-10 w-10 text-primary mx-auto mb-2" />
          <h2 className="text-lg font-bold">Pagamento dell'intervento</h2>
          <p className="text-sm text-muted-foreground">
            Cliente e tecnico scelgono liberamente
          </p>
        </CardContent>
      </Card>

      {/* Option A - Via FIXO */}
      <Card className="border-2 border-green-300 dark:border-green-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Opzione A
            </CardTitle>
            <Badge className="bg-green-500">Consigliato</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">Pagamento tramite FIXO</p>
          <p className="text-xs text-muted-foreground">
            Se il cliente paga tramite FIXO, la piattaforma applica una piccola commissione percentuale.
          </p>

          {/* Example */}
          <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Costo intervento</span>
              <span className="font-medium">€100</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Commissione FIXO (5-8%)</span>
              <span>€5-8</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm font-bold text-green-600">
              <span>Tecnico riceve</span>
              <span>€92-95</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-green-700 dark:text-green-400">Vantaggi:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Shield className="h-3 w-3 text-green-500" />
                <span>Pagamento tracciato</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Headphones className="h-3 w-3 text-green-500" />
                <span>Supporto FIXO</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Star className="h-3 w-3 text-green-500" />
                <span>Recensione verificata</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <History className="h-3 w-3 text-green-500" />
                <span>Storico interventi</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Option B - Off Platform */}
      <Card className="border border-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            Opzione B
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">Pagamento fuori piattaforma</p>
          <p className="text-xs text-muted-foreground">
            Il cliente e il tecnico possono accordarsi per il pagamento fuori piattaforma.
          </p>

          {/* Note */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              In questo caso FIXO non applica commissioni sull'intervento.
            </p>
          </div>

          {/* Consequences */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Conseguenze:</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <XCircle className="h-3 w-3 text-orange-400" />
                <span>Nessuna protezione pagamento</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <XCircle className="h-3 w-3 text-orange-400" />
                <span>Nessuna recensione verificata</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <XCircle className="h-3 w-3 text-orange-400" />
                <span>Nessun supporto in caso di problemi</span>
              </div>
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
        Vedi il riepilogo del modello FIXO
      </p>
    </div>
  );
}