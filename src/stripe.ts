/**
 * Minimal Stripe client (REST + fetch), no SDK needed on Workers.
 * Docs: https://docs.stripe.com/api/checkout/sessions
 */
import type { Env } from './types';
import { timingSafeEqual } from './util';

export interface CheckoutSession {
  id: string;
  url: string | null;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  status: 'open' | 'complete' | 'expired';
  amount_total: number | null;
  client_reference_id: string | null;
  metadata: Record<string, string> | null;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
}

const apiBase = (env: Env) => (env.STRIPE_API_BASE || 'https://api.stripe.com').replace(/\/$/, '');

/** Flattens {a: {b: 1}} into Stripe's form encoding a[b]=1 */
function formEncode(obj: Record<string, unknown>, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === 'object' ? formEncode(item as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === 'object') formEncode(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripeFetch<T>(env: Env, method: 'GET' | 'POST', path: string, body?: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    'Stripe-Version': '2025-08-27.basil',
  };
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`${apiBase(env)}${path}`, { method, headers, body: body ? formEncode(body).toString() : undefined });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${json.error?.message ?? 'errore sconosciuto'}`);
  return json as T;
}

export const stripeConfigured = (env: Env) => Boolean(env.STRIPE_SECRET_KEY);

export async function createCheckoutSession(
  env: Env,
  o: { invitationId: string; amountCents: number; productName: string; description: string; successUrl: string; cancelUrl: string; email?: string | null },
): Promise<CheckoutSession> {
  return stripeFetch<CheckoutSession>(env, 'POST', '/v1/checkout/sessions', {
    mode: 'payment',
    locale: 'it',
    success_url: o.successUrl,
    cancel_url: o.cancelUrl,
    client_reference_id: o.invitationId,
    customer_email: o.email || undefined,
    allow_promotion_codes: true,
    metadata: { invitation_id: o.invitationId },
    payment_intent_data: { metadata: { invitation_id: o.invitationId }, description: o.productName },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: o.amountCents,
          product_data: { name: o.productName, description: o.description },
        },
      },
    ],
  });
}

export async function retrieveCheckoutSession(env: Env, id: string): Promise<CheckoutSession> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) throw new Error('Sessione non valida');
  return stripeFetch<CheckoutSession>(env, 'GET', `/v1/checkout/sessions/${id}`);
}

export const sessionIsPaid = (s: CheckoutSession) => s.payment_status === 'paid' || s.payment_status === 'no_payment_required';

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Verifies the Stripe-Signature header (v1 scheme, 5 minutes tolerance). */
export async function verifyWebhook(secret: string, payload: string, header: string | null | undefined, toleranceSec = 300): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(',').map((p) => p.trim().split('='));
  const timestamp = parts.find(([k]) => k === 't')?.[1];
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!timestamp || !signatures.length) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > toleranceSec) return false;
  const expected = await hmacHex(secret, `${timestamp}.${payload}`);
  return signatures.some((s) => timingSafeEqual(s, expected));
}

/** Exposed for tests: produces a valid Stripe-Signature header. */
export async function signWebhook(secret: string, payload: string, timestamp = Math.floor(Date.now() / 1000)): Promise<string> {
  return `t=${timestamp},v1=${await hmacHex(secret, `${timestamp}.${payload}`)}`;
}
