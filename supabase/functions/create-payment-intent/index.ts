import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentIntentRequest {
  jobId: string;
  paymentType: 'deposit' | 'balance' | 'full';
  paymentMethodId?: string;
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
    if (!user?.email) throw new Error('User not authenticated');

    const { jobId, paymentType, paymentMethodId }: PaymentIntentRequest = await req.json();

    // Verifica job appartiene all'utente
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*, quotes(*)')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) throw new Error('Job not found');
    if (!job.quotes || job.quotes.length === 0) throw new Error('No quote found for job');

    const quote = job.quotes[0];
    const totalCost = parseFloat(quote.total_cost);

    // Ottieni configurazioni
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('deposit_percentage')
      .single();

    const depositPercentage = settings?.deposit_percentage || 30;

    // Calcola importo
    let amount: number;
    if (paymentType === 'deposit') {
      amount = totalCost * (depositPercentage / 100);
    } else if (paymentType === 'balance') {
      amount = totalCost * ((100 - depositPercentage) / 100);
    } else {
      amount = totalCost;
    }

    const amountCents = Math.round(amount * 100);

    // Inizializza Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Trova o crea customer Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // Crea Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      customer: customerId,
      payment_method: paymentMethodId,
      metadata: {
        job_id: jobId,
        user_id: user.id,
        payment_type: paymentType,
      },
      ...(paymentMethodId && { confirm: true, return_url: `${req.headers.get('origin')}/jobs/${jobId}` }),
    });

    // Salva payment nel database
    const { error: paymentError } = await supabase.from('payments').insert({
      job_id: jobId,
      user_id: user.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: amount,
      payment_type: paymentType,
      status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
      payment_method_id: paymentMethodId || null,
      metadata: { quote_id: quote.id },
    });

    if (paymentError) throw paymentError;

    // Aggiorna stato job
    let newStatus = job.payment_status;
    if (paymentIntent.status === 'succeeded') {
      if (paymentType === 'deposit') {
        newStatus = 'deposit_paid';
      } else if (paymentType === 'balance' || paymentType === 'full') {
        newStatus = 'paid';
      }

      await supabase.from('jobs').update({ payment_status: newStatus }).eq('id', jobId);
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-payment-intent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
