/**
 * Transactional emails through Resend (https://resend.com, free tier: 3.000 email/mese).
 * Without RESEND_API_KEY emails are skipped and logged, so the product still works.
 */
import { BRAND, EVENT_BY_ID } from './config';
import { displayNames } from './model';
import type { Env, Invitation, InvitationRow, RsvpRow } from './types';
import { formatDateLong } from './util';

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="it"><body style="margin:0;background:#f6f1ea;font-family:Helvetica,Arial,sans-serif;color:#2a2223">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;padding:32px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 20px;font-size:20px;font-weight:bold;color:#b8475f">🍬 ${esc(BRAND.name)}</p>
<h1 style="font-size:22px;margin:0 0 16px">${esc(title)}</h1>
${bodyHtml}
<p style="margin:28px 0 0;font-size:12px;color:#8a7f80">Hai ricevuto questa email perché hai creato un invito su ${esc(BRAND.name)}. Per assistenza rispondi a questa email.</p>
</td></tr></table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="background:#b8475f;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:bold;display:inline-block">${esc(label)}</a></p>`;

async function send(env: Env, to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.log(`[email skipped: RESEND_API_KEY non impostata] to=${to} subject=${subject}`);
    return false;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM || `${BRAND.name} <onboarding@resend.dev>`, to, subject, html, text, reply_to: BRAND.supportEmail }),
  });
  if (!res.ok) console.error('Resend error', res.status, await res.text());
  return res.ok;
}

export function sendAdminLink(env: Env, inv: Invitation, origin: string) {
  const url = `${origin}/gestisci/${inv.admin_token}`;
  const names = displayNames(inv.data);
  return send(
    env,
    inv.email!,
    `Il link per gestire il tuo invito (${names})`,
    layout(
      'Ecco il tuo invito',
      `<p>Da questo link puoi modificare l'invito di <strong>${esc(names)}</strong>, vedere chi ha confermato e mandarlo su WhatsApp.</p>${button(url, 'Gestisci il tuo invito')}<p style="font-size:13px;color:#6b6162">Conserva questa email: il link è personale, non condividerlo con gli invitati.</p>`,
    ),
    `Gestisci il tuo invito (${names}): ${url}\nConserva questo link, è personale.`,
  );
}

export function sendActivated(env: Env, inv: Invitation, origin: string, publicUrl: string) {
  const url = `${origin}/gestisci/${inv.admin_token}`;
  const names = displayNames(inv.data);
  return send(
    env,
    inv.email!,
    `Il tuo invito è online! 🎉`,
    layout(
      'Il tuo invito è online!',
      `<p>Grazie! L'invito di <strong>${esc(names)}</strong> è attivo. Questo è il link da mandare agli invitati:</p><p style="font-size:16px"><a href="${esc(publicUrl)}">${esc(publicUrl)}</a></p>${button(url, 'Vai alla tua dashboard')}<p style="font-size:13px;color:#6b6162">Dalla dashboard puoi creare i link personalizzati per ogni invitato e vedere in tempo reale chi ha risposto.</p>`,
    ),
    `Il tuo invito è online: ${publicUrl}\nDashboard: ${url}`,
  );
}

export function sendRsvpNotification(env: Env, inv: Invitation, rsvp: RsvpRow, origin: string, stats: { people: number }) {
  const url = `${origin}/gestisci/${inv.admin_token}`;
  const ev = EVENT_BY_ID[inv.event_type];
  const what = rsvp.attending ? `ci sarà (${rsvp.adults + rsvp.children} ${rsvp.adults + rsvp.children === 1 ? 'persona' : 'persone'})` : 'non potrà esserci';
  const extra = [
    rsvp.diet ? `<p><strong>Esigenze alimentari:</strong> ${esc(rsvp.diet)}</p>` : '',
    rsvp.answer ? `<p><strong>${esc(inv.data.customQuestion)}</strong> ${esc(rsvp.answer)}</p>` : '',
    rsvp.message ? `<p style="background:#faf5ef;border-radius:12px;padding:12px 14px;font-style:italic">“${esc(rsvp.message)}”</p>` : '',
  ].join('');
  return send(
    env,
    inv.email!,
    `${rsvp.name} ${what}`,
    layout(
      `${rsvp.name} ${what}`,
      `<p>Nuova risposta all'invito ${esc(ev.eventPhrase(inv.data))}.</p>${extra}<p>Totale confermati finora: <strong>${stats.people}</strong>.</p>${button(url, 'Vedi tutte le risposte')}`,
    ),
    `${rsvp.name} ${what}. Totale confermati: ${stats.people}. Dashboard: ${url}`,
  );
}

export function sendRecovery(env: Env, email: string, invitations: InvitationRow[], origin: string, parse: (r: InvitationRow) => Invitation) {
  const items = invitations
    .map((r) => {
      const inv = parse(r);
      return `<li style="margin:0 0 12px"><a href="${esc(`${origin}/gestisci/${r.admin_token}`)}">${esc(displayNames(inv.data))}</a> · ${esc(EVENT_BY_ID[r.event_type].label)} · ${esc(formatDateLong(inv.data.date))}</li>`;
    })
    .join('');
  return send(
    env,
    email,
    'I tuoi inviti',
    layout('Ecco i tuoi inviti', `<p>Questi sono gli inviti collegati alla tua email:</p><ul style="padding-left:18px">${items}</ul>`),
    invitations.map((r) => `${origin}/gestisci/${r.admin_token}`).join('\n'),
  );
}
