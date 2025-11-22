import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@18.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessRefundRequest {
  jobId: string;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');

    const { jobId, reason }: ProcessRefundRequest = await req.json();

    // Verifica job appartiene all'utente
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('*, payments(*)')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) throw new Error('Job not found');
    if (!job.scheduled_date) throw new Error('Job has no scheduled date');

    // Trova pagamento anticipo
    const depositPayment = job.payments?.find(
      (p: any) => p.payment_type === 'deposit' && p.status === 'succeeded'
    );

    if (!depositPayment) {
      throw new Error('No deposit payment found');
    }

    // Calcola ore mancanti all'appuntamento
    const scheduledDate = new Date(job.scheduled_date);
    const now = new Date();
    const hoursUntil = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Ottieni configurazioni
    const { data: settings } = await supabaseAdmin
      .from('payment_settings')
      .select('*')
      .single();

    const refund24h = settings?.refund_24h_percentage || 0;
    const refund48h = settings?.refund_48h_percentage || 50;
    const refund72h = settings?.refund_72h_percentage || 100;

    // Determina percentuale rimborso
    let refundPercentage = 0;
    let refundType = 'cancellation_24h';
    
    if (hoursUntil >= 72) {
      refundPercentage = refund72h;
      refundType = 'cancellation_72h';
    } else if (hoursUntil >= 48) {
      refundPercentage = refund48h;
      refundType = 'cancellation_48h';
    } else if (hoursUntil >= 24) {
      refundPercentage = refund24h;
      refundType = 'cancellation_24h';
    }

    if (refundPercentage === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Cancellazione troppo vicina all\'appuntamento. Nessun rimborso disponibile.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refundAmount = parseFloat(depositPayment.amount) * (refundPercentage / 100);
    const refundAmountCents = Math.round(refundAmount * 100);

    // Inizializza Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Crea rimborso su Stripe
    const refund = await stripe.refunds.create({
      payment_intent: depositPayment.stripe_payment_intent_id,
      amount: refundAmountCents,
      reason: 'requested_by_customer',
      metadata: {
        job_id: jobId,
        cancellation_reason: reason,
        refund_percentage: refundPercentage.toString(),
      },
    });

    // Salva nel database
    const { error: refundError } = await supabaseAdmin.from('refunds').insert({
      payment_id: depositPayment.id,
      job_id: jobId,
      stripe_refund_id: refund.id,
      amount: refundAmount,
      reason: reason,
      refund_type: refundType,
      status: refund.status === 'succeeded' ? 'succeeded' : 'processing',
      completed_at: refund.status === 'succeeded' ? new Date().toISOString() : null,
    });

    if (refundError) throw refundError;

    // Aggiorna stato pagamento
    const newStatus = refundPercentage === 100 ? 'refunded' : 'partially_refunded';
    await supabaseAdmin
      .from('payments')
      .update({ status: newStatus })
      .eq('id', depositPayment.id);

    // Aggiorna job
    await supabaseAdmin
      .from('jobs')
      .update({ 
        payment_status: newStatus,
        status: 'cancelled',
        cancellation_reason: reason 
      })
      .eq('id', jobId);

    return new Response(
      JSON.stringify({
        success: true,
        refund: {
          amount: refundAmount,
          percentage: refundPercentage,
          type: refundType,
          status: refund.status,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-refund:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
