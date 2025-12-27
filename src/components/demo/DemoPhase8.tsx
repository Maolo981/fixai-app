import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Car, 
  Wrench, 
  Clock, 
  MapPin,
  Navigation,
  Phone,
  CheckCircle
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase8({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Status Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stato Intervento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline */}
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-muted" />
            
            <div className="space-y-6">
              {/* Confirmed */}
              <div className="flex items-center gap-4 relative">
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center z-10">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-green-600">Confermato</p>
                  <p className="text-xs text-muted-foreground">14:30</p>
                </div>
              </div>

              {/* En Route */}
              <div className="flex items-center gap-4 relative">
                <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center z-10 animate-pulse">
                  <Car className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-orange-600">In viaggio</p>
                  <p className="text-xs text-muted-foreground">14:45 - Partito ora</p>
                </div>
                <Badge className="bg-orange-500">Attivo</Badge>
              </div>

              {/* In Progress */}
              <div className="flex items-center gap-4 relative opacity-50">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center z-10">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">In corso</p>
                  <p className="text-xs text-muted-foreground">In attesa</p>
                </div>
              </div>

              {/* Completed */}
              <div className="flex items-center gap-4 relative opacity-50">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center z-10">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Completato</p>
                  <p className="text-xs text-muted-foreground">In attesa</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Card */}
      <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-300 border-2">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center animate-pulse">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-orange-800 dark:text-orange-200">
                Marco è in viaggio
              </p>
              <p className="text-sm text-orange-600">
                Tempo stimato: 12 minuti
              </p>
            </div>
          </div>

          {/* Map Placeholder */}
          <div className="bg-background rounded-lg h-32 flex items-center justify-center border mb-4">
            <div className="text-center text-muted-foreground">
              <Navigation className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <p className="text-sm">Mappa tracking in tempo reale</p>
            </div>
          </div>

          {/* Distance */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-600" />
              <span>Distanza:</span>
            </div>
            <span className="font-medium">2.3 km</span>
          </div>
        </CardContent>
      </Card>

      {/* Technician Actions (Demo) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            🔧 Vista Tecnico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full bg-orange-500 hover:bg-orange-600" disabled>
            <Car className="h-4 w-4 mr-2" />
            ✓ Sono in viaggio (cliccato)
          </Button>
          <Button className="w-full" onClick={onNext}>
            <Wrench className="h-4 w-4 mr-2" />
            Inizio intervento
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
