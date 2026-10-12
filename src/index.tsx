import { Hono, type Context } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { HTTPException } from 'hono/http-exception';
import { html } from 'hono/html';
import type { JSX } from 'hono/jsx/jsx-runtime';
import { AI_TONES, aiConfigured, isAiTone, rewriteMessage } from './ai';
import { icsFile } from './calendar';
import { BRAND, EVENTS, EVENT_BY_ID, EVENT_BY_SLUG, defaultInviteData, isEventType, priceFor } from './config';
import * as db from './db';
import { demoExtras, demoInvitation } from './demo';
import { sendActivated, sendAdminLink, sendRecovery, sendRsvpNotification } from './email';
import { LIMITS, displayNames, isPhotoStyle, parseGallery, parseInvitation, parsePeople, peopleSummary, publicPath, sanitizeInviteData, sanitizePeople, sanitizeTheme, tableRevealActive, visibleProgram } from './model';
import { createCheckoutSession, retrieveCheckoutSession, sessionIsPaid, stripeConfigured, verifyWebhook, type CheckoutSession } from './stripe';
import { rsvpTelegramText, sendTelegram, telegramConfigured } from './telegram';
import { THEMES, isTheme } from './themes';
import type { Env, GuestRow, Invitation, RideRow } from './types';
import { clampInt, daysUntil, isBot, isEmail, sha256Hex, str, timingSafeEqual, waLink } from './util';
import { forecastFor } from './weather';
import { CreatePage } from './views/create';
import { DashboardPage, type DashboardProps } from './views/dashboard';
import { EditorPage } from './views/editor';
import { InvitePage, rideSummary, rideWaText } from './views/invite';
import { LandingPage } from './views/landing';
import { AdminPage, ErrorPage, EventLandingPage, NotFoundPage, PhrasesPage, PrivacyPage, RecoverPage, TermsPage } from './views/pages';
import { GuestCardsPage, PrintPage, TableFinderPage, TableauPage, groupTables } from './views/print';
import { StylesPage } from './views/styles';

type App = { Bindings: Env };
type Ctx = Context<App>;

const app = new Hono<App>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const render = (c: Ctx, node: JSX.Element, status: 200 | 404 | 500 | 403 | 400 = 200) => c.html(html`<!doctype html>${node}`, status);
const originOf = (c: Ctx) => (c.env.PUBLIC_URL || new URL(c.req.url).origin).replace(/\/$/, '');
const notFound = (c: Ctx) => render(c, <NotFoundPage />, 404);
/** Sample photo of the example invitations (an illustration of a couple at sunset). */
const DEMO_PHOTO = '/img/demo/tramonto.jpg';

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
  'invitato-modificato': { kind: 'ok', text: 'Invitato aggiornato.' },
  'nessun-invitato': { kind: 'err', text: 'Scrivi almeno un nome.' },
  'troppi-invitati': { kind: 'err', text: `Hai raggiunto il limite di ${db.MAX_GUESTS_PER_INVITATION} invitati.` },
  'invitato-rimosso': { kind: 'ok', text: 'Invitato rimosso dalla lista.' },
  'risposta-eliminata': { kind: 'ok', text: 'Risposta eliminata.' },
  'regalo-liberato': { kind: 'ok', text: 'Prenotazione cancellata: il regalo è di nuovo disponibile.' },
  'passaggio-eliminato': { kind: 'ok', text: 'Annuncio eliminato dalla bacheca.' },
  'link-condiviso': { kind: 'ok', text: 'Link di sola lettura creato: mandalo a chi ti aiuta a organizzare.' },
  'link-revocato': { kind: 'ok', text: 'Link di sola lettura disattivato: chi lo aveva non può più aprirlo.' },
  'telegram-scollegato': { kind: 'ok', text: 'Telegram scollegato: non riceverai più le risposte lì.' },
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
const isMarketingPath = (p: string) => !/^\/(i|gestisci|vedi|admin|api|media|demo)(\/|$)/.test(p);

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
  const privateArea = path.startsWith('/gestisci') || path.startsWith('/vedi') || path.startsWith('/admin');
  h.set('Referrer-Policy', privateArea ? 'no-referrer' : 'strict-origin-when-cross-origin');
  if (privateArea || path.startsWith('/i/')) {
    h.set('X-Robots-Tag', 'noindex, nofollow');
    h.set('Cache-Control', 'no-store');
  }
});

// ---------------------------------------------------------------------------
// Marketing & SEO pages
// ---------------------------------------------------------------------------

app.get('/', (c) => render(c, <LandingPage origin={originOf(c)} telegram={telegramConfigured(c.env)} />));

app.get('/crea', (c) => {
  const stile = c.req.query('stile');
  return render(c, <CreatePage origin={originOf(c)} preselect={c.req.query('tipo')} theme={isTheme(stile) ? stile : undefined} />);
});
app.get('/stili', (c) => render(c, <StylesPage origin={originOf(c)} />));

app.post('/crea', async (c) => {
  const form = await c.req.parseBody();
  const type = form.type;
  if (!isEventType(type)) return c.redirect('/crea', 303);
  if (!(await db.rateLimit(c.env.DB, `create:${await clientKey(c)}`, 30, 3600)))
    return render(c, <ErrorPage text="Hai creato molti inviti in poco tempo. Riprova tra un’ora." />, 400);
  // a style chosen on /stili comes along, otherwise the occasion's own
  const theme = isTheme(form.theme) ? form.theme : EVENT_BY_ID[type].theme;
  const row = await db.createInvitation(c.env.DB, type, theme, defaultInviteData(type));
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
  // ?foto=<style>: the example invitation with a sample photo shown in that style
  const photo = c.req.query('foto');
  if (isPhotoStyle(photo)) inv.data = { ...inv.data, photoStyle: photo };
  const extras = c.req.query('og') === '1' ? { claims: [], rides: [] } : demoExtras(inv);
  return render(
    c,
    <InvitePage
      inv={inv}
      mode="demo"
      origin={originOf(c)}
      basePath={`/demo/${theme}`}
      showEnvelope={c.req.query('busta') !== '0'}
      rsvp={{ open: true }}
      claims={extras.claims}
      rides={extras.rides}
      coverUrl={isPhotoStyle(photo) ? DEMO_PHOTO : undefined}
    />,
  );
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
  c.text(`User-agent: *\nDisallow: /gestisci/\nDisallow: /vedi/\nDisallow: /i/\nDisallow: /admin\nDisallow: /api/\nDisallow: /media/\n\nSitemap: ${originOf(c)}/sitemap.xml\n`),
);

app.get('/sitemap.xml', (c) => {
  const o = originOf(c);
  const urls = ['/', '/crea', '/stili', ...EVENTS.map((e) => `/inviti/${e.slug}`), ...EVENTS.map((e) => `/frasi/${e.slug}`), ...THEMES.map((t) => `/demo/${t.id}`), '/privacy', '/termini'];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${o}${u}</loc></url>`).join('')}</urlset>`;
  return c.body(body, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

// ---------------------------------------------------------------------------
// Public invitation
// ---------------------------------------------------------------------------

/** Gift reservations and the rides board, only when the invitation uses them. */
async function extrasFor(c: Ctx, inv: Invitation) {
  const [claims, rides] = await Promise.all([
    inv.data.gifts.length ? db.listGiftClaims(c.env.DB, inv.id) : Promise.resolve([]),
    inv.data.ridesBoard ? db.listRides(c.env.DB, inv.id) : Promise.resolve([]),
  ]);
  return { claims, rides };
}

async function renderPublic(c: Ctx, inv: Invitation, guest: GuestRow | null) {
  const [guestRsvp, extras] = await Promise.all([guest ? db.getRsvpByGuest(c.env.DB, guest.id) : Promise.resolve(null), extrasFor(c, inv)]);
  return render(
    c,
    <InvitePage
      inv={inv}
      mode="live"
      origin={originOf(c)}
      basePath={publicPath(inv)}
      guest={guest}
      guestRsvp={guestRsvp}
      showEnvelope
      rsvp={rsvpState(inv)}
      claims={extras.claims}
      rides={extras.rides}
    />,
  );
}

function calendarResponse(c: Ctx, inv: Invitation, basePath: string) {
  const d = inv.data;
  const ev = EVENT_BY_ID[inv.event_type];
  const names = displayNames(d);
  const first = visibleProgram(d, null)[0];
  const body = icsFile({
    uid: `${inv.id}@confetto`,
    title: `${d.saveTheDate ? 'Save the date' : ev.label}: ${names}`,
    date: d.date,
    time: d.time,
    durationMin: 300,
    location: [first?.place, first?.address].filter(Boolean).join(', '),
    details: d.eyebrow ? `${d.eyebrow} ${names}` : names,
    url: originOf(c) + basePath,
  });
  return c.body(body, 200, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'attachment; filename="invito.ics"',
  });
}

async function readJson(c: Ctx): Promise<Record<string, unknown> | null> {
  try {
    const v = await c.req.json();
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const loadPublic = (c: Ctx) => db.getByPublicId(c.env.DB, c.req.param('id') ?? '');

app.get('/i/:id', async (c) => {
  const inv = await loadPublic(c);
  return inv ? renderPublic(c, inv, null) : notFound(c);
});

app.get('/i/:id/calendario.ics', async (c) => {
  const inv = await loadPublic(c);
  return inv ? calendarResponse(c, inv, publicPath(inv)) : notFound(c);
});

app.get('/i/:id/meteo', async (c) => {
  const inv = await loadPublic(c);
  if (!inv) return c.json({ ok: false }, 404);
  return c.json((await forecastFor(c.env, inv.data)) ?? { ok: false });
});

/** Accent- and case-insensitive ("nicolo" finds "Nicolò"). */
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

app.get('/i/:id/tavolo', async (c) => {
  const inv = await loadPublic(c);
  if (!inv) return notFound(c);
  const active = inv.status === 'active' && tableRevealActive(inv.data);
  const q = str(c.req.query('nome'), 60);
  const results: { name: string; table: string }[] = [];
  if (active && q.length >= 3) {
    if (!(await db.rateLimit(c.env.DB, `table:${await clientKey(c)}:${inv.id}`, 60, 600)))
      return render(c, <ErrorPage text="Troppe ricerche in poco tempo. Riprova tra qualche minuto." />, 400);
    const needle = fold(q);
    for (const g of await db.listSeatedGuests(c.env.DB, inv.id)) {
      if (g.attending === 0) continue;
      const person = parsePeople(g.people).find((p) => p.name && fold(p.name).includes(needle));
      if (fold(g.name).includes(needle)) results.push({ name: g.name, table: g.table_name ?? '' });
      else if (person) results.push({ name: `${person.name} · ${g.name}`, table: g.table_name ?? '' });
      if (results.length >= 12) break;
    }
  }
  return render(c, <TableFinderPage inv={inv} active={active} q={q} results={results} />);
});

app.get('/i/:id/:code', async (c) => {
  const inv = await loadPublic(c);
  if (!inv) return notFound(c);
  const guest = await db.getGuestByCode(c.env.DB, inv.id, c.req.param('code'));
  return renderPublic(c, inv, guest);
});

app.post('/i/:id/rsvp', async (c) => {
  const inv = await loadPublic(c);
  if (!inv) return c.json({ ok: false, error: 'Invito non trovato.' }, 404);
  const state = rsvpState(inv);
  if (!state.open) return c.json({ ok: false, error: state.reason }, 403);
  if (inv.data.saveTheDate) return c.json({ ok: false, error: 'Le conferme si apriranno con l’invito completo.' }, 403);

  const body = await readJson(c);
  if (!body) return c.json({ ok: false, error: 'Richiesta non valida.' }, 400);
  // Honeypot: bots fill every field. Pretend everything went fine.
  if (str(body.website, 100)) return c.json({ ok: true, id: 'ok', editToken: 'ok' });
  if (!(await db.rateLimit(c.env.DB, `rsvp:${await clientKey(c)}:${inv.id}`, 20, 600)))
    return c.json({ ok: false, error: 'Troppe risposte in poco tempo. Riprova tra qualche minuto.' }, 429);

  const name = str(body.name, 80);
  if (!name) return c.json({ ok: false, error: 'Scrivi il tuo nome.' }, 400);
  const attending = body.attending === 'yes' || body.attending === true;
  if (!attending && body.attending !== 'no' && body.attending !== false) return c.json({ ok: false, error: 'Dicci se ci sarai.' }, 400);

  const d = inv.data;
  const guest = str(body.guestCode, 12) ? await db.getGuestByCode(c.env.DB, inv.id, str(body.guestCode, 12)) : null;
  let adults = attending ? clampInt(body.adults, 0, 20, 1) : 0;
  let children = attending && d.askChildren ? clampInt(body.children, 0, 20, 0) : 0;
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
      diet: attending && d.askDiet ? str(body.diet, 300) : '',
      answer: attending && d.customQuestion ? str(body.answer, 200) : '',
      message: str(body.message, 600),
      people: attending ? sanitizePeople(body.people, d, adults, children) : [],
      song: attending && d.askSong ? str(body.song, LIMITS.song) : '',
    },
    { guest, id: str(body.id, 20), editToken: str(body.editToken, 40) },
  );
  if (!result.ok) return c.json({ ok: false, error: result.error }, 400);

  const origin = originOf(c);
  if (inv.email && inv.notify_rsvp) {
    const all = await db.listRsvps(c.env.DB, inv.id);
    const stats = db.computeStats(all, []);
    waitUntil(c, sendRsvpNotification(c.env, inv, result.row, origin, stats));
  }
  if (inv.tg_chat_id && telegramConfigured(c.env)) {
    waitUntil(c, sendTelegram(c.env, inv.tg_chat_id, rsvpTelegramText(inv, result.row, inv.viewer_token ? `${origin}/vedi/${inv.viewer_token}` : null)));
  }
  return c.json({ ok: true, id: result.row.id, editToken: result.row.edit_token });
});

app.post('/i/:id/visto', async (c) => {
  if (isBot(c.req.header('user-agent'))) return c.body(null, 204);
  const inv = await loadPublic(c);
  if (!inv || inv.status !== 'active') return c.body(null, 204);
  const code = str((await readJson(c))?.code, 12);
  if (!(await db.rateLimit(c.env.DB, `view:${await clientKey(c)}:${inv.id}`, 30, 3600))) return c.body(null, 204);
  await db.incrementViews(c.env.DB, inv.id);
  if (code) await db.markGuestOpened(c.env.DB, inv.id, code);
  return c.body(null, 204);
});

// ---------- gift registry (reserve a present, chip in to a fund) ----------

function fundTotals(claims: { gift_id: string; amount_cents: number }[], giftId: string) {
  const mine = claims.filter((x) => x.gift_id === giftId);
  return { sum: mine.reduce((s, x) => s + x.amount_cents, 0), count: mine.length };
}

app.post('/i/:id/regali', async (c) => {
  const inv = await loadPublic(c);
  if (!inv) return c.json({ ok: false, error: 'Invito non trovato.' }, 404);
  if (inv.status !== 'active') return c.json({ ok: false, error: 'La lista regali si attiverà quando l’invito sarà pubblicato.' }, 403);
  const body = await readJson(c);
  if (!body) return c.json({ ok: false, error: 'Richiesta non valida.' }, 400);
  if (!(await db.rateLimit(c.env.DB, `gift:${await clientKey(c)}:${inv.id}`, 20, 600)))
    return c.json({ ok: false, error: 'Troppe richieste in poco tempo. Riprova tra qualche minuto.' }, 429);
  const gift = inv.data.gifts.find((g) => g.id === str(body.gift, 12));
  if (!gift) return c.json({ ok: false, error: 'Questo regalo non è più nella lista.' }, 404);
  const name = str(body.name, 60);
  if (!name) return c.json({ ok: false, error: 'Scrivi il tuo nome.' }, 400);
  let amountCents = 0;
  if (gift.kind === 'fund') {
    const amount = Math.round(Number(String(body.amount ?? '').replace(',', '.')));
    if (!(amount >= 1 && amount <= 10000)) return c.json({ ok: false, error: 'Scrivi una quota tra 1 e 10.000 €.' }, 400);
    amountCents = amount * 100;
  }
  const code = str(body.guestCode, 12);
  const guest = code ? await db.getGuestByCode(c.env.DB, inv.id, code) : null;
  const res = await db.claimGift(c.env.DB, inv.id, gift, { name, amountCents, guestId: guest?.id ?? null });
  if (!res.ok) return c.json({ ok: false, error: res.error }, res.status);
  const totals = gift.kind === 'fund' ? fundTotals(await db.listGiftClaims(c.env.DB, inv.id), gift.id) : {};
  return c.json({ ok: true, id: res.row.id, token: res.row.token, ...totals });
});

app.post('/i/:id/regali/annulla', async (c) => {
  const inv = await loadPublic(c);
  if (!inv) return c.json({ ok: false, error: 'Invito non trovato.' }, 404);
  const body = await readJson(c);
  const id = str(body?.id, 20);
  const token = str(body?.token, 40);
  if (!id || !token) return c.json({ ok: false, error: 'Puoi annullare solo dal telefono con cui hai prenotato.' }, 400);
  const giftId = await db.cancelGiftClaim(c.env.DB, inv.id, id, token);
  if (!giftId) return c.json({ ok: false, error: 'Non troviamo la tua prenotazione: forse è già stata annullata.' }, 404);
  return c.json({ ok: true, ...fundTotals(await db.listGiftClaims(c.env.DB, inv.id), giftId) });
});

// ---------- rides board ----------

app.post('/i/:id/passaggi', async (c) => {
  const inv = await loadPublic(c);
  if (!inv || !inv.data.ridesBoard) return c.json({ ok: false, error: 'La bacheca dei passaggi non è attiva.' }, 404);
  if (inv.status !== 'active') return c.json({ ok: false, error: 'La bacheca si attiverà quando l’invito sarà pubblicato.' }, 403);
  const body = await readJson(c);
  if (!body) return c.json({ ok: false, error: 'Richiesta non valida.' }, 400);
  if (!(await db.rateLimit(c.env.DB, `ride:${await clientKey(c)}:${inv.id}`, 10, 3600)))
    return c.json({ ok: false, error: 'Hai pubblicato molti annunci: riprova più tardi.' }, 429);
  const ride: Pick<RideRow, 'kind' | 'place' | 'seats' | 'name' | 'phone' | 'note'> = {
    kind: body.kind === 'need' ? 'need' : 'offer',
    place: str(body.place, 80),
    seats: clampInt(body.seats, 1, 8, 1),
    name: str(body.name, 60),
    phone: str(body.phone, 24).replace(/[^\d+ ]/g, ''),
    note: str(body.note, 120) || null,
  };
  if (!ride.place || !ride.name) return c.json({ ok: false, error: 'Scrivi da dove parti e il tuo nome.' }, 400);
  if (ride.phone.replace(/\D/g, '').length < 6) return c.json({ ok: false, error: 'Scrivi il tuo numero di WhatsApp.' }, 400);
  const row = await db.addRide(c.env.DB, inv.id, ride);
  if (!row) return c.json({ ok: false, error: 'La bacheca è piena.' }, 400);
  const ev = EVENT_BY_ID[inv.event_type];
  return c.json({
    ok: true,
    ride: { id: row.id, kind: row.kind, place: row.place, summary: rideSummary(row) },
    token: row.token,
    wa: waLink(rideWaText(row, ev.eventPhrase(inv.data)), row.phone),
  });
});

app.post('/i/:id/passaggi/elimina', async (c) => {
  const inv = await loadPublic(c);
  if (!inv) return c.json({ ok: false, error: 'Invito non trovato.' }, 404);
  const body = await readJson(c);
  const id = str(body?.id, 20);
  const token = str(body?.token, 40);
  if (!id || !token || !(await db.deleteRide(c.env.DB, inv.id, id, token)))
    return c.json({ ok: false, error: 'Puoi eliminare solo i tuoi annunci, dal telefono con cui li hai pubblicati.' }, 404);
  return c.json({ ok: true });
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

/** Everything the dashboard shows (host and read-only co-organiser view). */
async function dashboardData(c: Ctx, inv: Invitation) {
  const [rsvps, guests, extras] = await Promise.all([db.listRsvps(c.env.DB, inv.id), db.listGuests(c.env.DB, inv.id), extrasFor(c, inv)]);
  return { rsvps, guests, claims: extras.claims, rides: extras.rides, stats: db.computeStats(rsvps, guests) };
}

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

  const data = await dashboardData(c, inv);
  const msg = c.req.query('msg');
  let flash = msg ? FLASH[msg] ?? null : null;
  if (msg === 'email' && !c.env.RESEND_API_KEY) flash = FLASH['email-salvata'];
  let telegram: DashboardProps['telegram'] = null;
  if (telegramConfigured(c.env)) {
    const code = inv.tg_chat_id ? null : await db.ensureTelegramCode(c.env.DB, inv);
    telegram = { linked: Boolean(inv.tg_chat_id), link: code ? `https://t.me/${c.env.TELEGRAM_BOT_NAME}?start=${code}` : '' };
  }
  return render(
    c,
    <DashboardPage
      inv={inv}
      origin={originOf(c)}
      base={`/gestisci/${inv.admin_token}`}
      {...data}
      flash={flash}
      paymentsReady={stripeConfigured(c.env)}
      telegram={telegram}
    />,
  );
});

/** Read-only dashboard for co-organisers (parents, wedding planner): no edits, no deletions. */
app.get('/vedi/:token', async (c) => {
  const inv = await db.getByViewerToken(c.env.DB, c.req.param('token'));
  if (!inv) return notFound(c);
  const data = await dashboardData(c, inv);
  return render(c, <DashboardPage inv={inv} origin={originOf(c)} base={`/vedi/${inv.viewer_token}`} {...data} readOnly paymentsReady={false} telegram={null} />);
});

app.get('/gestisci/:token/modifica', async (c) => {
  const inv = await loadByToken(c);
  return inv ? render(c, <EditorPage inv={inv} isNew={c.req.query('nuovo') === '1'} aiTones={aiConfigured(c.env) ? AI_TONES : null} />) : notFound(c);
});

app.get('/gestisci/:token/anteprima', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  const extras = await extrasFor(c, inv);
  return render(
    c,
    <InvitePage
      inv={inv}
      mode="preview"
      origin={originOf(c)}
      basePath={publicPath(inv)}
      showEnvelope={c.req.query('busta') === '1'}
      rsvp={{ open: true }}
      claims={extras.claims}
      rides={extras.rides}
    />,
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

/** "Rewrite the message" (Claude): only when ANTHROPIC_API_KEY is set. */
app.post('/gestisci/:token/ai', async (c) => {
  const inv = await loadByToken(c);
  if (!inv || !aiConfigured(c.env)) return c.json({ ok: false, error: 'Funzione non disponibile.' }, 404);
  const body = await readJson(c);
  if (!body || !isAiTone(body.tone)) return c.json({ ok: false, error: 'Richiesta non valida.' }, 400);
  const allowed =
    (await db.rateLimit(c.env.DB, `ai:${inv.id}`, 30, 3600)) && (await db.rateLimit(c.env.DB, `ai-ip:${await clientKey(c)}`, 60, 3600));
  if (!allowed) return c.json({ ok: false, error: 'Hai chiesto molti testi: riprova tra un’ora.' }, 429);
  // names and date as currently typed in the editor (maybe not saved yet)
  const d = sanitizeInviteData(body.data, inv.event_type, inv.data);
  const res = await rewriteMessage(c.env, inv.event_type, d, str(body.text, LIMITS.message), body.tone);
  return res.ok ? c.json(res) : c.json({ ok: false, error: res.error }, res.status);
});

function sniffImage(buf: Uint8Array): { ext: 'jpg' | 'png' | 'webp'; type: string } | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: 'png', type: 'image/png' };
  const ascii = (a: number, b: number) => String.fromCharCode(...buf.slice(a, b));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  return null;
}

/** Reads an uploaded image (raw body), checks size and type, stores it in R2 and returns its key. */
async function storeImage(c: Ctx, inv: Invitation, maxBytes: number): Promise<{ ok: true; key: string } | { ok: false; res: Response }> {
  if (!(await db.rateLimit(c.env.DB, `upload:${inv.id}`, 60, 3600))) return { ok: false, res: c.json({ ok: false, error: 'Troppi caricamenti, riprova più tardi.' }, 429) };
  const tooBig = () => ({ ok: false as const, res: c.json({ ok: false, error: `La foto è troppo pesante (max ${Math.round(maxBytes / 1048576)} MB).` }, 413) });
  if (Number(c.req.header('content-length') ?? 0) > maxBytes) return tooBig();
  const buf = new Uint8Array(await c.req.arrayBuffer());
  if (buf.byteLength > maxBytes) return tooBig();
  const kind = sniffImage(buf);
  if (!kind) return { ok: false, res: c.json({ ok: false, error: 'Formato non supportato: usa una foto JPG o PNG.' }, 415) };
  const key = `c/${inv.id}/${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}.${kind.ext}`;
  await c.env.MEDIA.put(key, buf, { httpMetadata: { contentType: kind.type } });
  return { ok: true, key };
}

app.post('/gestisci/:token/foto', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return c.json({ ok: false, error: 'Invito non trovato' }, 404);
  const up = await storeImage(c, inv, 4 * 1024 * 1024);
  if (!up.ok) return up.res;
  if (inv.cover_key) await c.env.MEDIA.delete(inv.cover_key).catch(() => undefined);
  await db.setCover(c.env.DB, inv.id, up.key);
  return c.json({ ok: true, url: `/media/${up.key}` });
});

app.post('/gestisci/:token/foto/rimuovi', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return c.json({ ok: false }, 404);
  if (inv.cover_key) await c.env.MEDIA.delete(inv.cover_key).catch(() => undefined);
  await db.setCover(c.env.DB, inv.id, null);
  return c.json({ ok: true });
});

app.post('/gestisci/:token/galleria', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return c.json({ ok: false, error: 'Invito non trovato' }, 404);
  const keys = parseGallery(inv.gallery);
  if (keys.length >= LIMITS.gallery) return c.json({ ok: false, error: `Puoi caricare al massimo ${LIMITS.gallery} foto.` }, 400);
  const up = await storeImage(c, inv, 4 * 1024 * 1024);
  if (!up.ok) return up.res;
  // re-read: two uploads can run at the same time
  const fresh = await db.getById(c.env.DB, inv.id);
  const next = [...parseGallery(fresh?.gallery ?? null), up.key].slice(0, LIMITS.gallery);
  await db.setGallery(c.env.DB, inv.id, next);
  return c.json({ ok: true, key: up.key, url: `/media/${up.key}` });
});

app.post('/gestisci/:token/galleria/rimuovi', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return c.json({ ok: false }, 404);
  const key = str((await readJson(c))?.key, 80);
  const keys = parseGallery(inv.gallery);
  if (!keys.includes(key)) return c.json({ ok: false, error: 'Foto non trovata.' }, 404);
  await c.env.MEDIA.delete(key).catch(() => undefined);
  await db.setGallery(c.env.DB, inv.id, keys.filter((k) => k !== key));
  return c.json({ ok: true });
});

/** The WhatsApp preview image (drawn by the editor with the names, see editor.js). */
app.post('/gestisci/:token/anteprima-link', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return c.json({ ok: false }, 404);
  const up = await storeImage(c, inv, 1024 * 1024);
  if (!up.ok) return up.res;
  if (inv.og_key) await c.env.MEDIA.delete(inv.og_key).catch(() => undefined);
  await db.setOgKey(c.env.DB, inv.id, up.key);
  return c.json({ ok: true, url: `/media/${up.key}` });
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

const cleanPhone = (v: unknown) => str(v, 24).replace(/[^\d+ ]/g, '') || null;

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
  const common = { grp: str(form.grp, 40) || null, full: form.partial !== 'on' && form.partial !== '1' };
  let rows: db.GuestInput[] =
    form.mode === 'bulk'
      ? parseGuestLines(str(form.bulk, 40000)).map((r) => ({ ...r, ...common }))
      : str(form.name, 80)
        ? [{ name: str(form.name, 80), seats: clampInt(form.seats, 1, 20, 1), phone: cleanPhone(form.phone), table: str(form.table, 40) || null, ...common }]
        : [];
  if (!rows.length) return redirectDash(c, inv, 'nessun-invitato', '#invitati');
  const existing = await db.countGuests(c.env.DB, inv.id);
  const room = db.MAX_GUESTS_PER_INVITATION - existing;
  if (room <= 0) return redirectDash(c, inv, 'troppi-invitati', '#invitati');
  rows = rows.slice(0, room);
  for (let i = 0; i < rows.length; i += 50) await db.addGuests(c.env.DB, inv.id, rows.slice(i, i + 50));
  return redirectDash(c, inv, 'invitati', '#invitati');
});

app.post('/gestisci/:token/invitati/:gid/modifica', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  const form = await c.req.parseBody();
  const name = str(form.name, 80);
  if (!name) return redirectDash(c, inv, 'nessun-invitato', '#invitati');
  await db.updateGuest(c.env.DB, inv.id, c.req.param('gid'), {
    name,
    seats: clampInt(form.seats, 1, 20, 1),
    phone: cleanPhone(form.phone),
    grp: str(form.grp, 40) || null,
    table: str(form.table, 40) || null,
    full: form.partial !== 'on' && form.partial !== '1',
  });
  return redirectDash(c, inv, 'invitato-modificato', '#invitati');
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

app.post('/gestisci/:token/regali/:cid/elimina', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  await db.deleteGiftClaim(c.env.DB, inv.id, c.req.param('cid'));
  return redirectDash(c, inv, 'regalo-liberato', '#regali');
});

app.post('/gestisci/:token/passaggi/:rid/elimina', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  await db.deleteRide(c.env.DB, inv.id, c.req.param('rid'));
  return redirectDash(c, inv, 'passaggio-eliminato', '#regali');
});

app.post('/gestisci/:token/condividi', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  await db.setViewerToken(c.env.DB, inv.id, true);
  return redirectDash(c, inv, 'link-condiviso', '#condividi');
});

app.post('/gestisci/:token/condividi/revoca', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  await db.setViewerToken(c.env.DB, inv.id, false);
  return redirectDash(c, inv, 'link-revocato', '#condividi');
});

app.post('/gestisci/:token/telegram/scollega', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  await db.unlinkTelegram(c.env.DB, inv.id);
  return redirectDash(c, inv, 'telegram-scollegato', '#avvisi');
});

// ---------- downloads and printables (host, and read-only for co-organisers) ----------

function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // no formula injection in Excel
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvResponse(c: Ctx, inv: Invitation, name: string, header: unknown[], lines: unknown[][]) {
  const body = '﻿' + [header, ...lines].map((l) => l.map(csvCell).join(';')).join('\r\n') + '\r\n';
  return c.body(body, 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${name}-${inv.vanity || inv.slug}.csv"`,
  });
}

async function answersCsv(c: Ctx, inv: Invitation) {
  const [rsvps, guests] = await Promise.all([db.listRsvps(c.env.DB, inv.id), db.listGuests(c.env.DB, inv.id)]);
  const guestById = new Map(guests.map((g) => [g.id, g]));
  const d = inv.data;
  const askPeople = d.askNames || d.menuOptions.length > 0;
  const header = [
    'Nome',
    'Risposta',
    'Adulti',
    'Bambini',
    ...(askPeople ? ['Persone e menu'] : []),
    'Allergie e menu',
    d.customQuestion || 'Domanda',
    ...(d.askSong ? ['Canzone'] : []),
    'Messaggio',
    'Invitato in lista',
    'Gruppo',
    'Tavolo',
    'Data risposta',
  ];
  const lines = rsvps.map((r) => {
    const g = r.guest_id ? guestById.get(r.guest_id) : undefined;
    return [
      r.name,
      r.attending ? 'Ci sarà' : 'Non viene',
      r.adults,
      r.children,
      ...(askPeople ? [peopleSummary(r.people)] : []),
      r.diet ?? '',
      r.answer ?? '',
      ...(d.askSong ? [r.song ?? ''] : []),
      r.message ?? '',
      g?.name ?? '',
      g?.grp ?? '',
      g?.table_name ?? '',
      new Date(r.updated_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome' }),
    ];
  });
  // Guests on the list who have not answered yet: useful for the final phone round.
  const answered = new Set(rsvps.map((r) => r.guest_id));
  const blanks = header.length - 6;
  for (const g of guests.filter((g) => !answered.has(g.id)))
    lines.push([g.name, 'Nessuna risposta', ...Array(blanks).fill(''), g.name, g.grp ?? '', g.table_name ?? '', '']);
  return csvResponse(c, inv, 'risposte', header, lines);
}

/** One row per person: what the caterer needs (menu, child, allergies, table). */
async function cateringCsv(c: Ctx, inv: Invitation) {
  const [rsvps, guests] = await Promise.all([db.listRsvps(c.env.DB, inv.id), db.listGuests(c.env.DB, inv.id)]);
  const guestById = new Map(guests.map((g) => [g.id, g]));
  const lines: unknown[][] = [];
  for (const r of rsvps.filter((x) => x.attending)) {
    const people = parsePeople(r.people);
    const table = (r.guest_id && guestById.get(r.guest_id)?.table_name) || '';
    for (let i = 0; i < r.adults + r.children; i++) {
      const p = people[i];
      const child = p ? p.child : i >= r.adults;
      lines.push([p?.name || `${r.name}${i ? ` (+${i})` : ''}`, child ? 'Bambino' : 'Adulto', p?.menu ?? '', i === 0 ? r.diet ?? '' : '', table, r.name]);
    }
  }
  return csvResponse(c, inv, 'catering', ['Persona', 'Adulto o bambino', 'Menu', 'Allergie (del gruppo)', 'Tavolo', 'Risposta di'], lines);
}

async function tableauResponse(c: Ctx, inv: Invitation, back: string) {
  const [seated, total] = await Promise.all([db.listSeatedGuests(c.env.DB, inv.id), db.countGuests(c.env.DB, inv.id)]);
  return render(c, <TableauPage inv={inv} origin={originOf(c)} tables={groupTables(seated)} back={back} unseated={total - seated.length} />);
}

app.get('/gestisci/:token/risposte.csv', async (c) => {
  const inv = await loadByToken(c);
  return inv ? answersCsv(c, inv) : notFound(c);
});
app.get('/gestisci/:token/catering.csv', async (c) => {
  const inv = await loadByToken(c);
  return inv ? cateringCsv(c, inv) : notFound(c);
});
app.get('/gestisci/:token/tableau', async (c) => {
  const inv = await loadByToken(c);
  return inv ? tableauResponse(c, inv, `/gestisci/${inv.admin_token}#invitati`) : notFound(c);
});
app.get('/gestisci/:token/stampa', async (c) => {
  const inv = await loadByToken(c);
  if (!inv) return notFound(c);
  const back = `/gestisci/${inv.admin_token}`;
  if (c.req.query('invitati') === '1') return render(c, <GuestCardsPage inv={inv} origin={originOf(c)} guests={await db.listGuests(c.env.DB, inv.id)} back={`${back}#invitati`} />);
  return render(c, <PrintPage inv={inv} origin={originOf(c)} back={back} />);
});

const loadViewer = (c: Ctx) => db.getByViewerToken(c.env.DB, c.req.param('token') ?? '');
app.get('/vedi/:token/risposte.csv', async (c) => {
  const inv = await loadViewer(c);
  return inv ? answersCsv(c, inv) : notFound(c);
});
app.get('/vedi/:token/catering.csv', async (c) => {
  const inv = await loadViewer(c);
  return inv ? cateringCsv(c, inv) : notFound(c);
});
app.get('/vedi/:token/tableau', async (c) => {
  const inv = await loadViewer(c);
  return inv ? tableauResponse(c, inv, `/vedi/${inv.viewer_token}`) : notFound(c);
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
// Telegram bot (optional): "/start <code>" links the host's chat
// ---------------------------------------------------------------------------

app.post('/api/telegram/webhook', async (c) => {
  const secret = c.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !telegramConfigured(c.env)) return c.json({ error: 'non configurato' }, 404);
  if (!timingSafeEqual(c.req.header('x-telegram-bot-api-secret-token') ?? '', secret)) return c.json({ error: 'non autorizzato' }, 401);
  const update = (await readJson(c)) as { message?: { text?: unknown; chat?: { id?: unknown; type?: unknown } } } | null;
  const text = typeof update?.message?.text === 'string' ? update.message.text.trim() : '';
  const chatId = update?.message?.chat?.id;
  if (!text.startsWith('/start') || (typeof chatId !== 'number' && typeof chatId !== 'string')) return c.json({ ok: true });
  // answers are personal data: only to a private chat, never to a group
  if (update?.message?.chat?.type && update.message.chat.type !== 'private') {
    waitUntil(c, sendTelegram(c.env, String(chatId), 'Per ricevere le risposte scrivimi in una chat privata, non in un gruppo.'));
    return c.json({ ok: true });
  }
  const code = text.match(/^\/start(?:@\w+)?\s+([a-z0-9]{8,32})$/)?.[1];
  const inv = code ? await db.linkTelegram(c.env.DB, code, String(chatId)) : null;
  const reply = inv
    ? `Fatto! Da adesso ricevi qui ogni nuova risposta all’invito di ${displayNames(inv.data, ' e ')}. Per smettere, scollega Telegram dal pannello dell’invito.`
    : code
      ? 'Questo collegamento non è più valido. Apri il pannello del tuo invito e premi di nuovo «Collega Telegram».'
      : 'Ciao! Per ricevere qui le risposte ai tuoi inviti, apri il pannello del tuo invito e premi «Collega Telegram».';
  waitUntil(c, sendTelegram(c.env, String(chatId), reply));
  return c.json({ ok: true });
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
