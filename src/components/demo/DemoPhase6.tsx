import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  CheckCircle,
  X
} from "lucide-react";

const DEMO_CALENDAR = [
  { time: "09:00", status: "occupied", label: "Intervento #1244" },
  { time: "10:00", status: "occupied", label: null },
  { time: "11:00", status: "free", label: null },
  { time: "12:00", status: "free", label: null },
  { time: "13:00", status: "break", label: "Pausa" },
  { time: "14:00", status: "free", label: null },
  { time: "15:00", status: "selected", label: "Nuovo appuntamento" },
  { time: "16:00", status: "selected", label: null },
  { time: "17:00", status: "free", label: null },
];

export function DemoPhase6() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">Oggi, 27 Dicembre</p>
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  Cliente: Anna Bianchi
                </p>
              </div>
            </div>
            <Badge variant="outline">Venerdì</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Seleziona lo slot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {DEMO_CALENDAR.map((slot, index) => (
              <div
                key={index}
                className={`flex items-center p-3 rounded-lg border transition-all ${
                  slot.status === "selected" 
                    ? "bg-primary/10 border-primary border-2" 
                    : slot.status === "occupied"
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200"
                      : slot.status === "break"
                        ? "bg-muted/50 border-transparent"
                        : "bg-green-50 dark:bg-green-950/20 border-green-200"
                }`}
              >
                <span className="w-14 text-sm font-mono">{slot.time}</span>
                <div className="flex-1">
                  {slot.status === "selected" ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{slot.label}</span>
                    </div>
                  ) : slot.status === "occupied" ? (
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">
                        {slot.label || "Occupato"}
                      </span>
                    </div>
                  ) : slot.status === "break" ? (
                    <span className="text-sm text-muted-foreground">{slot.label}</span>
                  ) : (
                    <span className="text-sm text-green-600">Libero</span>
                  )}
                </div>
                {slot.status === "free" && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                    Disponibile
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Libero</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Occupato</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-primary" />
              <span>Selezionato</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-300">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Slot selezionato: 15:00 - 17:00
              </p>
              <p className="text-xs text-green-600">
                Durata: 2 ore
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" disabled>
        <CheckCircle className="h-4 w-4 mr-2" />
        Conferma orario
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        ⬆️ Il tecnico seleziona lo slot e conferma l'appuntamento
      </p>
    </div>
  );
}
