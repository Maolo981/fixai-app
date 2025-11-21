import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Calendar } from "lucide-react";

interface Quote {
  id: string;
  job_id: string;
  description: string;
  estimated_hours: number;
  hourly_rate: number;
  total_cost: number;
  parts_cost: number;
  notes: string | null;
  status: string;
  expires_at: string;
  created_at: string;
}

interface QuoteCardProps {
  quote: Quote;
}

export function QuoteCard({ quote }: QuoteCardProps) {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      pending: { label: "In Attesa", variant: "secondary" },
      accepted: { label: "Accettato", variant: "default" },
      rejected: { label: "Rifiutato", variant: "destructive" },
      expired: { label: "Scaduto", variant: "outline" },
    };
    return statusMap[status] || { label: status, variant: "secondary" };
  };

  const isExpired = new Date(quote.expires_at) < new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">Preventivo #{quote.id.slice(0, 8)}</CardTitle>
          <Badge {...getStatusBadge(isExpired && quote.status === "pending" ? "expired" : quote.status)}>
            {getStatusBadge(isExpired && quote.status === "pending" ? "expired" : quote.status).label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{quote.description}</p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{quote.estimated_hours}h</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>€{quote.hourly_rate}/h</span>
          </div>
        </div>

        {quote.parts_cost > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Materiali: </span>
            <span className="font-medium">€{quote.parts_cost.toFixed(2)}</span>
          </div>
        )}

        {quote.notes && (
          <div className="text-sm bg-muted p-2 rounded">
            <span className="text-muted-foreground">Note: </span>
            {quote.notes}
          </div>
        )}

        <div className="border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Totale:</span>
            <span className="text-xl font-bold text-primary">€{quote.total_cost.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Scade il: {new Date(quote.expires_at).toLocaleDateString("it-IT")}
        </div>
      </CardContent>
    </Card>
  );
}
