import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CreditCard, 
  Shield,
  Lock,
  Clock,
  Euro,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase11({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Demo Label */}
      <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2">
        <p className="text-xs text-amber-800 dark:text-amber-200 text-center font-medium">
          🎭 DEMO – nessun pagamento reale
        </p>
      </div>

      {/* Pre-Authorization Card */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Metodo di pagamento
            </CardTitle>
            <Badge variant="outline" className="border-primary text-primary">
              Pre-autorizzazione
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mock Card Input */}
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Numero carta
              </label>
              <div className="relative">
                <Input 
                  value="4242 4242 4242 4242"
                  disabled
                  className="pl-10"
                />
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Scadenza
                </label>
                <Input value="12/26" disabled />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  CVV
                </label>
                <Input value="•••" disabled />
              </div>
            </div>
          </div>

          {/* Pre-Authorization Amount */}
          <div className="text-center py-4 bg-primary/5 rounded-lg border-2 border-dashed border-primary/30">
            <p className="text-sm text-muted-foreground mb-1">Pre-autorizzazione</p>
            <div className="flex items-center justify-center gap-1">
              <Euro className="h-6 w-6 text-primary" />
              <span className="text-3xl font-bold text-primary">70</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Importo indicativo bloccato
            </p>
          </div>

          {/* Info Badges */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Nessun addebito immediato
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Pagherai solo a intervento concluso
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                Importo finale calcolato dopo il lavoro
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explanation Card */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Come funziona la pre-autorizzazione?</p>
              <p className="text-sm text-muted-foreground">
                FIXO utilizza una pre-autorizzazione per garantire l'intervento.
                L'importo <strong>non viene addebitato ora</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Il pagamento avviene <strong>solo dopo la conclusione del lavoro</strong>, 
                con l'importo finale calcolato in base all'intervento effettivo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>Pagamenti sicuri con crittografia SSL</span>
      </div>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onNext}>
        <CheckCircle className="h-4 w-4 mr-2" />
        Continua demo
      </Button>
    </div>
  );
}
