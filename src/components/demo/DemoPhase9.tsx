import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  Clock, 
  Euro,
  Wrench,
  Camera,
  FileText
} from "lucide-react";

export function DemoPhase9() {
  return (
    <div className="space-y-4">
      {/* Completion Banner */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-300 border-2">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-green-800 dark:text-green-200 text-lg">
                Intervento Completato!
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                Tutto risolto con successo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Riepilogo Lavoro
            </CardTitle>
            <Badge className="bg-green-500">Completato</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Problem */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Problema:</span>
            <span className="font-medium">Guasto caldaia - E01</span>
          </div>

          {/* Solution */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Lavoro eseguito:</p>
            <p className="text-sm bg-muted/50 rounded-lg p-3">
              Sostituita valvola di sicurezza e pulito elettrodo di accensione. 
              Verificato funzionamento completo. La caldaia ora funziona regolarmente.
            </p>
          </div>

          {/* Time */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Durata effettiva:</span>
            </div>
            <span className="font-medium">1h 45min</span>
          </div>

          {/* Photos */}
          <div>
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Foto lavoro completato:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="h-5 w-5 text-primary" />
            Dettaglio Costi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Manodopera (1.75h × €45/h):</span>
            <span>€78,75</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ricambi:</span>
            <span>€35,00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Uscita:</span>
            <span>€15,00</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="font-medium">Totale:</span>
            <span className="font-bold text-lg">€128,75</span>
          </div>
        </CardContent>
      </Card>

      {/* Technician Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Note Tecnico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            value="Consiglio manutenzione annuale della caldaia. La prossima volta controllare anche il vaso di espansione."
            disabled
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" disabled>
        <CheckCircle className="h-4 w-4 mr-2" />
        Conferma completamento
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        ⬆️ Il tecnico compila il riepilogo e conferma la fine del lavoro
      </p>
    </div>
  );
}
