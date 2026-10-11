/**
 * Optional Telegram bot: the host links a chat once and receives every new answer there.
 * Setup (once): create a bot with @BotFather, then set TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_NAME and
 * TELEGRAM_WEBHOOK_SECRET, and register the webhook (see README).
 */
import { EVENT_BY_ID } from './config';
import { displayNames, parsePeople } from './model';
import type { Env, Invitation, RsvpRow } from './types';

export const telegramConfigured = (env: Env) => Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_NAME && env.TELEGRAM_WEBHOOK_SECRET);

export async function sendTelegram(env: Env, chatId: string, text: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  const base = (env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/$/, '');
  const res = await fetch(`${base}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!res.ok) console.error('telegram sendMessage failed', res.status, await res.text().catch(() => ''));
}

/** The message never contains the management link (a chat can be read by others): at most the read-only one. */
export function rsvpTelegramText(inv: Invitation, r: RsvpRow, readOnlyUrl: string | null): string {
  const ev = EVENT_BY_ID[inv.event_type];
  const lines = [`Nuova risposta per ${ev.label.toLowerCase()} · ${displayNames(inv.data)}`, ''];
  if (r.attending) {
    const people = parsePeople(r.people);
    lines.push(`✅ ${r.name} ci sarà: ${r.adults} ${r.adults === 1 ? 'adulto' : 'adulti'}${r.children ? `, ${r.children} ${r.children === 1 ? 'bambino' : 'bambini'}` : ''}`);
    for (const p of people) if (p.name || p.menu) lines.push(`• ${[p.name, p.menu].filter(Boolean).join(' · ')}`);
    if (r.diet) lines.push(`Allergie: ${r.diet}`);
    if (r.answer) lines.push(`${inv.data.customQuestion} ${r.answer}`);
    if (r.song) lines.push(`Canzone: ${r.song}`);
  } else {
    lines.push(`❌ ${r.name} non potrà esserci`);
  }
  if (r.message) lines.push('', `“${r.message}”`);
  lines.push('', readOnlyUrl ? `Tutte le risposte: ${readOnlyUrl}` : 'Tutte le risposte sono nel pannello del tuo invito.');
  return lines.join('\n');
}
