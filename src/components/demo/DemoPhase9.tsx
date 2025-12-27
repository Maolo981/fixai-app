import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  CheckCircle,
  Euro,
  Shield,
  Banknote,
  Smartphone
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase9({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Payment Notice */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="py-3">
          <p className="text-sm text-blue-800 dark:text-blue-200 text-center font-medium">
            Il pagamento avviene solo dopo il completamento del lavoro.
          </p>
        </CardContent>
      </Card>

      {/* Payment Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Pagamento
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Amount */}
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Totale da pagare</p>
            <div className="flex items-center justify-center gap-1">
              <Euro className="h-6 w-6 text-primary" />
              <span className="text-3xl font-bold text-primary">128,75</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <p className="text-sm font-medium mb-3">Metodi di pagamento disponibili:</p>
            <div className="space-y-2">
              {/* Card */}
              <div className="flex items-center gap-3 p-3 border-2 border-primary rounded-lg bg-primary/5">
                <CreditCard className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Carta di credito / debito</p>
                  <p className="text-xs text-muted-foreground">Pagamento tracciato in app</p>
                </div>
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>

              {/* PayPal */}
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium">PayPal</p>
                  <p className="text-xs text-muted-foreground">Pagamento tracciato in app</p>
                </div>
              </div>

              {/* Cash */}
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <Banknote className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium">Contanti</p>
                  <p className="text-xs text-muted-foreground">Pagamento diretto al tecnico</p>
                </div>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <Card className="bg-muted/30">
            <CardContent className="py-3">
              <p className="text-sm text-muted-foreground">
                Il metodo di pagamento dipende dalle preferenze del cliente e del tecnico.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Per contanti: nessuna gestione del contante da parte di FIXO.
              </p>
            </CardContent>
          </Card>

          {/* Security */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Pagamento sicuro e tracciato</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Complete */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-300 border-2">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">
                Pagamento completato (demo)
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                Carta •••• 4242
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onNext}>
        <CheckCircle className="h-4 w-4 mr-2" />
        Continua
      </Button>
    </div>
  );
}
