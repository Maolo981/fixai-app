import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase11({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Final Summary */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-300 border-2">
        <CardContent className="py-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
            Processo Completato!
          </h3>
          <p className="text-sm text-green-600 dark:text-green-300 mb-4">
            Dalla diagnosi al pagamento, tutto tracciato e sicuro.
          </p>
        </CardContent>
      </Card>

      {/* Status Badges */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Intervento completato
              </span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Recensione registrata
              </span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Processo concluso
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Value Props */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm font-medium text-center mb-3">
            Con FIXO hai ottenuto:
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-green-600 border-green-300">
              ✓ Tecnico verificato
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-300">
              ✓ Prezzi trasparenti
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-300">
              ✓ Pagamento tracciato
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-300">
              ✓ Recensione verificata
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onNext}>
        <CheckCircle className="h-4 w-4 mr-2" />
        Scopri come guadagna FIXO
      </Button>
    </div>
  );
}
