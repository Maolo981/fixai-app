import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  CreditCard, 
  Star, 
  CheckCircle,
  Euro,
  Shield,
  ThumbsUp
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase10({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
      {/* Payment Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Pagamento
            </CardTitle>
            <Badge className="bg-green-500">Completato</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Amount */}
          <div className="text-center py-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Totale da pagare</p>
            <p className="text-3xl font-bold text-primary">€128,75</p>
          </div>

          {/* Payment Methods */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 border-2 border-primary rounded-lg bg-primary/5">
              <CreditCard className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Carta di credito</p>
                <p className="text-xs text-muted-foreground">•••• 4242</p>
              </div>
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Security */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Pagamento sicuro con Stripe</span>
          </div>

          <Button className="w-full bg-green-600 hover:bg-green-700" disabled>
            <CheckCircle className="h-4 w-4 mr-2" />
            Pagato con successo
          </Button>
        </CardContent>
      </Card>

      {/* Review Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Lascia una recensione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Technician */}
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10">M</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">Marco Rossi</p>
              <p className="text-sm text-muted-foreground">Tecnico caldaie</p>
            </div>
          </div>

          {/* Stars */}
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Come valuti il servizio?
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-10 w-10 cursor-pointer transition-all ${
                    star <= 5 
                      ? "fill-yellow-400 text-yellow-400" 
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm font-medium mt-2">5 stelle - Eccellente!</p>
          </div>

          {/* Review Text */}
          <Textarea 
            placeholder="Scrivi la tua recensione..."
            value="Tecnico molto professionale e puntuale. Ha risolto il problema velocemente e mi ha spiegato cosa è successo. Consigliatissimo!"
            disabled
            className="resize-none"
          />

          {/* Submit */}
          <Button className="w-full" disabled>
            <ThumbsUp className="h-4 w-4 mr-2" />
            Invia recensione
          </Button>
        </CardContent>
      </Card>

      {/* Final Summary */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-300 border-2">
        <CardContent className="py-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
            Processo Completato!
          </h3>
          <p className="text-sm text-green-600 dark:text-green-300 mb-4">
            Dalla diagnosi al pagamento, tutto tracciato e sicuro.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-green-600 border-green-300">
              ✓ Nessun contatto fuori piattaforma
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-300">
              ✓ Pagamento tracciato
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-300">
              ✓ Recensione verificata
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Value Props */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm font-medium text-center mb-3">
            Con FIXO hai ottenuto:
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Tecnico verificato e affidabile</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Prezzi trasparenti senza sorprese</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Comunicazione sicura e tracciata</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Garanzia sul lavoro eseguito</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-center text-green-600 font-medium">
        🎉 Fine della demo! Hai visto l'intero flusso FIXO.
      </p>
    </div>
  );
}
