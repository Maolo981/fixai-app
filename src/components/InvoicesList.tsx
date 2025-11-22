import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  pdf_url: string | null;
  job_id: string;
}

interface InvoicesListProps {
  userId: string;
}

export function InvoicesList({ userId }: InvoicesListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadInvoices();
  }, [userId]);

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", userId)
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error("Error loading invoices:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le fatture",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (jobId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice", {
        body: { jobId },
      });

      if (error) throw error;

      // Scarica HTML come file
      const blob = new Blob([data.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fattura-${data.invoice.invoice_number}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Fattura generata",
        description: "La fattura è stata scaricata",
      });

      loadInvoices();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile generare la fattura",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      draft: "secondary",
      issued: "default",
      sent: "default",
      paid: "default",
    };

    const labels: Record<string, string> = {
      draft: "Bozza",
      issued: "Emessa",
      sent: "Inviata",
      paid: "Pagata",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Le Tue Fatture</CardTitle>
        <CardDescription>
          Storico delle fatture emesse per i tuoi lavori completati
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessuna fattura disponibile</p>
            <p className="text-sm mt-2">
              Le fatture verranno generate automaticamente al completamento dei lavori
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-4">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold">{invoice.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(invoice.invoice_date).toLocaleDateString("it-IT", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-lg font-bold mt-1">
                      €{invoice.total_amount.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(invoice.status)}
                  <Button
                    size="sm"
                    onClick={() => generateInvoice(invoice.job_id)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Scarica
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
