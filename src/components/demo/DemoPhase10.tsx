import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Star, 
  CheckCircle,
  ThumbsUp,
  Send
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase10({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-4">
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
              Valutazione a stelle
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
          <div>
            <p className="text-sm text-muted-foreground mb-2">Commento testuale:</p>
            <Textarea 
              placeholder="Scrivi la tua recensione..."
              value="Tecnico molto professionale e puntuale. Ha risolto il problema velocemente e mi ha spiegato cosa è successo. Consigliatissimo!"
              disabled
              className="resize-none bg-muted/50"
            />
          </div>

          {/* Submit */}
          <Button className="w-full" disabled>
            <Send className="h-4 w-4 mr-2" />
            Invia recensione
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-300">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <ThumbsUp className="h-6 w-6 text-green-600" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Recensione inviata (demo)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onNext}>
        <CheckCircle className="h-4 w-4 mr-2" />
        Continua
      </Button>
    </div>
  );
}
