import { useDemoMode } from "./DemoModeProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw,
  Clock,
  Car,
  Wrench,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const STATUS_INFO = {
  pending: { label: "In attesa", icon: Clock, color: "bg-yellow-500" },
  confirmed: { label: "Confermato", icon: CheckCircle, color: "bg-blue-500" },
  en_route: { label: "In viaggio", icon: Car, color: "bg-orange-500" },
  in_progress: { label: "In corso", icon: Wrench, color: "bg-purple-500" },
  completed: { label: "Completato", icon: CheckCircle, color: "bg-green-500" },
};

const STATUS_FLOW = ["pending", "confirmed", "en_route", "in_progress", "completed"];

export function DemoModePanel() {
  const { isDemoMode, toggleDemoMode, demoStatus, setDemoStatus, advanceStatus } = useDemoMode();

  if (!isDemoMode) {
    return (
      <Card className="fixed bottom-20 right-4 z-50 w-64 shadow-lg border-2 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="demo-mode" className="text-sm font-medium">
                Modalità Demo
              </Label>
            </div>
            <Switch
              id="demo-mode"
              checked={isDemoMode}
              onCheckedChange={toggleDemoMode}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Attiva per simulare il flusso completo
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-20 right-4 z-50 w-80 shadow-xl border-2 border-primary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            Modalità Demo Attiva
          </CardTitle>
          <Switch
            checked={isDemoMode}
            onCheckedChange={toggleDemoMode}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Timeline */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Stato attuale</Label>
          <div className="flex gap-1">
            {STATUS_FLOW.map((status, index) => {
              const info = STATUS_INFO[status as keyof typeof STATUS_INFO];
              const isActive = status === demoStatus;
              const isPast = STATUS_FLOW.indexOf(demoStatus) > index;
              
              return (
                <button
                  key={status}
                  onClick={() => setDemoStatus(status)}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    isActive 
                      ? info.color 
                      : isPast 
                        ? "bg-green-300" 
                        : "bg-muted"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Current Status Badge */}
        <div className="flex items-center justify-center">
          {(() => {
            const info = STATUS_INFO[demoStatus as keyof typeof STATUS_INFO];
            const Icon = info.icon;
            return (
              <Badge variant="outline" className="text-sm py-1 px-3">
                <Icon className="h-4 w-4 mr-2" />
                {info.label}
              </Badge>
            );
          })()}
        </div>

        {/* Status Selection */}
        <div className="grid grid-cols-5 gap-1">
          {STATUS_FLOW.map((status) => {
            const info = STATUS_INFO[status as keyof typeof STATUS_INFO];
            const Icon = info.icon;
            const isActive = status === demoStatus;
            
            return (
              <Button
                key={status}
                size="sm"
                variant={isActive ? "default" : "outline"}
                className="h-12 flex flex-col items-center justify-center p-1"
                onClick={() => setDemoStatus(status)}
              >
                <Icon className="h-4 w-4 mb-1" />
                <span className="text-[10px] leading-tight text-center">
                  {info.label.split(' ')[0]}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setDemoStatus("pending")}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={advanceStatus}
            disabled={demoStatus === "completed"}
          >
            <SkipForward className="h-4 w-4 mr-1" />
            Avanti
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center border-t pt-2">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          Nessuna modifica al database
        </div>
      </CardContent>
    </Card>
  );
}
