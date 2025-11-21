import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, DollarSign, CheckCircle, XCircle } from "lucide-react";

interface Quote {
  id: string;
  description: string;
  estimated_hours: number;
  hourly_rate: number;
  total_cost: number;
  parts_cost: number;
  notes: string | null;
  status: string;
  expires_at: string;
  technicians: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface QuoteRequestCardProps {
  quote: Quote;
  onQuoteUpdated: () => void;
}

export function QuoteRequestCard({ quote, onQuoteUpdated }: QuoteRequestCardProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("quotes")
      .update({ status: "accepted" })
      .eq("id", quote.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile accettare il preventivo",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Preventivo accettato",
        description: "Il tecnico è stato notificato",
      });
      onQuoteUpdated();
    }
  };

  const handleReject = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("quotes")
      .update({ status: "rejected" })
      .eq("id", quote.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile rifiutare il preventivo",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Preventivo rifiutato",
        description: "Il tecnico è stato notificato",
      });
      onQuoteUpdated();
    }
  };

  const isExpired = new Date(quote.expires_at) < new Date();
  const isPending = quote.status === "pending" && !isExpired;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Preventivo Personalizzato</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              da {quote.technicians?.full_name}
            </p>
          </div>
          <Badge variant={isPending ? "default" : "secondary"}>
            {isPending ? "In Attesa" : quote.status === "accepted" ? "Accettato" : "Rifiutato"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm">{quote.description}</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Durata</p>
              <p className="font-medium">{quote.estimated_hours}h</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Tariffa</p>
              <p className="font-medium">€{quote.hourly_rate}/h</p>
            </div>
          </div>
        </div>

        {quote.parts_cost > 0 && (
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Costo Materiali</p>
            <p className="font-medium">€{quote.parts_cost.toFixed(2)}</p>
          </div>
        )}

        {quote.notes && (
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Note del Tecnico</p>
            <p className="text-sm mt-1">{quote.notes}</p>
          </div>
        )}

        <div className="border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Totale:</span>
            <span className="text-2xl font-bold text-primary">
              €{quote.total_cost.toFixed(2)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Valido fino al {new Date(quote.expires_at).toLocaleDateString("it-IT")}
        </p>
      </CardContent>

      {isPending && (
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleReject}
            disabled={loading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rifiuta
          </Button>
          <Button className="flex-1" onClick={handleAccept} disabled={loading}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Accetta
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
