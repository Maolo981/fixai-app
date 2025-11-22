import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

const billingSchema = z.object({
  company_name: z.string().optional(),
  tax_code: z.string().min(11, "Codice fiscale non valido").max(16),
  vat_number: z.string().optional(),
  address: z.string().min(5, "Indirizzo richiesto"),
  city: z.string().min(2, "Città richiesta"),
  postal_code: z.string().min(5, "CAP richiesto"),
  country: z.string().default("IT"),
  sdi_code: z.string().optional(),
  pec_email: z.string().email("Email PEC non valida").optional().or(z.literal("")),
});

type BillingFormValues = z.infer<typeof billingSchema>;

interface BillingInfoFormProps {
  userId: string;
}

export function BillingInfoForm({ userId }: BillingInfoFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      company_name: "",
      tax_code: "",
      vat_number: "",
      address: "",
      city: "",
      postal_code: "",
      country: "IT",
      sdi_code: "",
      pec_email: "",
    },
  });

  useEffect(() => {
    loadBillingInfo();
  }, [userId]);

  const loadBillingInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("billing_info")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        form.reset(data);
      }
    } catch (error: any) {
      console.error("Error loading billing info:", error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: BillingFormValues) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("billing_info")
        .upsert({
          ...values,
          user_id: userId,
        } as any);

      if (error) throw error;

      toast({
        title: "Dati salvati",
        description: "I tuoi dati di fatturazione sono stati aggiornati",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare i dati",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
        <CardTitle>Dati di Fatturazione</CardTitle>
        <CardDescription>
          Inserisci i tuoi dati per ricevere fatture elettroniche
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ragione Sociale (opzionale)</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome azienda" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Fiscale *</FormLabel>
                    <FormControl>
                      <Input placeholder="RSSMRA80A01H501U" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vat_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partita IVA (opzionale)</FormLabel>
                    <FormControl>
                      <Input placeholder="IT12345678901" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sdi_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice SDI (opzionale)</FormLabel>
                    <FormControl>
                      <Input placeholder="ABCDEFG" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pec_email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Email PEC (opzionale)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="azienda@pec.it" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Indirizzo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Via Roma 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Città *</FormLabel>
                    <FormControl>
                      <Input placeholder="Milano" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CAP *</FormLabel>
                    <FormControl>
                      <Input placeholder="20100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salva Dati
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
