import { Hono, type Context } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { HTTPException } from 'hono/http-exception';
import { html } from 'hono/html';
import type { JSX } from 'hono/jsx/jsx-runtime';
import { icsFile } from './calendar';
import { BRAND, EVENTS, EVENT_BY_ID, EVENT_BY_SLUG, defaultInviteData, isEventType, priceFor } from './config';
import * as db from './db';
import { demoInvitation } from './demo';
import { sendActivated, sendAdminLink, sendRecovery, sendRsvpNotification } from './email';
import { displayNames, parseInvitation, publicPath, sanitizeInviteData, sanitizeTheme } from './model';
import { createCheckoutSession, retrieveCheckoutSession, sessionIsPaid, stripeConfigured, verifyWebhook, type CheckoutSession } from './stripe';
import { THEMES, isTheme } from './themes';
import type { Env, GuestRow, Invitation } from './types';
import { clampInt, daysUntil, isBot, isEmail, sha256Hex, str } from './util';
import { CreatePage } from './views/create';
import { DashboardPage } from './views/dashboard';
import { EditorPage } from './views/editor';
import { InvitePage } from './views/invite';
import { LandingPage } from './views/landing';
import { AdminPage, ErrorPage, EventLandingPage, NotFoundPage, PhrasesPage, PrivacyPage, RecoverPage, TermsPage } from './views/pages';

type App = { Bindings: Env };
type Ctx = Context<App>;

const app = new Hono<App>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const render = (c: Ctx, node: JSX.Element, status: 200 | 404 | 500 | 403 | 400 = 200) => c.html(html`<!doctype html>${node}`, status);
const originOf = (c: Ctx) => (c.env.PUBLIC_URL || new URL(c.req.url).origin).replace(/\/$/, '');
const notFound = (c: Ctx) => render(c, <NotFoundPage />, 404);

async function clientKey(c: Ctx): Promise<string> {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  return (await sha256Hex(`confetto:${ip}`)).slice(0, 24);
}

function waitUntil(c: Ctx, p: Promise<unknown>) {
  try {
    c.executionCtx.waitUntil(p.catch((e) => console.error('background task failed', e)));
  } catch {
    // no execution context (tests): run detached
    p.catch((e) => console.error('background task failed', e));
  }
}

/** Is the RSVP form accepting answers? */
function rsvpState(inv: Invitation): { open: boolean; reason?: string } {
  if (inv.status !== 'active') return { open: false, reason: 'Le conferme si attiveranno quando l’invito sarà pubblicato.' };
  if (daysUntil(inv.data.date) < -1) return { open: false, reason: 'L’evento è passato: le risposte sono chiuse. Grazie a tutti!' };
  return { open: true };
}

const FLASH: Record<string, { kind: 'ok' | 'err' | 'info'; text: string }> = {
  pagato: { kind: 'ok', text: '🎉 Fatto! Il tuo invito è online. Ora mandalo ai tuoi invitati.' },
  annullato: { kind: 'info', text: 'Pagamento annullato. Puoi pubblicare l’invito quando vuoi.' },
  'in-attesa': { kind: 'info', text: 'Stiamo aspettando la conferma del pagamento da Stripe: aggiorna la pagina tra qualche secondo.' },
  email: { kind: 'ok', text: 'Email salvata. Ti abbiamo mandato il link di questa pagina.' },
  'email-salvata': { kind: 'ok', text: 'Email salvata.' },
  'email-non-valida': { kind: 'err', text: 'Controlla l’indirizzo email: sembra non essere valido.' },
  consenso: { kind: 'err', text: 'Per pubblicare devi spuntare la richiesta di attivazione immediata.' },
  invitati: { kind: 'ok', text: 'Invitati aggiunti. Ora mandagli il loro link personale su WhatsApp.' },
  'nessun-invitato': { kind: 'err', text: 'Scrivi almeno un nome.' },
  'troppi-invitati': { kind: 'err', text: `Hai raggiunto il limite di ${db.MAX_GUESTS_PER_INVITATION} invitati.` },
  'invitato-rimosso': { kind: 'ok', text: 'Invitato rimosso dalla lista.' },
  'risposta-eliminata': { kind: 'ok', text: 'Risposta eliminata.' },
  'pagamenti-off': { kind: 'err', text: 'I pagamenti non sono ancora configurati su questo sito (manca STRIPE_SECRET_KEY).' },
  'errore-pagamento': { kind: 'err', text: 'Non siamo riusciti ad aprire la pagina di pagamento. Riprova tra poco.' },
};

const redirectDash = (c: Ctx, inv: Invitation, msg?: string, hash = '') =>
  c.redirect(`/gestisci/${inv.admin_token}${msg ? `?msg=${msg}` : ''}${hash}`, 303);

async function loadByToken(c: Ctx): Promise<Invitation | null> {
  return db.getByToken(c.env.DB, c.req.param('token') ?? '');
}

/** Shared by the webhook and the success redirect. Returns true when the invitation is (now) active. */
async function completeCheckout(c: Ctx, inv: Invitation, session: CheckoutSession): Promise<boolean> {
  const invId = session.metadata?.invitation_id || session.client_reference_id;
  if (invId !== inv.id || !sessionIsPaid(session)) return false;
  const email = (session.customer_details?.email ?? session.customer_email ?? null)?.toLowerCase() ?? null;
  const amount = session.amount_total ?? 0;
  await db.markOrderPaid(c.env.DB, session.id, amount, email, inv.id);
  const firstTime = await db.activate(c.env.DB, inv, { amountCents: amount, sessionId: session.id, email });
  if (firstTime) {
    const fresh = await db.getById(c.env.DB, inv.id);
    if (fresh?.email) {
      const origin = originOf(c);
      waitUntil(c, sendActivated(c.env, fresh, origin, origin + publicPath(fresh)));
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

/** Marketing pages get (optional, cookieless) Cloudflare Web Analytics; guests' invitations never do. */
const isMarketingPath = (p: string) => !/^\/(i|gestisci|admin|api|media|demo)(\/|$)/.test(p);

app.use('*', async (c, next) => {
  await next();
  const path = c.req.path;
  const isHtml = (c.res.headers.get('content-type') ?? '').includes('text/html');
  const analytics = isHtml && c.env.CF_ANALYTICS_TOKEN && isMarketingPath(path) ? c.env.CF_ANALYTICS_TOKEN : '';
  if (analytics) {
    const tag = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: analytics })}'></script>`;
    c.res = new HTMLRewriter()
      .on('body', {
        element(el) {
          el.append(tag, { html: true });
        },
      })
      .transform(c.res);
  }
  const h = c.res.headers;
  if (isHtml) {
    let stripeOrigin = 'https://checkout.stripe.com';
    if (c.env.STRIPE_API_BASE) stripeOrigin += ` ${new URL(c.env.STRIPE_API_BASE).origin}`;
    const scriptSrc = analytics ? "'self' https://static.cloudflareinsights.com" : "'self'";
    const connectSrc = analytics ? "'self' https://cloudflareinsights.com" : "'self'";
    h.set(
      'Content-Security-Policy',
      `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src ${scriptSrc}; font-src 'self'; connect-src ${connectSrc}; frame-src 'self'; frame-ancestors 'self'; form-action 'self' ${stripeOrigin}; base-uri 'none'; object-src 'none'`,
    );
  }
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'SAMEORIGIN');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  const privateArea = path.startsWith('/gestisci') || path.startsWith('/admin');
  h.set('Referrer-Policy', privateArea ? 'no-referrer' : 'strict-origin-when-cross-origin');
  if (privateArea || path.startsWith('/i/')) {
    h.set('X-Robots-Tag', 'noindex, nofollow');
    h.set('Cache-Control', 'no-store');
  }
});

// ---------------------------------------------------------------------------
// Marketing & SEO pages
// ---------------------------------------------------------------------------

app.get('/', (c) => render(c, <LandingPage origin={originOf(c)} />));

app.get('/crea', (c) => render(c, <CreatePage origin={originOf(c)} preselect={c.req.query('tipo')} />));

app.post('/crea', async (c) => {
  const form = await c.req.parseBody();
  const type = form.type;
  if (!isEventType(type)) return c.redirect('/crea', 303);
  if (!(await db.rateLimit(c.env.DB, `create:${await clientKey(c)}`, 30, 3600)))
    return render(c, <ErrorPage text="Hai creato molti inviti in poco tempo. Riprova tra un’ora." />, 400);
  const row = await db.createInvitation(c.env.DB, type, EVENT_BY_ID[type].theme, defaultInviteData(type));
  return c.redirect(`/gestisci/${row.admin_token}/modifica?nuovo=1`, 303);
});

app.get('/inviti/:slug', (c) => {
  const ev = EVENT_BY_SLUG[c.req.param('slug')];
  return ev ? render(c, <EventLandingPage ev={ev} origin={originOf(c)} />) : notFound(c);
});

app.get('/frasi/:slug', (c) => {
  const ev = EVENT_BY_SLUG[c.req.param('slug')];
  return ev ? render(c, <PhrasesPage ev={ev} origin={originOf(c)} />) : notFound(c);
});

app.get('/demo/:theme', (c) => {
  const theme = c.req.param('theme');
  if (!isTheme(theme)) return notFound(c);
  const ev = c.req.query('ev');
  const inv = demoInvitation(theme, isEventType(ev) ? ev : undefined);
  if (c.req.query('og') === '1') {
    // Used by scripts/og-images.mjs: generic envelope without demo names.
    inv.data = { ...inv.data, name1: '♥', name2: '' };
  }
  const res = render(
    c,
    <InvitePage inv={inv} mode="demo" origin={originOf(c)} basePath={`/demo/${theme}`} showEnvelope={c.req.query('busta') !== '0'} rsvp={{ open: true }} />,
  );
  return res;
});

app.get('/demo/:theme/calendario.ics', (c) => {
  const theme = c.req.param('theme');
  if (!isTheme(theme)) return notFound(c);
  return calendarResponse(c, demoInvitation(theme), `/demo/${theme}`);
});

app.get('/privacy', (c) => render(c, <PrivacyPage />));
app.get('/termini', (c) => render(c, <TermsPage />));

app.get('/recupera', (c) => render(c, <RecoverPage sent={c.req.query('inviato') === '1'} emailEnabled={Boolean(c.env.RESEND_API_KEY)} />));

app.post('/recupera', async (c) => {
  const form = await c.req.parseBody();
  const email = str(form.email, 200).toLowerCase();
  if (isEmail(email)) {
    const allowed =
      (await db.rateLimit(c.env.DB, `recover-ip:${await clientKey(c)}`, 10, 3600)) &&
      (await db.rateLimit(c.env.DB, `recover:${await sha256Hex(email)}`, 3, 3600));
    if (allowed) {
      const rows = await db.invitationsByEmail(c.env.DB, email);
      if (rows.length) waitUntil(c, sendRecovery(c.env, email, rows, originOf(c), parseInvitation));
    }
  }
  return c.redirect('/recupera?inviato=1', 303);
});

app.get('/robots.txt', (c) =>
  c.text(`User-agent: *\nDisallow: /gestisci/\nDisallow: /i/\nDisallow: /admin\nDisallow: /api/\nDisallow: /media/\n\nSitemap: ${originOf(c)}/sitemap.xml\n`),
);

app.get('/sitemap.xml', (c) => {
  const o = originOf(c);
  const urls = ['/', '/crea', ...EVENTS.map((e) => `/inviti/${e.slug}`), ...EVENTS.map((e) => `/frasi/${e.slug}`), ...THEMES.map((t) => `/demo/${t.id}`), '/privacy', '/termini'];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${o}${u}</loc></url>`).join('')}</urlset>`;
  return c.body(body, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

// ---------------------------------------------------------------------------
// Public invitation
// ---------------------------------------------------------------------------

async function renderPublic(c: Ctx, inv: Invitation, guest: GuestRow | null) {
  const guestRsvp = guest ? await db.getRsvpByGuest(c.env.DB, guest.id) : null;
  return render(
    c,
    <InvitePage inv={inv} mode="live" origin={originOf(c)} basePath={publicPath(inv)} guest={guest} guestRsvp={guestRsvp} showEnvelope rsvp={rsvpState(inv)} />,
  );
}

function calendarResponse(c: Ctx, inv: Invitation, basePath: string) {
  const d = inv.data;
  const ev = EVENT_BY_ID[inv.event_type];
  const names = displayNames(d);
  const body = icsFile({
    uid: `${inv.id}@confetto`,
    title: `${ev.label}: ${names}`,
    date: d.date,
    time: d.time,
    durationMin: 300,
    location: [d.program[0]?.place, d.program[0]?.address].filter(Boolean).join(', '),
    details: d.eyebrow ? `${d.eyebrow} ${names}` : names,
    url: originOf(c) + basePath,
  });
  return c.body(body, 200, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'attachment; filename="invito.ics"',
  });
}

app.get('/i/:id', async (c) => {
  const inv = await db.getByPublicId(c.env.DB, c.req.param('id'));
  return inv ? renderPublic(c, inv, null) : notFound(c);
});

app.get('/i/:id/calendario.ics', async (c) => {
  const inv = await db.getByPublicId(c.env.DB, c.req.param('id'));
  return inv ? calendarResponse(c, inv, publicPath(inv)) : notFound(c);
});

app.get('/i/:id/:code', async (c) => {
  const inv = await db.getByPublicId(c.env.DB, c.req.param('id'));
  if (!inv) return notFound(c);
  const guest = await db.getGuestByCode(c.env.DB, inv.id, c.req.param('code'));
  return renderPublic(c, inv, guest);
});

app.post('/i/:id/rsvp', async (c) => {
  const inv = await db.getByPublicId(c.env.DB, c.req.param('id'));
  if (!inv) return c.json({ ok: false, error: 'Invito non trovato.' }, 404);
  const state = rsvpState(inv);
  if (!state.open) return c.json({ ok: false, error: state.reason }, 403);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'Richiesta non valida.' }, 400);
  }
  // Honeypot: bots fill every field. Pretend everything went fine.
  if (str(body.website, 100)) return c.json({ ok: true, id: 'ok', editToken: 'ok' });
  if (!(await db.rateLimit(c.env.DB, `rsvp:${await clientKey(c)}:${inv.id}`, 20, 600)))
    return c.json({ ok: false, error: 'Troppe risposte in poco tempo. Riprova tra qualche minuto.' }, 429);

  const name = str(body.name, 80);
  if (!name) return c.json({ ok: false, error: 'Scrivi il tuo nome.' }, 400);
  const attending = body.attending === 'yes' || body.attending === true;
  if (!attending && body.attending !== 'no' && body.attending !== false) return c.json({ ok: false, error: 'Dicci se ci sarai.' }, 400);

  const guest = str(body.guestCode, 12) ? await db.getGuestByCode(c.env.DB, inv.id, str(body.guestCode, 12)) : null;
  let adults = attending ? clampInt(body.adults, 0, 20, 1) : 0;
  let children = attending && inv.data.askChildren ? clampInt(body.children, 0, 20, 0) : 0;
  if (attending && guest && guest.seats > 0 && adults + children > guest.seats) {
    children = Math.max(0, Math.min(children, guest.seats - 1));
    adults = Math.max(1, guest.seats - children);
  }
  if (attending && adults + children === 0) adults = 1;

  const result = await db.upsertRsvp(
    c.env.DB,
    inv.id,
    {
      name,
      attending,
      adults,
      children,
      diet: attending && inv.data.askDiet ? str(body.diet, 300) : '',
      answer: attending && inv.data.customQuestion ? str(body.answer, 200) : '',
      message: str(body.message, 600),
    },
    { guest, id: str(body.id, 20), editToken: str(body.editToken, 40) },
  );
  if (!result.ok) return c.json({ ok: false, error: result.error }, 400);

  if (inv.email && inv.notify_rsvp) {
    const all = await db.listRsvps(c.env.DB, inv.id);
    const stats = db.computeStats(all, []);
    waitUntil(c, sendRsvpNotification(c.env, inv, result.row, originOf(c), stats));
  }
  return c.json({ ok: true, id: result.row.id, editToken: result.row.edit_token });
});

app.post('/i/:id/visto', async (c) => {
  if (isBot(c.req.header('user-agent'))) return c.body(null, 204);
  const inv = await db.getByPublicId(c.env.DB, c.req.param('id'));
  if (!inv || inv.status !== 'active') return c.body(null, 204);
  let code = '';
  try {
    code = str(((await c.req.json()) as { code?: unknown }).code, 12);
  } catch {
    code = '';
  }
  if (!(await db.rateLimit(c.env.DB, `view:${await clientKey(c)}:${inv.id}`, 30, 3600))) return c.body(null, 204);
  await db.incrementViews(c.env.DB, inv.id);
  if (code) await db.markGuestOpened(c.env.DB, inv.id, code);
  return c.body(null, 204);
});

app.get('/media/*', async (c) => {
  const key = c.req.path.slice('/media/'.length);
  if (!/^c\/[a-z0-9]+\/[a-z0-9]+\.(jpg|png|webp)$/.test(key)) return notFound(c);
  const obj = await c.env.MEDIA.get(key);
  if (!obj) return notFound(c);
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: obj.httpEtag,
    },
  });
});

// ---------------------------------------------------------------------------
// Host area (secret link)
// ---------------------------------------------------------------------------

app.get('/gestisci/:token', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);

  // Back from Stripe Checkout: confirm the payment right away (the webhook does it too).
  const sessionId = c.req.query('checkout');
  if (sessionId && inv.status === 'draft' && stripeConfigured(c.env)) {
    try {
      const session = await retrieveCheckoutSession(c.env, sessionId);
      const done = await completeCheckout(c, inv, session);
      return redirectDash(c, inv, done ? 'pagato' : 'in-attesa');
    } catch (e) {
      console.error('checkout verification failed', e);
      return redirectDash(c, inv, 'in-attesa');
    }
  }
  if (sessionId) return redirectDash(c, inv, inv.status === 'active' ? 'pagato' : 'in-attesa');

  const [rsvps, guests] = await Promise.all([db.listRsvps(c.env.DB, inv.id), db.listGuests(c.env.DB, inv.id)]);
  const msg = c.req.query('msg');
  let flash = msg ? FLASH[msg] ?? null : null;
  if (msg === 'email' && !c.env.RESEND_API_KEY) flash = FLASH['email-salvata'];
  return render(
    c,
    <DashboardPage
      inv={inv}
      origin={originOf(c)}
      rsvps={rsvps}
      guests={guests}
      stats={db.computeStats(rsvps, guests)}
      flash={flash}
      paymentsReady={stripeConfigured(c.env)}
    />,
  );
});

app.get('/gestisci/:token/modifica', async (c) => {
  const inv = await loadByToken(c);
  return inv ? render(c, <EditorPage inv={inv} isNew={c.req.query('nuovo') === '1'} />) : notFound(c);
});

app.get('/gestisci/:token/anteprima', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  return render(
    c,
    <InvitePage inv={inv} mode="preview" origin={originOf(c)} basePath={publicPath(inv)} showEnvelope={c.req.query('busta') === '1'} rsvp={{ open: true }} />,
  );
});

app.post('/gestisci/:token/salva', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return c.json({ ok: false, error: 'Invito non trovato' }, 404);
  let body: { theme?: unknown; data?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'Dati non validi' }, 400);
  }
  const theme = sanitizeTheme(body.theme, inv.theme);
  const data = sanitizeInviteData(body.data, inv.event_type, inv.data);
  const updatedAt = await db.saveContent(c.env.DB, inv.id, theme, data);
  return c.json({ ok: true, updatedAt });
});

function sniffImage(buf: Uint8Array): { ext: 'jpg' | 'png' | 'webp'; type: string } | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: 'png', type: 'image/png' };
  const ascii = (a: number, b: number) => String.fromCharCode(...buf.slice(a, b));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  return null;
}

app.post('/gestisci/:token/foto', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return c.json({ ok: false, error: 'Invito non trovato' }, 404);
  if (!(await db.rateLimit(c.env.DB, `upload:${inv.id}`, 40, 3600))) return c.json({ ok: false, error: 'Troppi caricamenti, riprova più tardi.' }, 429);
  const MAX = 4 * 1024 * 1024;
  if (Number(c.req.header('content-length') ?? 0) > MAX) return c.json({ ok: false, error: 'La foto è troppo pesante (max 4 MB).' }, 413);
  const buf = new Uint8Array(await c.req.arrayBuffer());
  if (buf.byteLength > MAX) return c.json({ ok: false, error: 'La foto è troppo pesante (max 4 MB).' }, 413);
  const kind = sniffImage(buf);
  if (!kind) return c.json({ ok: false, error: 'Formato non supportato: usa una foto JPG o PNG.' }, 415);
  const key = `c/${inv.id}/${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}.${kind.ext}`;
  await c.env.MEDIA.put(key, buf, { httpMetadata: { contentType: kind.type } });
  if (inv.cover_key) await c.env.MEDIA.delete(inv.cover_key).catch(() => undefined);
  await db.setCover(c.env.DB, inv.id, key);
  return c.json({ ok: true, url: `/media/${key}` });
});

app.post('/gestisci/:token/foto/rimuovi', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return c.json({ ok: false }, 404);
  if (inv.cover_key) await c.env.MEDIA.delete(inv.cover_key).catch(() => undefined);
  await db.setCover(c.env.DB, inv.id, null);
  return c.json({ ok: true });
});

app.post('/gestisci/:token/email', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  const form = await c.req.parseBody();
  const email = str(form.email, 200).toLowerCase();
  const back = form.back === 'modifica' ? `/gestisci/${inv.admin_token}/modifica` : `/gestisci/${inv.admin_token}`;
  if (!isEmail(email)) return c.redirect(`${back}?msg=email-non-valida`, 303);
  const notify = form.notify === 'on' || form.notify === '1';
  await db.setEmail(c.env.DB, inv.id, email, notify);
  if (email !== inv.email && (await db.rateLimit(c.env.DB, `adminlink:${inv.id}`, 5, 3600))) {
    waitUntil(c, sendAdminLink(c.env, { ...inv, email }, originOf(c)));
  }
  return c.redirect(form.back === 'modifica' ? `${back}?msg=email-salvata#email` : `${back}?msg=email`, 303);
});

app.post('/gestisci/:token/attiva', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  if (inv.status === 'active') return redirectDash(c, inv, 'pagato');
  const form = await c.req.parseBody();
  if (form.consenso !== '1' && form.consenso !== 'on') return redirectDash(c, inv, 'consenso', '#pubblica');
  const price = priceFor(inv.event_type);
  const origin = originOf(c);

  if (stripeConfigured(c.env)) {
    try {
      const session = await createCheckoutSession(c.env, {
        invitationId: inv.id,
        amountCents: price.cents,
        productName: `Invito digitale · ${EVENT_BY_ID[inv.event_type].label}`,
        description: `${displayNames(inv.data)} · conferme di presenza illimitate`,
        successUrl: `${origin}/gestisci/${inv.admin_token}?checkout={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/gestisci/${inv.admin_token}?msg=annullato`,
        email: inv.email,
      });
      await db.createOrder(c.env.DB, inv.id, session.id, price.cents, inv.email);
      if (!session.url) throw new Error('Stripe non ha restituito un URL di pagamento');
      return c.redirect(session.url, 303);
    } catch (e) {
      console.error('checkout creation failed', e);
      return redirectDash(c, inv, 'errore-pagamento', '#pubblica');
    }
  }
  if (c.env.ALLOW_FREE_ACTIVATION === 'true') {
    await db.activate(c.env.DB, inv, { amountCents: 0, sessionId: null });
    return redirectDash(c, inv, 'pagato');
  }
  return redirectDash(c, inv, 'pagamenti-off', '#pubblica');
});

function parseGuestLines(text: string): { name: string; seats: number; phone: string | null }[] {
  const out: { name: string; seats: number; phone: string | null }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const parts = raw.split(/[;,\t]/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) continue;
    const name = parts[0].slice(0, 80);
    let seats = 1;
    let phone: string | null = null;
    for (const p of parts.slice(1)) {
      if (/^\d{1,2}$/.test(p)) seats = clampInt(p, 1, 20, 1);
      else if (/^[+\d][\d .\-/]{5,}$/.test(p)) phone = p.replace(/[^\d+ ]/g, '').slice(0, 24);
    }
    if (name) out.push({ name, seats, phone });
  }
  return out;
}

app.post('/gestisci/:token/invitati', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  const form = await c.req.parseBody();
  let rows =
    form.mode === 'bulk'
      ? parseGuestLines(str(form.bulk, 40000))
      : str(form.name, 80)
        ? [{ name: str(form.name, 80), seats: clampInt(form.seats, 1, 20, 1), phone: str(form.phone, 24).replace(/[^\d+ ]/g, '') || null }]
        : [];
  if (!rows.length) return redirectDash(c, inv, 'nessun-invitato', '#invitati');
  const existing = await db.countGuests(c.env.DB, inv.id);
  const room = db.MAX_GUESTS_PER_INVITATION - existing;
  if (room <= 0) return redirectDash(c, inv, 'troppi-invitati', '#invitati');
  rows = rows.slice(0, room);
  for (let i = 0; i < rows.length; i += 50) await db.addGuests(c.env.DB, inv.id, rows.slice(i, i + 50));
  return redirectDash(c, inv, 'invitati', '#invitati');
});

app.post('/gestisci/:token/invitati/:gid/elimina', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  await db.deleteGuest(c.env.DB, inv.id, c.req.param('gid'));
  return redirectDash(c, inv, 'invitato-rimosso', '#invitati');
});

app.post('/gestisci/:token/invitati/:gid/inviato', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return c.body(null, 404);
  await db.markGuestSent(c.env.DB, inv.id, c.req.param('gid'));
  return c.body(null, 204);
});

app.post('/gestisci/:token/risposte/:rid/elimina', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  await db.deleteRsvp(c.env.DB, inv.id, c.req.param('rid'));
  return redirectDash(c, inv, 'risposta-eliminata', '#risposte');
});

function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // no formula injection in Excel
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

app.get('/gestisci/:token/risposte.csv', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  const [rsvps, guests] = await Promise.all([db.listRsvps(c.env.DB, inv.id), db.listGuests(c.env.DB, inv.id)]);
  const guestName = new Map(guests.map((g) => [g.id, g.name]));
  const d = inv.data;
  const header = ['Nome', 'Risposta', 'Adulti', 'Bambini', 'Allergie e menu', d.customQuestion || 'Domanda', 'Messaggio', 'Invitato in lista', 'Data risposta'];
  const lines = rsvps.map((r) =>
    [
      r.name,
      r.attending ? 'Ci sarà' : 'Non viene',
      r.adults,
      r.children,
      r.diet ?? '',
      r.answer ?? '',
      r.message ?? '',
      r.guest_id ? guestName.get(r.guest_id) ?? '' : '',
      new Date(r.updated_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome' }),
    ]
      .map(csvCell)
      .join(';'),
  );
  // Guests on the list who have not answered yet: useful for the final phone round.
  const answered = new Set(rsvps.map((r) => r.guest_id));
  for (const g of guests.filter((g) => !answered.has(g.id))) lines.push([g.name, 'Nessuna risposta', '', '', '', '', '', g.name, ''].map(csvCell).join(';'));
  const body = '﻿' + [header.map(csvCell).join(';'), ...lines].join('\r\n') + '\r\n';
  return c.body(body, 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="risposte-${inv.vanity || inv.slug}.csv"`,
  });
});

app.post('/gestisci/:token/elimina', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  const form = await c.req.parseBody();
  if (form.conferma !== '1' && form.conferma !== 'on') return redirectDash(c, inv, undefined, '#risposte');
  await db.deleteInvitation(c.env.DB, c.env.MEDIA, inv);
  return render(
    c,
    <ErrorPage text={`L’invito di ${displayNames(inv.data)} e tutte le risposte sono stati eliminati definitivamente.`} />,
  );
});

// ---------------------------------------------------------------------------
// Stripe webhook
// ---------------------------------------------------------------------------

app.post('/api/stripe/webhook', async (c) => {
  const secret = c.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return c.json({ error: 'webhook non configurato' }, 500);
  const payload = await c.req.text();
  if (!(await verifyWebhook(secret, payload, c.req.header('stripe-signature')))) return c.json({ error: 'firma non valida' }, 400);
  const event = JSON.parse(payload) as { type: string; data: { object: CheckoutSession } };
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    const invId = session.metadata?.invitation_id || session.client_reference_id;
    const inv = invId ? await db.getById(c.env.DB, invId) : null;
    if (inv) await completeCheckout(c, inv, session);
  }
  return c.json({ received: true });
});

// ---------------------------------------------------------------------------
// Owner dashboard
// ---------------------------------------------------------------------------

app.use('/admin', async (c, next) => {
  if (!c.env.ADMIN_PASSWORD) return notFound(c);
  return basicAuth({ username: 'admin', password: c.env.ADMIN_PASSWORD, realm: BRAND.name })(c, next);
});
app.get('/admin', async (c) => render(c, <AdminPage o={await db.adminOverview(c.env.DB)} />));

// ---------------------------------------------------------------------------

app.notFound((c) => notFound(c));
app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error('unhandled error', err);
  return render(c, <ErrorPage text="Riprova tra qualche istante. Se il problema continua, scrivici." />, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(db.runCleanup(env.DB, env.MEDIA).then((r) => console.log('cleanup', r)));
  },
} satisfies ExportedHandler<Env>;
