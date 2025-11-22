import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RefundStatusCardProps {
  jobId: string;
}

interface Refund {
  id: string;
  amount: number;
  reason: string;
  refund_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export function RefundStatusCard({ jobId }: RefundStatusCardProps) {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRefunds();
  }, [jobId]);

  const loadRefunds = async () => {
    try {
      const { data, error } = await supabase
        .from("refunds")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRefunds(data || []);
    } catch (error) {
      console.error("Error loading refunds:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (refunds.length === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "succeeded":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "processing":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      succeeded: "default",
      processing: "secondary",
      failed: "destructive",
      pending: "secondary",
    };

    const labels: Record<string, string> = {
      succeeded: "Completato",
      processing: "In elaborazione",
      failed: "Fallito",
      pending: "In attesa",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getRefundTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      full: "Rimborso Totale",
      partial: "Rimborso Parziale",
      cancellation_24h: "Cancellazione <24h",
      cancellation_48h: "Cancellazione <48h",
      cancellation_72h: "Cancellazione >72h",
    };
    return labels[type] || type;
  };

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <CardTitle>Rimborso in Corso</CardTitle>
          </div>
        </div>
        <CardDescription>
          Il tuo rimborso è stato richiesto e verrà elaborato
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {refunds.map((refund) => (
          <Alert key={refund.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {getStatusIcon(refund.status)}
                <div>
                  <p className="font-semibold">
                    Rimborso: €{refund.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getRefundTypeLabel(refund.refund_type)}
                  </p>
                  {refund.reason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Motivo: {refund.reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Richiesto il{" "}
                    {new Date(refund.created_at).toLocaleDateString("it-IT")}
                  </p>
                  {refund.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      Completato il{" "}
                      {new Date(refund.completed_at).toLocaleDateString("it-IT")}
                    </p>
                  )}
                </div>
              </div>
              {getStatusBadge(refund.status)}
            </div>
          </Alert>
        ))}

        {refunds.some((r) => r.status === "processing" || r.status === "pending") && (
          <AlertDescription className="text-sm">
            Il rimborso verrà accreditato sulla tua carta entro 5-10 giorni lavorativi.
          </AlertDescription>
        )}
      </CardContent>
    </Card>
  );
}
