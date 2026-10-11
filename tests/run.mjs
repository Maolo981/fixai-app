// End-to-end tests: real Worker (wrangler dev, local D1/R2) + fake Stripe + headless Chromium.
// Run with: npm test   (screenshots end up in tests/output/)
import { execFileSync, spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { startStripeMock } from './stripe-mock.mjs';

const PORT = 8790;
const BASE = `http://127.0.0.1:${PORT}`;
const STATE = '.wrangler/test-state';
const OUT = 'tests/output';
const WEBHOOK_SECRET = 'whsec_test';
const ADMIN = 'Basic ' + Buffer.from('admin:test-admin').toString('base64');

let failures = 0;
async function step(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures++;
    console.error(`  ✗ ${name}\n      ${e.message.split('\n').join('\n      ')}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, timeout = 60000) {
  const start = Date.now();
  for (;;) {
    try {
      if (await fn()) return;
    } catch {
      /* not ready */
    }
    if (Date.now() - start > timeout) throw new Error('timeout waiting for condition');
    await sleep(300);
  }
}

// ---------------------------------------------------------------------------
console.log('▸ preparing fresh local database');
rmSync(STATE, { recursive: true, force: true });
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
execFileSync('npx', ['wrangler', 'd1', 'migrations', 'apply', 'DB', '--local', '--persist-to', STATE], { stdio: 'ignore' });
writeFileSync(
  `${OUT}/test.env`,
  ['STRIPE_SECRET_KEY=sk_test_mock', 'STRIPE_API_BASE=http://127.0.0.1:12111', `STRIPE_WEBHOOK_SECRET=${WEBHOOK_SECRET}`, 'ADMIN_PASSWORD=test-admin', 'ALLOW_FREE_ACTIVATION=false', 'CF_ANALYTICS_TOKEN=test-token'].join('\n'),
);

console.log('▸ starting fake Stripe and the Worker');
const stripe = await startStripeMock(12111);
const portBusy = await fetch(`${BASE}/robots.txt`).then(() => true, () => false);
if (portBusy) {
  console.error(`Port ${PORT} is already in use (a previous test server still running?). Stop it and retry.`);
  await stripe.close();
  process.exit(1);
}
// detached: wrangler spawns workerd children; we kill the whole process group at the end
const server = spawn(
  'npx',
  ['wrangler', 'dev', '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', STATE, '--test-scheduled', '--env-file', `${OUT}/test.env`],
  { env: { ...process.env, NO_PROXY: 'localhost,127.0.0.1', WRANGLER_SEND_METRICS: 'false' }, stdio: ['ignore', 'pipe', 'pipe'], detached: true },
);
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));
const shutdown = async () => {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    server.kill('SIGTERM');
  }
  await stripe.close();
};
process.on('uncaughtException', async (e) => {
  console.error(e);
  await shutdown();
  process.exit(1);
});

try {
  await waitFor(async () => (await fetch(`${BASE}/robots.txt`)).ok, 90000);
} catch (e) {
  console.error(serverLog);
  await shutdown();
  throw e;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const mobile = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'it-IT',
  timezoneId: 'Europe/Rome',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};
const desktop = { viewport: { width: 1280, height: 900 }, locale: 'it-IT', timezoneId: 'Europe/Rome' };
const pageErrors = [];
async function newPage(opts, reducedMotion = 'reduce') {
  const ctx = await browser.newContext({ ...opts, reducedMotion });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${page.url()}: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|ERR_ABORTED|Failed to load resource/.test(m.text())) pageErrors.push(`${page.url()}: ${m.text()}`);
  });
  return { ctx, page };
}

const state = {};
async function openEnvelope(page) {
  if ((await page.locator('#env-open').count()) === 0) return;
  await page.click('#env-open', { force: true });
  await page.waitForSelector('#envelope', { state: 'detached', timeout: 8000 });
}

// ---------------------------------------------------------------------------
console.log('▸ marketing pages');
await step('landing, SEO pages, legal, sitemap and robots respond', async () => {
  for (const p of ['/', '/crea', '/inviti/matrimonio', '/inviti/18-anni', '/frasi/laurea', '/privacy', '/termini', '/recupera', '/demo/cielo', '/demo/notte?ev=diciottesimo']) {
    const r = await fetch(BASE + p);
    assert(r.status === 200, `${p} -> ${r.status}`);
  }
  const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
  assert(sm.includes('/inviti/battesimo') && sm.includes('/frasi/comunione'), 'sitemap misses SEO pages');
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  assert(robots.includes('Disallow: /gestisci/'), 'robots must hide management pages');
  assert((await fetch(`${BASE}/nope`)).status === 404, 'unknown page should 404');
});

await step('analytics only on marketing pages, never on invitations', async () => {
  const landing = await (await fetch(`${BASE}/`)).text();
  assert(landing.includes('static.cloudflareinsights.com/beacon.min.js') && landing.includes('test-token'), 'beacon missing on landing');
  const demo = await (await fetch(`${BASE}/demo/ulivo`)).text();
  assert(!demo.includes('cloudflareinsights'), 'invitations must not load analytics');
});

await step('security headers are set', async () => {
  const r = await fetch(`${BASE}/`);
  const csp = r.headers.get('content-security-policy') || '';
  assert(csp.includes("script-src 'self'") && csp.includes('frame-ancestors'), 'CSP missing');
  assert(r.headers.get('x-content-type-options') === 'nosniff', 'nosniff missing');
});

// ---------------------------------------------------------------------------
console.log('▸ host creates an invitation in the browser');
const host = await newPage(desktop);
await step('create flow: landing → choose occasion → editor', async () => {
  const { page } = host;
  await page.goto(`${BASE}/`);
  await page.screenshot({ path: `${OUT}/01-landing-desktop.png` });
  await page.click('.hero-cta >> text=Crea il tuo invito');
  await page.waitForURL(/\/crea$/);
  await page.click('button.event-card[value="matrimonio"]');
  await page.waitForURL(/\/gestisci\/[A-Za-z0-9]+\/modifica\?nuovo=1/);
  state.token = page.url().match(/gestisci\/([A-Za-z0-9]+)/)[1];
  assert(await page.isVisible('.notice-info'), 'new-invitation notice not shown');
});

await step('editor autosaves and the live preview follows', async () => {
  const { page } = host;
  await page.fill('input[name="name1"]', 'Giulia');
  await page.fill('input[name="name2"]', 'Edoardo');
  await page.fill('input[name="date"]', '2027-06-19');
  await page.fill('input[name="time"]', '11:30');
  await page.waitForSelector('#save-status[data-state="saved"]', { timeout: 10000 });
  await page.click('label.theme-opt:has(input[value="limoni"])');
  await page.waitForTimeout(400);
  await page.waitForSelector('#save-status[data-state="saved"]');
  // program: edit first row, remove second, add a new one
  const rows = page.locator('[data-moment]');
  await rows.nth(0).locator('[data-k="place"]').fill('Duomo di Sant’Andrea');
  await rows.nth(0).locator('[data-k="address"]').fill('Piazza Duomo, Amalfi');
  await rows.nth(1).locator('[data-remove]').click();
  await page.click('#add-moment');
  const last = page.locator('[data-moment]').last();
  await last.locator('[data-k="time"]').fill('14:00');
  await last.locator('[data-k="title"]').fill('Ricevimento');
  await last.locator('[data-k="place"]').fill('Villa Cimbrone');
  await last.locator('[data-k="address"]').fill('Via Santa Chiara 26, Ravello');
  await page.click('#suggest');
  await page.fill('input[name="iban"]', 'IT60 X054 2811 1010 0000 0123 456');
  await page.fill('input[name="customQuestion"]', 'Ti serve il bus navetta?');
  await page.waitForSelector('#save-status[data-state="saved"]', { timeout: 10000 });
  await page.waitForTimeout(900);
  const frame = page.frameLocator('#preview');
  await frame.locator('h1.names').waitFor();
  const names = await frame.locator('h1.names').innerText();
  assert(names.includes('Giulia') && names.includes('Edoardo'), `preview names: ${names}`);
  assert((await frame.locator('body').getAttribute('class')).includes('t-limoni'), 'theme not applied in preview');
  assert((await page.locator('#iban-hint').innerText()).includes('corretto'), 'IBAN hint should be positive');
  const moments = await frame.locator('.moment').count();
  assert(moments === 2, `expected 2 programme items, got ${moments}`);
});

async function makeCoverPhoto(path) {
  const { ctx, page } = await newPage({ viewport: { width: 800, height: 1000 } });
  await page.setContent(`<body style="margin:0"><div style="position:relative;width:800px;height:1000px;overflow:hidden;
    background:linear-gradient(180deg,#f6b38a 0%,#f7cf9f 34%,#fde7c8 52%,#7fb3c8 53%,#3f7f9c 100%)">
    <div style="position:absolute;left:470px;top:330px;width:190px;height:190px;border-radius:50%;background:radial-gradient(#fff4d6,#ffd48a 70%);box-shadow:0 0 120px 40px rgba(255,214,140,.6)"></div>
    <div style="position:absolute;left:0;right:0;top:530px;height:470px;background:repeating-linear-gradient(180deg,rgba(255,255,255,.18) 0 3px,transparent 3px 22px)"></div>
    <svg style="position:absolute;left:0;bottom:0" width="800" height="520" viewBox="0 0 800 520"><path d="M0 520V250q120-60 230-10t210 40 360-80V520Z" fill="#3c5a3a"/><path d="M0 520V340q160-50 300 10t500-40V520Z" fill="#2b4430"/>
    <g fill="#1d1a1c"><circle cx="300" cy="300" r="16"/><path d="M286 316h28l10 120h-48z"/><circle cx="350" cy="292" r="17"/><path d="M334 309h32l14 130h-58z"/></g></svg>
  </div></body>`);
  await page.screenshot({ path, type: 'jpeg', quality: 88 });
  await ctx.close();
}

await step('cover photo upload (resized in the browser) and type check', async () => {
  const { page } = host;
  await makeCoverPhoto(`${OUT}/cover.jpg`);
  await page.setInputFiles('#cover-input', `${OUT}/cover.jpg`);
  await page.waitForSelector('#cover-preview:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(800);
  const src = await page.frameLocator('#preview').locator('.cover img').getAttribute('src');
  assert(src && src.startsWith('/media/c/'), `cover not in preview: ${src}`);
  const img = await fetch(BASE + src);
  assert(img.status === 200 && img.headers.get('content-type') === 'image/jpeg', 'media not served as jpeg');
  const bad = await fetch(`${BASE}/gestisci/${state.token}/foto`, { method: 'POST', body: 'definitely not an image' });
  assert(bad.status === 415, `non-image upload should be 415, got ${bad.status}`);
  await page.screenshot({ path: `${OUT}/02-editor-desktop.png`, fullPage: false });
});

await step('draft is protected: watermark on, RSVP refused', async () => {
  const dash = await fetch(`${BASE}/gestisci/${state.token}`);
  const html = await dash.text();
  const pub = html.match(/href="(\/i\/[a-z0-9]+)"/);
  assert(pub, 'draft public link not found on dashboard');
  state.draftPath = pub[1];
  const page = await (await fetch(BASE + state.draftPath)).text();
  assert(page.includes('ANTEPRIMA') && page.includes('non è ancora stato pubblicato'), 'draft banner/watermark missing');
  const r = await fetch(`${BASE}${state.draftPath}/rsvp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'X', attending: 'yes' }) });
  assert(r.status === 403, `RSVP on draft should be 403, got ${r.status}`);
});

console.log('▸ payment with Stripe Checkout');
await step('publish requires consent', async () => {
  const r = await fetch(`${BASE}/gestisci/${state.token}/attiva`, { method: 'POST', redirect: 'manual' });
  assert(r.status === 303 && r.headers.get('location').includes('msg=consenso'), 'missing consent should bounce back');
});

await step('checkout → pay → back to dashboard → invitation online', async () => {
  const { page } = host;
  await page.goto(`${BASE}/gestisci/${state.token}`);
  assert(await page.isVisible('#pubblica'), 'publish card missing');
  await page.screenshot({ path: `${OUT}/03-publish-card.png` });
  await page.check('#pubblica input[name="consenso"]');
  await page.click('#pubblica button[type="submit"]');
  await page.waitForURL(/msg=pagato/, { timeout: 20000 });
  assert(await page.isVisible('.badge-live'), 'invitation not online after payment');
  const created = stripe.requests.find((r) => r.method === 'POST' && r.path === '/v1/checkout/sessions');
  const params = new URLSearchParams(created.body);
  assert(params.get('line_items[0][price_data][unit_amount]') === '3900', 'wedding should cost 39 €');
  assert(params.get('allow_promotion_codes') === 'true', 'promo codes should be enabled');
  assert(params.get('locale') === 'it', 'checkout should be in Italian');
  state.publicUrl = await page.inputValue('#public-url');
  assert(/\/i\/giulia-e-edoardo-[a-z0-9]{4}$/.test(state.publicUrl), `pretty link expected, got ${state.publicUrl}`);
});

await step('old draft link keeps working after activation', async () => {
  const r = await fetch(BASE + state.draftPath);
  const html = await r.text();
  assert(r.status === 200 && !html.includes('ANTEPRIMA'), 'draft link should now show the live invitation');
});

console.log('▸ guest list and personal links');
await step('add guests one by one and in bulk', async () => {
  const { page } = host;
  await page.goto(`${BASE}/gestisci/${state.token}#invitati`);
  await page.fill('.guest-form input[name="name"]', 'Zia Carla e Zio Paolo');
  await page.fill('.guest-form input[name="seats"]', '2');
  await page.fill('.guest-form input[name="phone"]', '333 1234567');
  await page.click('.guest-form .guest-form-row button[type="submit"]');
  await page.waitForURL(/msg=invitati/);
  await page.click('.bulk summary');
  await page.fill('textarea[name="bulk"]', 'Famiglia Bianchi, 4, 347 7654321\nNonna Pina\nGiorgio e Sara; 2');
  await page.click('.bulk button[type="submit"]');
  await page.waitForURL(/msg=invitati/);
  const count = await page.locator('.guest').count();
  assert(count === 4, `expected 4 guests, got ${count}`);
  const wa = await page.locator('.guest').first().locator('a.btn-wa').getAttribute('href');
  assert(wa.startsWith('https://wa.me/393331234567?text='), `WhatsApp link wrong: ${wa}`);
  assert(decodeURIComponent(wa).includes('Zia Carla e Zio Paolo'), 'WhatsApp text should greet the guest');
  const copy = await page.locator('.guest').first().locator('[data-copy]').getAttribute('data-copy');
  state.guestUrl = copy;
});

await step('guest opens personal link: envelope, greeting, RSVP within reserved seats', async () => {
  const { ctx, page } = await newPage(mobile, 'no-preference');
  await page.goto(state.guestUrl);
  assert((await page.innerText('.env-guest')).includes('Zia Carla'), 'envelope should greet the guest');
  await page.screenshot({ path: `${OUT}/04-envelope-guest.png` });
  await page.click('#env-open', { force: true });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${OUT}/05-envelope-opening.png` });
  await page.waitForSelector('#envelope', { state: 'detached', timeout: 6000 });
  await page.screenshot({ path: `${OUT}/06-invite-top.png` });
  await page.locator('#rsvp').scrollIntoViewIfNeeded();
  await page.check('input[name="attending"][value="yes"]', { force: true });
  await page.click('.stepper:first-child [data-step="1"]'); // try to exceed the 2 seats
  await page.click('.stepper:first-child [data-step="1"]');
  const adults = await page.inputValue('input[name="adults"]');
  assert(adults === '2', `seats limit not enforced in the form, adults=${adults}`);
  await page.fill('textarea[name="diet"]', '1 celiaca');
  await page.fill('input[name="answer"]', 'Sì, grazie');
  await page.fill('textarea[name="message"]', 'Che emozione! Vi vogliamo bene ❤️');
  await page.click('#rsvp-form button[type="submit"]');
  await page.waitForSelector('#rsvp-done:not([hidden])', { timeout: 8000 });
  await page.waitForTimeout(600);
  await page.locator('#rsvp-done').screenshot({ path: `${OUT}/07-rsvp-done.png` });
  // personal link reopened: previous answer is shown
  await page.reload();
  assert(await page.isVisible('#rsvp-already') || (await page.locator('#rsvp-already').count()) === 1, 'previous answer not shown on reopen');
  await ctx.close();
});

await step('someone answers "no" on the shared link; answer is remembered and editable', async () => {
  const { ctx, page } = await newPage(mobile);
  await page.goto(state.publicUrl);
  await openEnvelope(page);
  await page.fill('input[name="name"]', 'Marco Rossi');
  await page.check('input[name="attending"][value="no"]', { force: true });
  assert(!(await page.isVisible('.if-yes')), 'guest count should hide when answering no');
  await page.fill('textarea[name="message"]', 'Mi dispiace tantissimo, sarò con voi col cuore');
  await page.click('#rsvp-form button[type="submit"]');
  await page.waitForSelector('#rsvp-done.no:not([hidden])');
  await page.reload();
  await openEnvelope(page);
  assert(await page.isVisible('#rsvp-done.no'), 'answer not remembered after reload');
  await page.click('#rsvp-edit');
  await page.check('input[name="attending"][value="yes"]', { force: true });
  await page.click('#rsvp-form button[type="submit"]');
  await page.waitForSelector('#rsvp-done:not(.no):not([hidden])');
  await ctx.close();
});

await step('full invitation renders for screenshots (mobile)', async () => {
  const { ctx, page } = await newPage(mobile);
  await page.goto(state.publicUrl);
  await openEnvelope(page);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/08-invite-full.png`, fullPage: true });
  await ctx.close();
});

await step('API validation: name required, honeypot ignored, CSV safe', async () => {
  const path = new URL(state.publicUrl).pathname;
  const post = (body) => fetch(`${BASE}${path}/rsvp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert((await post({ attending: 'yes' })).status === 400, 'missing name must be rejected');
  const hp = await (await post({ name: 'Spam bot', attending: 'yes', website: 'http://spam' })).json();
  assert(hp.ok === true, 'honeypot should look successful');
  await post({ name: '=cmd|calc', attending: 'yes', adults: 1 });
  const bytes = new Uint8Array(await (await fetch(`${BASE}/gestisci/${state.token}/risposte.csv`)).arrayBuffer());
  assert(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, 'CSV must start with a UTF-8 BOM (for Excel)');
  const csv = new TextDecoder().decode(bytes);
  assert(csv.startsWith('Nome;Risposta'), 'CSV header wrong');
  assert(!csv.includes('Spam bot'), 'honeypot answer must not be stored');
  assert(csv.includes("'=cmd|calc"), 'formula injection not neutralised');
  assert(csv.includes('Zia Carla e Zio Paolo') && csv.includes('1 celiaca'), 'guest answer missing from CSV');
  assert(csv.includes('Nonna Pina;Nessuna risposta'), 'guests without answer should be listed');
  writeFileSync(`${OUT}/risposte.csv`, csv);
});

await step('dashboard shows stats, guest states and messages', async () => {
  const { page } = host;
  await page.goto(`${BASE}/gestisci/${state.token}`);
  const people = await page.locator('.stat').first().locator('.stat-n').innerText();
  assert(Number(people) >= 3, `confirmed people should be >= 3, got ${people}`);
  await page.screenshot({ path: `${OUT}/09-dashboard-desktop.png`, fullPage: true });
  await page.click('[data-tab="invitati"]');
  assert(await page.locator('.guest[data-state="yes"]').count() === 1, 'one guest should be confirmed');
  await page.screenshot({ path: `${OUT}/10-guests-desktop.png`, fullPage: true });
  await page.click('[data-tab="dediche"]');
  assert((await page.locator('.msg').count()) >= 2, 'messages missing');
});

await step('mobile editor: preview overlay opens', async () => {
  const { ctx, page } = await newPage(mobile);
  await page.goto(`${BASE}/gestisci/${state.token}/modifica`);
  await page.screenshot({ path: `${OUT}/11-editor-mobile.png` });
  await page.click('#open-preview');
  await page.waitForSelector('#preview-pane.open');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/12-editor-mobile-preview.png` });
  await ctx.close();
});

console.log('▸ Stripe webhook');
await step('webhook with a valid signature activates a second invitation', async () => {
  const created = await fetch(`${BASE}/crea`, { method: 'POST', body: new URLSearchParams({ type: 'battesimo' }), redirect: 'manual' });
  const token = created.headers.get('location').match(/gestisci\/([A-Za-z0-9]+)/)[1];
  state.token2 = token;
  const go = await fetch(`${BASE}/gestisci/${token}/attiva`, { method: 'POST', body: new URLSearchParams({ consenso: '1' }), redirect: 'manual' });
  const payUrl = go.headers.get('location');
  assert(payUrl.startsWith('http://127.0.0.1:12111/pay/'), `should redirect to checkout, got ${payUrl}`);
  const session = stripe.markPaid(payUrl.split('/').pop());
  const payload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed', data: { object: session } });
  const bad = await fetch(`${BASE}/api/stripe/webhook`, { method: 'POST', body: payload, headers: { 'stripe-signature': 't=1,v1=deadbeef' } });
  assert(bad.status === 400, 'bad signature must be rejected');
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', WEBHOOK_SECRET).update(`${t}.${payload}`).digest('hex');
  const ok = await fetch(`${BASE}/api/stripe/webhook`, { method: 'POST', body: payload, headers: { 'stripe-signature': `t=${t},v1=${sig}` } });
  assert(ok.status === 200, `webhook should be accepted, got ${ok.status}`);
  const again = await fetch(`${BASE}/api/stripe/webhook`, { method: 'POST', body: payload, headers: { 'stripe-signature': `t=${t},v1=${sig}` } });
  assert(again.status === 200, 'duplicate webhook should be harmless');
  const dash = await (await fetch(`${BASE}/gestisci/${token}`)).text();
  assert(dash.includes('badge-live'), 'invitation should be online after webhook');
});

console.log('▸ owner area, privacy and retention');
await step('/admin needs the password and shows revenue', async () => {
  assert((await fetch(`${BASE}/admin`)).status === 401, 'admin without password should be 401');
  const html = await (await fetch(`${BASE}/admin`, { headers: { Authorization: ADMIN } })).text();
  assert(/58[\s\u00a0]€/.test(html), 'revenue should be 39 € + 19 € = 58 €');
  const { ctx, page } = await newPage({ ...desktop, httpCredentials: { username: 'admin', password: 'test-admin' } });
  await page.goto(`${BASE}/admin`);
  await page.screenshot({ path: `${OUT}/13-admin.png`, fullPage: true });
  await ctx.close();
});

await step('management links are unguessable: wrong token → 404', async () => {
  assert((await fetch(`${BASE}/gestisci/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`)).status === 404, 'wrong token should 404');
});

await step('nightly cleanup deletes invitations long after the event', async () => {
  const created = await fetch(`${BASE}/crea`, { method: 'POST', body: new URLSearchParams({ type: 'festa' }), redirect: 'manual' });
  const token = created.headers.get('location').match(/gestisci\/([A-Za-z0-9]+)/)[1];
  const save = await fetch(`${BASE}/gestisci/${token}/salva`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: { date: '2020-05-01' } }) });
  assert(save.ok, 'save failed');
  const cron = await fetch(`${BASE}/__scheduled?cron=17+3+*+*+*`);
  assert(cron.ok, `scheduled trigger failed: ${cron.status}`);
  await waitFor(async () => (await fetch(`${BASE}/gestisci/${token}`)).status === 404, 10000);
  assert((await fetch(`${BASE}/gestisci/${state.token}`)).status === 200, 'current invitation must survive cleanup');
});

await step('host can delete the invitation (GDPR)', async () => {
  const r = await fetch(`${BASE}/gestisci/${state.token2}/elimina`, { method: 'POST', body: new URLSearchParams({ conferma: '1' }) });
  assert(r.status === 200, 'delete failed');
  assert((await fetch(`${BASE}/gestisci/${state.token2}`)).status === 404, 'invitation still reachable after delete');
});

await step('demo pages and marketing screenshots (mobile)', async () => {
  const { ctx, page } = await newPage(mobile);
  await page.goto(`${BASE}/`);
  await page.screenshot({ path: `${OUT}/00-landing-mobile.png` });
  for (const t of ['ulivo', 'notte', 'alloro', 'cielo']) {
    await page.goto(`${BASE}/demo/${t}?busta=0`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${OUT}/theme-${t}.png` });
  }
  await ctx.close();
});

await step('no JavaScript errors on any page', async () => {
  assert(pageErrors.length === 0, pageErrors.join('\n'));
});

await host.ctx.close();
await browser.close();
await shutdown();
console.log(failures ? `\n${failures} test(s) failed` : '\nAll tests passed ✔');
if (failures) {
  writeFileSync(`${OUT}/server.log`, serverLog);
  process.exit(1);
}
