/**
 * Optional "rewrite the message" helper in the editor, powered by Claude.
 * Enabled only when ANTHROPIC_API_KEY is set; the host's text is sent to the Claude API.
 */
import Anthropic from '@anthropic-ai/sdk';
import { EVENT_BY_ID } from './config';
import { LIMITS, displayNames } from './model';
import type { Env, EventType, InviteData } from './types';
import { formatDateLong } from './util';

const MODEL = 'claude-opus-5-5';

export const AI_TONES = {
  formale: { label: 'Più elegante', ask: 'Rewrite it in a formal, elegant tone, like a classic printed invitation.' },
  semplice: { label: 'Più semplice', ask: 'Rewrite it in simple, warm, everyday Italian: short sentences that grandparents read easily.' },
  simpatico: { label: 'Più simpatico', ask: 'Rewrite it in a light, friendly and playful tone, without becoming silly.' },
  breve: { label: 'Più breve', ask: 'Shorten it to one or two sentences, keeping its meaning.' },
  nuovo: { label: 'Scrivilo tu', ask: 'Write a new message from scratch for this event: two or three warm sentences.' },
} as const;

export type AiTone = keyof typeof AI_TONES;
export const isAiTone = (v: unknown): v is AiTone => typeof v === 'string' && v in AI_TONES;
export const aiConfigured = (env: Env) => Boolean(env.ANTHROPIC_API_KEY);

const SYSTEM = `You write the short message printed on Italian digital invitations (weddings, christenings, birthdays, parties).
Reply with the message only, in Italian: no title, no quotation marks, no comments, no markdown.
Keep names, dates, places and facts exactly as given and never invent new ones (times, places, gifts, menus).
Do not add emoji unless the original text has them. At most ${LIMITS.message} characters.`;

export type AiResult = { ok: true; text: string } | { ok: false; error: string; status: 422 | 429 | 502 | 503 };

export async function rewriteMessage(env: Env, eventType: EventType, d: InviteData, text: string, tone: AiTone): Promise<AiResult> {
  const ev = EVENT_BY_ID[eventType];
  const facts = [`Occasion: ${ev.label}`, `Who: ${displayNames(d, ' e ')}`, d.date ? `Date: ${formatDateLong(d.date)}` : ''].filter(Boolean).join('\n');
  const current = text.trim() ? `\n\nCurrent message:\n<message>\n${text.trim()}\n</message>` : '';
  const ask = text.trim() ? AI_TONES[tone].ask : AI_TONES.nuovo.ask;

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_API_BASE || undefined, maxRetries: 1, timeout: 30_000 });
  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // on a policy decline the API retries on Anthropic's recommended fallback model
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [{ role: 'user', content: `${facts}${current}\n\n${ask}` }],
    });
    if (res.stop_reason === 'refusal') return { ok: false, error: 'Non riesco a riscrivere questo testo: prova a cambiarlo un po’.', status: 422 };
    if (res.stop_reason === 'max_tokens') return { ok: false, error: 'Il testo è troppo lungo da riscrivere: accorcialo un po’.', status: 422 };
    const out = res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim()
      .replace(/^["“«]+|["”»]+$/g, '')
      .trim()
      .slice(0, LIMITS.message);
    if (!out) return { ok: false, error: 'Nessun testo ricevuto: riprova.', status: 502 };
    return { ok: true, text: out };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: 'Il servizio è molto richiesto in questo momento: riprova tra un minuto.', status: 429 };
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      console.error('anthropic: invalid API key', e.status);
      return { ok: false, error: 'I testi automatici non sono disponibili al momento.', status: 503 };
    }
    if (e instanceof Anthropic.APIConnectionError) return { ok: false, error: 'Servizio non raggiungibile: riprova tra poco.', status: 503 };
    if (e instanceof Anthropic.APIError) {
      console.error('anthropic error', e.status, e.message);
      return { ok: false, error: 'Qualcosa non ha funzionato: riprova tra poco.', status: 502 };
    }
    throw e;
  }
}
