import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Clock, 
  Euro,
  User,
  Calendar,
  MessageCircle,
  CheckCircle,
  XCircle,
  Sparkles
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase4({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Notification Banner */}
      <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-300 border-2">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center animate-pulse">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-orange-800 dark:text-orange-200">
                Nuova richiesta di intervento!
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-300">
                Ricevuta 2 minuti fa
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Richiesta #1247</CardTitle>
            <Badge className="bg-blue-500">
              <Clock className="h-3 w-3 mr-1" />
              In attesa
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client Info */}
          <div className="flex items-center gap-3 pb-3 border-b">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Anna Bianchi</p>
              <p className="text-xs text-muted-foreground">Cliente nuovo</p>
            </div>
          </div>

          {/* Problem */}
          <div>
            <p className="text-sm font-medium mb-1">Problema:</p>
            <p className="text-sm text-muted-foreground">
              Guasto caldaia - Codice errore E01
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Durata stimata</p>
              <p className="font-semibold">2 ore</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Euro className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Compenso</p>
              <p className="font-semibold">€80 - €150</p>
            </div>
          </div>

          {/* Available Slots */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fasce proposte dal cliente:
            </p>
            <div className="space-y-1">
              <Badge variant="outline" className="mr-1">Oggi 16:00-18:00</Badge>
              <Badge variant="outline" className="mr-1">Domani 09:00-11:00</Badge>
              <Badge variant="outline">Domani 14:00-16:00</Badge>
            </div>
          </div>

          {/* Flexibility */}
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-2 rounded-lg">
            <Sparkles className="h-4 w-4" />
            <span>Cliente flessibile - scegli uno slot libero</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        <Button className="w-full" size="lg" onClick={onNext}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Accetta e scegli orario
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onNext}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat
          </Button>
          <Button variant="outline" className="flex-1" disabled>
            <Calendar className="h-4 w-4 mr-2" />
            Proponi altro
          </Button>
        </div>
      </div>
    </div>
  );
}
