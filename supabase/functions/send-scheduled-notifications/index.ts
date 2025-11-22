import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  tag: string;
  url?: string;
  type: string;
  referenceId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const notifications: NotificationPayload[] = [];
    const now = new Date();

    // 1. PROMEMORIA APPUNTAMENTI (24h e 2h prima)
    const { data: upcomingJobs } = await supabase
      .from('jobs')
      .select('id, user_id, scheduled_date, status')
      .eq('status', 'confirmed')
      .not('scheduled_date', 'is', null)
      .gte('scheduled_date', now.toISOString())
      .lte('scheduled_date', new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString());

    for (const job of upcomingJobs || []) {
      const timeUntil = new Date(job.scheduled_date).getTime() - now.getTime();
      const hoursUntil = timeUntil / (1000 * 60 * 60);

      // Check se già inviata notifica
      const { data: existing } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('user_id', job.user_id)
        .eq('notification_type', hoursUntil <= 2 ? 'reminder_2h' : 'reminder_24h')
        .eq('reference_id', job.id)
        .single();

      if (!existing) {
        if (hoursUntil <= 2 && hoursUntil > 1.5) {
          notifications.push({
            userId: job.user_id,
            title: '⏰ Promemoria Appuntamento',
            body: 'Il tuo tecnico arriverà tra 2 ore!',
            tag: `reminder-2h-${job.id}`,
            url: `/jobs/${job.id}`,
            type: 'reminder_2h',
            referenceId: job.id,
          });
        } else if (hoursUntil <= 24 && hoursUntil > 23) {
          notifications.push({
            userId: job.user_id,
            title: '📅 Promemoria Appuntamento',
            body: 'Domani arriverà il tecnico per il tuo intervento',
            tag: `reminder-24h-${job.id}`,
            url: `/jobs/${job.id}`,
            type: 'reminder_24h',
            referenceId: job.id,
          });
        }
      }
    }

    // 2. RICHIESTA RECENSIONE (lavori completati senza recensione)
    const { data: completedJobs } = await supabase
      .from('jobs')
      .select('id, user_id, completion_date, user_rating')
      .eq('status', 'completed')
      .is('user_rating', null)
      .gte('completion_date', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lte('completion_date', new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString());

    for (const job of completedJobs || []) {
      const { data: existing } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('user_id', job.user_id)
        .eq('notification_type', 'review_request')
        .eq('reference_id', job.id)
        .single();

      if (!existing) {
        notifications.push({
          userId: job.user_id,
          title: '⭐ Come è andato il lavoro?',
          body: 'Lascia una recensione e aiuta altri utenti!',
          tag: `review-${job.id}`,
          url: `/jobs/${job.id}`,
          type: 'review_request',
          referenceId: job.id,
        });
      }
    }

    // 3. OFFERTE SPECIALI (utenti inattivi)
    const { data: activeOffers } = await supabase
      .from('special_offers')
      .select('*')
      .eq('active', true)
      .lte('valid_from', now.toISOString())
      .gte('valid_until', now.toISOString());

    for (const offer of activeOffers || []) {
      // Trova utenti inattivi che non hanno ricevuto questa offerta
      const { data: inactiveUsers } = await supabase
        .from('profiles')
        .select('id')
        .not('id', 'in', 
          supabase.from('user_offers').select('user_id').eq('offer_id', offer.id)
        );

      for (const user of inactiveUsers || []) {
        // Verifica ultimo job
        const { data: lastJob } = await supabase
          .from('jobs')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const daysSinceLastJob = lastJob 
          ? (now.getTime() - new Date(lastJob.created_at).getTime()) / (1000 * 60 * 60 * 24)
          : 999;

        if (daysSinceLastJob >= (offer.target_inactive_days || 30)) {
          notifications.push({
            userId: user.id,
            title: `🎁 ${offer.title}`,
            body: offer.description,
            tag: `offer-${offer.id}`,
            url: '/diagnose',
            type: 'special_offer',
            referenceId: offer.id,
          });

          // Registra invio offerta
          await supabase.from('user_offers').insert({
            user_id: user.id,
            offer_id: offer.id,
          });
        }
      }
    }

    // INVIA TUTTE LE NOTIFICHE
    const results = await Promise.all(
      notifications.map(async (notif) => {
        try {
          // Log notifica
          await supabase.from('notification_logs').insert({
            user_id: notif.userId,
            notification_type: notif.type,
            reference_id: notif.referenceId,
          });

          // Invia notifica push (tramite canale realtime)
          await supabase.from('notification_triggers').insert({
            user_id: notif.userId,
            title: notif.title,
            body: notif.body,
            tag: notif.tag,
            url: notif.url,
          });

          return { success: true, userId: notif.userId };
        } catch (error) {
          console.error('Error sending notification:', error);
          return { success: false, error, userId: notif.userId };
        }
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-scheduled-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
