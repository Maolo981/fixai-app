import { Check, X, Clock, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuoteInChatCardProps {
  quote: {
    id: string;
    description: string;
    estimated_hours: number;
    hourly_rate: number;
    total_cost: number;
    parts_cost: number | null;
    notes: string | null;
    status: string;
  };
  isOwnQuote: boolean;
  onAccept?: (quoteId: string) => void;
  onReject?: (quoteId: string) => void;
}

export function QuoteInChatCard({ quote, isOwnQuote, onAccept, onReject }: QuoteInChatCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-green-500">Accettato</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rifiutato</Badge>;
      case "pending":
        return <Badge variant="secondary">In attesa</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Preventivo</CardTitle>
          {getStatusBadge(quote.status)}
        </div>
        <CardDescription className="text-sm">{quote.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{quote.estimated_hours}h</span>
          </div>
          <div className="flex items-center gap-2">
            <Euro className="h-4 w-4 text-muted-foreground" />
            <span>€{quote.hourly_rate}/h</span>
          </div>
        </div>

        {quote.parts_cost && quote.parts_cost > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Materiali: </span>
            <span className="font-medium">€{quote.parts_cost.toFixed(2)}</span>
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Totale</span>
            <span className="text-xl font-bold text-primary">€{quote.total_cost.toFixed(2)}</span>
          </div>
        </div>

        {quote.notes && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <strong>Note:</strong> {quote.notes}
          </div>
        )}

        {!isOwnQuote && quote.status === "pending" && onAccept && onReject && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onAccept(quote.id)}
              className="flex-1"
              size="sm"
            >
              <Check className="h-4 w-4 mr-1" />
              Accetta
            </Button>
            <Button
              onClick={() => onReject(quote.id)}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <X className="h-4 w-4 mr-1" />
              Rifiuta
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
