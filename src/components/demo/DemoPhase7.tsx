import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  MapPin,
  Phone,
  MessageCircle,
  Star,
  Unlock
} from "lucide-react";

export function DemoPhase7() {
  return (
    <div className="space-y-4">
      {/* Success Banner */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-300 border-2">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-green-800 dark:text-green-200 text-lg">
                Appuntamento Confermato!
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                Il tecnico ha accettato la tua richiesta
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unlock Notice */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Unlock className="h-4 w-4" />
            <p className="text-sm font-medium">
              Contatti sbloccati! Ora puoi vedere telefono e indirizzo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dettagli Appuntamento</CardTitle>
            <Badge className="bg-green-500">Confermato</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Oggi, 27 Dicembre 2024</p>
              <p className="text-sm text-muted-foreground">15:00 - 17:00</p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Durata stimata:</span>
            <span className="font-medium">2 ore</span>
          </div>

          {/* Problem */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Problema:</span>
            <span className="font-medium">Guasto caldaia</span>
          </div>
        </CardContent>
      </Card>

      {/* Technician Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tecnico Assegnato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg bg-primary/10">M</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">Marco Rossi</p>
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>4.9 (127 recensioni)</span>
              </div>
            </div>
          </div>

          {/* Contact Info - NOW VISIBLE */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <Phone className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-200">
                +39 333 1234567
              </span>
              <Button size="sm" variant="outline" className="ml-auto" disabled>
                Chiama
              </Button>
            </div>
            <div className="flex items-start gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-green-600 dark:text-green-300">Il tecnico verrà a:</p>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Via Roma 42, 20100 Milano
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        <Button className="w-full" disabled>
          <MessageCircle className="h-4 w-4 mr-2" />
          Chat con il tecnico
        </Button>
        <Button variant="outline" className="w-full text-red-500" disabled>
          Annulla prenotazione
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        ⬆️ Il cliente vede l'appuntamento confermato con i contatti sbloccati
      </p>
    </div>
  );
}
