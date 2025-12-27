import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, 
  Clock, 
  CheckCircle,
  Send
} from "lucide-react";

const DEMO_SLOTS = [
  { date: "Oggi", time: "14:00 - 16:00", selected: false },
  { date: "Oggi", time: "16:00 - 18:00", selected: true },
  { date: "Domani", time: "09:00 - 11:00", selected: true },
  { date: "Domani", time: "11:00 - 13:00", selected: false },
  { date: "Domani", time: "14:00 - 16:00", selected: true },
  { date: "Ven 28 Dic", time: "10:00 - 12:00", selected: false },
];

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase4({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Seleziona più fasce orarie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Puoi selezionare più opzioni. Il tecnico confermerà la sua disponibilità.
          </p>

          {/* Time Slots */}
          <div className="space-y-2">
            {DEMO_SLOTS.map((slot, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  slot.selected 
                    ? "bg-primary/10 border-primary" 
                    : "bg-muted/30 border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className={`h-4 w-4 ${slot.selected ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-medium text-sm">{slot.date}</p>
                    <p className="text-xs text-muted-foreground">{slot.time}</p>
                  </div>
                </div>
                {slot.selected && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Flexible Option */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Sono flessibile</Label>
              <p className="text-xs text-muted-foreground">
                Il tecnico può propormi altri orari
              </p>
            </div>
            <Switch checked={true} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Note aggiuntive</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            placeholder="Es: Citofono 'Rossi', secondo piano..."
            value="Citofono 'Bianchi', terzo piano. Il cane abbaia ma non morde."
            disabled
            className="resize-none bg-muted/50"
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="py-4">
          <p className="text-sm font-medium mb-2">Riepilogo richiesta:</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tecnico:</span>
              <span className="font-medium">Marco Rossi</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fasce selezionate:</span>
              <span className="font-medium">3 opzioni</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Flessibilità:</span>
              <Badge variant="secondary" className="text-xs">Sì</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onNext}>
        <Send className="h-4 w-4 mr-2" />
        Invia richiesta
      </Button>
    </div>
  );
}
