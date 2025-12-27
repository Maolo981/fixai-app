import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Bell, 
  Clock, 
  Euro,
  User,
  Calendar,
  MessageCircle,
  CheckCircle,
  Lock,
  AlertTriangle,
  Send
} from "lucide-react";

const DEMO_MESSAGES = [
  {
    sender: "system",
    content: "Chat attiva. L'appuntamento non è ancora confermato.",
  },
  {
    sender: "client",
    content: "Buongiorno, volevo chiedere se può portare un pezzo di ricambio per la valvola?",
  },
  {
    sender: "technician",
    content: "Buongiorno! Porto sempre i ricambi più comuni per caldaie. Dopo aver visto il modello esatto saprò dirle se ho già il pezzo.",
  },
];

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase5({ onNext }: DemoPhaseProps) {
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

      {/* Request Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Richiesta #1247</CardTitle>
            <Badge className="bg-blue-500">In attesa</Badge>
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
              <p className="text-xs text-muted-foreground">Cliente</p>
            </div>
          </div>

          {/* Problem */}
          <div>
            <p className="text-sm font-medium mb-1">Problema:</p>
            <p className="text-sm text-muted-foreground">Guasto caldaia - Errore E01</p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Durata stimata</p>
              <p className="font-semibold">2 ore</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Euro className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Compenso stimato</p>
              <p className="font-semibold">€80 - €150</p>
            </div>
          </div>

          {/* Available Slots */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fasce orarie proposte:
            </p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">Oggi 16:00-18:00</Badge>
              <Badge variant="outline">Domani 09:00-11:00</Badge>
              <Badge variant="outline">Domani 14:00-16:00</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Chat con il cliente
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Security Notice */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 rounded-lg p-2 mb-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Lock className="h-4 w-4" />
              <p className="text-xs font-medium">
                I contatti e l'indirizzo saranno visibili solo dopo la conferma dell'orario.
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-3 max-h-40 overflow-y-auto mb-3">
            {DEMO_MESSAGES.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.sender === "technician" ? "justify-end" : 
                  msg.sender === "system" ? "justify-center" : "justify-start"
                }`}
              >
                {msg.sender === "system" ? (
                  <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs text-muted-foreground text-center max-w-[80%]">
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                      msg.sender === "technician"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input 
              placeholder="Scrivi un messaggio..."
              disabled
              className="flex-1"
            />
            <Button size="icon" disabled>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
        <CardContent className="py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <p className="font-medium mb-1">Limitazioni chat:</p>
              <ul className="text-xs space-y-0.5">
                <li>• Nessuna condivisione di numeri di telefono</li>
                <li>• Nessuna email</li>
                <li>• Nessun accordo esterno</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        <Button className="w-full" size="lg" onClick={onNext}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Accetta e scegli orario
        </Button>
        <Button variant="outline" className="w-full" disabled>
          <Calendar className="h-4 w-4 mr-2" />
          Proponi altro orario
        </Button>
      </div>
    </div>
  );
}
