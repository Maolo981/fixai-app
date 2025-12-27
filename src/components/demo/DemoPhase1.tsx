import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Camera, 
  Upload,
  Zap
} from "lucide-react";
import caldaiaImage from "@/assets/caldaia-demo.webp";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase1({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Caricamento foto del problema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 text-center bg-primary/5">
            <div className="mb-3">
              <img 
                src={caldaiaImage}
                alt="Problema caldaia"
                className="w-full h-40 object-cover rounded-lg"
              />
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              <span>Foto caricata: caldaia_problema.jpg</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Descrizione testuale libera</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            value="La caldaia non si accende, ho provato a resettarla ma continua a mostrare un codice di errore E01. Non esce acqua calda."
            disabled
            className="resize-none bg-muted/50"
          />
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onNext}>
        <Zap className="h-4 w-4 mr-2" />
        Analizza con AI
      </Button>
    </div>
  );
}
