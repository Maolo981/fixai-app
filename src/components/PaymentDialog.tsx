import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  paymentType: "deposit" | "balance" | "full";
  amount: number;
  onSuccess?: () => void;
}

function PaymentForm({ jobId, paymentType, amount, onSuccess, onClose }: {
  jobId: string;
  paymentType: string;
  amount: number;
  onSuccess?: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) throw submitError;

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { jobId, paymentType },
      });

      if (error) throw error;

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/jobs/${jobId}`,
        },
        redirect: 'if_required',
      });

      if (confirmError) throw confirmError;

      toast({
        title: "Pagamento completato!",
        description: `Pagamento di €${amount.toFixed(2)} effettuato con successo`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Errore pagamento",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="flex-1"
        >
          Annulla
        </Button>
        <Button type="submit" disabled={!stripe || loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Elaborazione...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Paga €{amount.toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function PaymentDialog({
  open,
  onOpenChange,
  jobId,
  paymentType,
  amount,
  onSuccess,
}: PaymentDialogProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const { toast } = useToast();

  const initializePayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { jobId, paymentType },
      });

      if (error) throw error;
      setClientSecret(data.clientSecret);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile inizializzare il pagamento",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      initializePayment();
    } else {
      setClientSecret(null);
    }
    onOpenChange(newOpen);
  };

  const paymentTypeLabels = {
    deposit: "Anticipo",
    balance: "Saldo",
    full: "Pagamento Completo",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pagamento {paymentTypeLabels[paymentType]}</DialogTitle>
          <DialogDescription>
            Importo da pagare: <span className="font-bold">€{amount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        {!clientSecret ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: 'stripe' },
              locale: 'it',
            }}
          >
            <PaymentForm
              jobId={jobId}
              paymentType={paymentType}
              amount={amount}
              onSuccess={onSuccess}
              onClose={() => onOpenChange(false)}
            />
          </Elements>
        )}

        <Alert>
          <CreditCard className="h-4 w-4" />
          <AlertDescription>
            Pagamento sicuro tramite Stripe. I tuoi dati sono protetti.
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}
