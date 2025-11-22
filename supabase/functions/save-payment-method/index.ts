import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SavePaymentMethodRequest {
  paymentMethodId: string;
  setAsDefault?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');

    const { paymentMethodId, setAsDefault }: SavePaymentMethodRequest = await req.json();

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Recupera dettagli payment method da Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (paymentMethod.type !== 'card') {
      throw new Error('Only card payment methods are supported');
    }

    // Se default, rimuovi default da altre carte
    if (setAsDefault) {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    // Salva nel database
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        stripe_payment_method_id: paymentMethodId,
        card_brand: paymentMethod.card!.brand,
        card_last4: paymentMethod.card!.last4,
        exp_month: paymentMethod.card!.exp_month,
        exp_year: paymentMethod.card!.exp_year,
        is_default: setAsDefault || false,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, paymentMethod: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in save-payment-method:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
