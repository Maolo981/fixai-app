import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home,
  CheckCircle,
  Sparkles,
  Shield,
  Heart,
  TrendingUp
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase16({ onNext }: DemoPhaseProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Demo Label */}
      <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2">
        <p className="text-xs text-amber-800 dark:text-amber-200 text-center font-medium">
          🎭 DEMO – conclusione
        </p>
      </div>

      {/* Hero Card */}
      <Card className="bg-gradient-to-br from-primary/20 to-green-500/20 border-primary/30 overflow-hidden">
        <CardContent className="py-8 text-center relative">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(34,197,94,0.1),transparent_50%)]" />
          <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Trasparenza, libertà, sostenibilità</h2>
          <p className="text-muted-foreground">
            FIXO cresce quando crea valore reale
          </p>
        </CardContent>
      </Card>

      {/* Values */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center p-4">
          <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <p className="text-xs font-medium">Trasparenza</p>
        </Card>
        <Card className="text-center p-4">
          <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-xs font-medium">Libertà</p>
        </Card>
        <Card className="text-center p-4">
          <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-xs font-medium">Sostenibilità</p>
        </Card>
      </div>

      {/* Summary */}
      <Card className="bg-muted/30">
        <CardContent className="py-5 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            <span>Fee di servizio fissa alla conferma</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            <span>Commissione solo su pagamenti in-app</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            <span>Libertà di scelta per cliente e tecnico</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            <span>Nessun obbligo, solo incentivi</span>
          </div>
        </CardContent>
      </Card>

      {/* Completion Badge */}
      <div className="text-center py-4">
        <Badge className="bg-green-500 text-lg px-4 py-2">
          🎉 Demo completata!
        </Badge>
        <p className="text-sm text-muted-foreground mt-3">
          Hai scoperto l'intero flusso FIXO: dalla diagnosi al pagamento
        </p>
      </div>

      {/* Final CTA */}
      <Button 
        className="w-full bg-green-600 hover:bg-green-700" 
        size="lg" 
        onClick={() => navigate("/")}
      >
        <Home className="h-4 w-4 mr-2" />
        Fine demo - Torna alla home
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Grazie per aver esplorato FIXO!
      </p>
    </div>
  );
}