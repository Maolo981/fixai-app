import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MessageCircle, 
  AlertTriangle, 
  Send,
  Lock,
  CheckCircle,
  Calendar
} from "lucide-react";

const DEMO_MESSAGES = [
  {
    sender: "system",
    content: "Il cliente ha aperto una chat. L'appuntamento non è ancora confermato.",
  },
  {
    sender: "client",
    content: "Buongiorno, volevo chiedere se può portare un pezzo di ricambio per la valvola, o devo procurarmelo io?",
  },
  {
    sender: "technician",
    content: "Buongiorno! Porto sempre i ricambi più comuni per caldaie. Dopo aver visto il modello esatto saprò dirle se ho già il pezzo o se va ordinato.",
  },
  {
    sender: "client",
    content: "Perfetto, grazie! Preferisco il pomeriggio se possibile.",
  },
  {
    sender: "technician",
    content: "Posso venire il pomeriggio 👍",
  },
];

export function DemoPhase5() {
  return (
    <div className="space-y-4">
      {/* Security Banner */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-300 border-2">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Lock className="h-4 w-4" />
            <p className="text-sm font-medium">
              Contatti e indirizzo visibili solo dopo la conferma
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Chat Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Chat con il cliente
            </CardTitle>
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              In attesa di conferma
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Messages */}
          <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
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

          {/* Quick Replies */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 text-xs">
              Posso venire la mattina
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 text-xs">
              Posso venire il pomeriggio
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 text-xs">
              Serve accesso al contatore?
            </Badge>
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input 
              placeholder="Scrivi un messaggio (contatti non consentiti)"
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
              <p className="font-medium mb-1">Azioni non consentite:</p>
              <ul className="text-xs space-y-1">
                <li>• Scambio di numeri di telefono</li>
                <li>• Condivisione di indirizzi email</li>
                <li>• Accordi di pagamento esterni</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" disabled>
        <CheckCircle className="h-4 w-4 mr-2" />
        Conferma e scegli orario
      </Button>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" disabled>
          <Calendar className="h-4 w-4 mr-2" />
          Proponi altro orario
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        ⬆️ La chat permette chiarimenti ma blocca i contatti
      </p>
    </div>
  );
}
