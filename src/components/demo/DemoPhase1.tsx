import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Zap,
  Euro
} from "lucide-react";

export function DemoPhase1() {
  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Caricamento foto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center bg-primary/5">
            <div className="mb-3">
              <img 
                src="https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=400&h=300&fit=crop"
                alt="Problema caldaia"
                className="w-full h-40 object-cover rounded-lg"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              📸 Foto caricata: caldaia_problema.jpg
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Descrizione problema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            "La caldaia non si accende, ho provato a resettarla ma continua a mostrare un codice di errore E01. Non esce acqua calda."
          </div>
        </CardContent>
      </Card>

      {/* AI Diagnosis Result */}
      <Card className="border-2 border-green-300 bg-green-50 dark:bg-green-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              Diagnosi AI
            </CardTitle>
            <Badge className="bg-green-500">Analisi completata</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Problem Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Problema rilevato:</span>
            <span className="font-semibold">Guasto caldaia</span>
          </div>

          {/* Possible Cause */}
          <div className="bg-background rounded-lg p-3">
            <p className="text-sm font-medium mb-1">Causa probabile:</p>
            <p className="text-sm text-muted-foreground">
              Errore E01 indica un problema di accensione. Potrebbe essere la valvola del gas, l'elettrodo di accensione o il pressostato.
            </p>
          </div>

          {/* Urgency */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Urgenza:</span>
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Media
            </Badge>
          </div>

          {/* Cost Estimate */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Costo stimato:</span>
            <div className="flex items-center gap-1 font-semibold text-primary">
              <Euro className="h-4 w-4" />
              80 - 150
            </div>
          </div>

          {/* Time Estimate */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tempo stimato:</span>
            <span className="font-medium">1-2 ore</span>
          </div>

          {/* Recommended Specialty */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Specialista:</span>
            <Badge>Tecnico caldaie</Badge>
          </div>
        </CardContent>
      </Card>

      {/* CTA (Demo) */}
      <Button className="w-full" size="lg" disabled>
        <CheckCircle className="h-4 w-4 mr-2" />
        Trova tecnici disponibili
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        ⬆️ Nella demo questo pulsante porta alla fase successiva
      </p>
    </div>
  );
}
