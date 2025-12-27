import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp,
  Euro,
  CheckCircle,
  Home,
  Users,
  Wrench,
  BadgeCheck,
  Handshake,
  Shield
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase13({ onNext }: DemoPhaseProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Demo Label */}
      <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2">
        <p className="text-xs text-amber-800 dark:text-amber-200 text-center font-medium">
          🎭 DEMO – informativa sul modello di business
        </p>
      </div>

      {/* Title Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="py-6 text-center">
          <TrendingUp className="h-12 w-12 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Come guadagna FIXO</h2>
          <p className="text-sm text-muted-foreground">
            Un modello semplice e trasparente
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
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Euro className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Commissione su intervento</p>
              <p className="text-xs text-muted-foreground">
                FIXO trattiene una commissione su ogni intervento completato
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BadgeCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Applicata automaticamente</p>
              <p className="text-xs text-muted-foreground">
                La commissione viene applicata automaticamente al pagamento finale
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Compenso netto al tecnico</p>
              <p className="text-xs text-muted-foreground">
                Il tecnico riceve il compenso netto direttamente sul suo conto
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Nessun costo nascosto</p>
              <p className="text-xs text-muted-foreground">
                Il cliente non paga costi aggiuntivi nascosti
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Example Calculation */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Esempio illustrativo</CardTitle>
            <Badge variant="outline">Demo</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Costo intervento</span>
              <span className="font-bold text-lg">€100</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Commissione FIXO (12%)</span>
              <span className="font-medium text-primary">-€12</span>
            </div>
            <div className="flex justify-between items-center py-2 bg-green-50 dark:bg-green-950/30 rounded-lg px-3">
              <span className="text-sm font-medium">Tecnico riceve</span>
              <span className="font-bold text-lg text-green-600">€88</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Closing Statement */}
      <Card className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 border-green-200">
        <CardContent className="py-5">
          <div className="text-center space-y-3">
            <Handshake className="h-10 w-10 text-green-600 mx-auto" />
            <p className="text-sm font-medium">
              FIXO guadagna solo quando il lavoro è completato con successo.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Nessun abbonamento
              </Badge>
              <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:text-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Nessun costo iniziale
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Nessun costo per cliente o tecnico prima dell'intervento completato
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trust */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>Modello trasparente e sostenibile</span>
      </div>

      {/* Final CTAs */}
      <div className="space-y-2">
        <Button 
          className="w-full bg-green-600 hover:bg-green-700" 
          size="lg" 
          onClick={() => navigate("/")}
        >
          <Home className="h-4 w-4 mr-2" />
          Fine demo - Torna alla home
        </Button>
      </div>

      {/* Completion Message */}
      <div className="text-center py-4">
        <p className="text-sm text-green-600 font-medium">
          🎉 Hai completato la demo completa di FIXO!
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Ora conosci l'intero flusso dalla diagnosi al pagamento
        </p>
      </div>
    </div>
  );
}
