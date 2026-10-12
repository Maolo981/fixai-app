// End-to-end tests: real Worker (wrangler dev, local D1/R2) + fake Stripe + headless Chromium.
// Run with: npm test   (screenshots end up in tests/output/)
import { execFileSync, spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { AI_TEXT, startMockApis } from './mock-apis.mjs';

const PORT = 8790;
const BASE = `http://127.0.0.1:${PORT}`;
const STATE = '.wrangler/test-state';
const OUT = 'tests/output';
const WEBHOOK_SECRET = 'whsec_test';
const TG_SECRET = 'tg-secret-test';
const MOCK = 'http://127.0.0.1:12111';
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
  [
    'STRIPE_SECRET_KEY=sk_test_mock',
    `STRIPE_API_BASE=${MOCK}`,
    `STRIPE_WEBHOOK_SECRET=${WEBHOOK_SECRET}`,
    'ADMIN_PASSWORD=test-admin',
    'ALLOW_FREE_ACTIVATION=false',
    'CF_ANALYTICS_TOKEN=test-token',
    'TELEGRAM_BOT_TOKEN=123456:test',
    'TELEGRAM_BOT_NAME=ConfettoTestBot',
    `TELEGRAM_WEBHOOK_SECRET=${TG_SECRET}`,
    `TELEGRAM_API_BASE=${MOCK}`,
    'ANTHROPIC_API_KEY=sk-ant-test',
    `ANTHROPIC_API_BASE=${MOCK}`,
    `WEATHER_API_BASE=${MOCK}`,
  ].join('\n'),
);

console.log('▸ starting fake external APIs (Stripe, Telegram, Claude, Open-Meteo) and the Worker');
const stripe = await startMockApis(12111);
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

await step('photo styles: the picker appears with a photo and restyles the preview', async () => {
  const { page } = host;
  await page.waitForSelector('#photo-styles:not([hidden])');
  for (const style of ['polaroid', 'cerchio', 'grande', 'arco']) {
    await page.click(`label.ps-opt:has(input[value="${style}"])`);
    await page.waitForSelector('#save-status[data-state="saved"]', { timeout: 10000 });
    await page.frameLocator('#preview').locator(`.cover-${style} img`).waitFor({ timeout: 10000 });
  }
  const demo = await (await fetch(`${BASE}/demo/ulivo?busta=0&foto=grande`)).text();
  assert(demo.includes('class="cover cover-grande"') && !demo.includes('class="art art-top"'), 'the big photo should replace the artwork at the top');
});

await step('every style renders its example invitation', async () => {
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const ids = [...new Set([...sitemap.matchAll(/\/demo\/([a-z]+)</g)].map((m) => m[1]))];
  assert(ids.length >= 30, `expected 30+ styles in the sitemap, got ${ids.length}`);
  for (const id of ids) {
    const res = await fetch(`${BASE}/demo/${id}?busta=0`);
    const html = await res.text();
    assert(res.status === 200 && html.includes(`t-${id}`) && html.includes('--paper:'), `style ${id} does not render`);
  }
});

await step('editor: registry, story, stays, rides, menus, notice, tables and private steps', async () => {
  const { page } = host;
  // the reception is only for guests invited to everything
  await page.locator('[data-moment]').nth(1).locator('[data-k="restricted"]').check();
  assert((await page.inputValue('input[name="menuOptions"]')).includes('Vegetariano'), 'weddings should ask the menu by default');
  await page.click('label.toggle:has(input[name="askSong"])');
  await page.click('label.toggle:has(input[name="ridesBoard"])');
  await page.click('[data-add-row="gifts"]');
  let row = page.locator('[data-rows="gifts"] [data-row]').last();
  await row.locator('[data-k="title"]').fill('Macchina del caffè');
  await row.locator('[data-k="price"]').fill('180');
  await page.click('[data-add-row="gifts"]');
  row = page.locator('[data-rows="gifts"] [data-row]').last();
  await row.locator('[data-k="kind"]').selectOption('fund');
  await row.locator('[data-k="title"]').fill('Viaggio di nozze in Giappone');
  await row.locator('[data-k="price"]').fill('3000');
  await page.click('[data-add-row="story"]');
  row = page.locator('[data-rows="story"] [data-row]').last();
  await row.locator('[data-k="when"]').fill('2016');
  await row.locator('[data-k="title"]').fill('Il primo incontro');
  await page.click('[data-add-row="stays"]');
  row = page.locator('[data-rows="stays"] [data-row]').last();
  await row.locator('[data-k="name"]').fill('Hotel Villa Rosa');
  await row.locator('[data-k="address"]').fill('Via Roma 12, Ravello');
  await page.selectOption('select[name="tableReveal"]', 'always');
  await page.fill('textarea[name="notice"]', 'Il ricevimento inizierà alle 14:30.');
  await page.waitForSelector('#save-status[data-state="saved"]', { timeout: 10000 });
  await page.waitForTimeout(1200);
  const frame = page.frameLocator('#preview');
  await frame.locator('.registry').waitFor();
  assert((await frame.locator('.registry .gift').count()) === 2, 'registry should list 2 gifts');
  assert((await frame.locator('.story li').count()) === 1, 'story missing');
  assert((await frame.locator('.stay').count()) === 1, 'stay missing');
  assert((await frame.locator('.notice-banner').count()) === 1, 'notice missing');
  assert((await frame.locator('.m-tag').count()) === 1, 'the preview should mark the private step');
  assert((await frame.locator('input[name="song"]').count()) === 1, 'song question missing');
});

await step('AI rewrite of the message (Claude API, mocked)', async () => {
  const { page } = host;
  await page.waitForSelector('#ai-tools');
  const before = await page.inputValue('textarea[name="message"]');
  await page.click('[data-ai-tone="formale"]');
  await page.waitForFunction((t) => document.querySelector('textarea[name="message"]').value === t, AI_TEXT, { timeout: 15000 });
  const call = stripe.requests.find((r) => r.path === '/v1/messages');
  const sent = JSON.parse(call.body);
  assert(sent.model === 'claude-opus-5-5', `model: ${sent.model}`);
  assert(sent.fallbacks === 'default', 'server-side fallbacks should be on');
  assert(sent.output_config?.effort === 'low', 'effort should be low');
  assert(String(call.headers['anthropic-beta']).includes('server-side-fallback-2026-07-01'), 'fallback beta header missing');
  assert(JSON.stringify(sent.messages).includes('Giulia'), 'the names should be sent as context');
  await page.click('#ai-undo');
  assert((await page.inputValue('textarea[name="message"]')) === before, 'undo should restore the text');
  await page.waitForSelector('#save-status[data-state="saved"]', { timeout: 10000 });
});

await step('photo gallery: upload two photos, remove one', async () => {
  const { page } = host;
  await page.setInputFiles('#gallery-input', [`${OUT}/cover.jpg`, `${OUT}/cover.jpg`]);
  await page.waitForFunction(() => document.querySelectorAll('#gallery figure').length === 2, null, { timeout: 20000 });
  await page.locator('#gallery figure').first().locator('[data-gallery-remove]').click();
  await page.waitForFunction(() => document.querySelectorAll('#gallery figure').length === 1, null, { timeout: 10000 });
  await page.waitForTimeout(1200);
  assert((await page.frameLocator('#preview').locator('.gallery button').count()) === 1, 'the preview gallery should show 1 photo');
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
  await page.fill('.guest-form.card input[name="name"]', 'Zia Carla e Zio Paolo');
  await page.fill('.guest-form.card input[name="seats"]', '2');
  await page.fill('.guest-form.card input[name="phone"]', '333 1234567');
  await page.fill('.guest-form.card input[name="grp"]', 'Famiglia');
  await page.fill('.guest-form.card input[name="table"]', 'Tavolo 4');
  await page.click('.guest-form.card .guest-form-actions button[type="submit"]');
  await page.waitForURL(/msg=invitati/);
  await page.click('.bulk summary');
  await page.fill('textarea[name="bulk"]', 'Famiglia Bianchi, 4, 347 7654321\nNonna Pina\nGiorgio e Sara; 2');
  await page.click('.bulk button[type="submit"]');
  await page.waitForURL(/msg=invitati/);
  // colleagues are invited to the ceremony only
  await page.fill('.guest-form.card input[name="name"]', 'Colleghi di Giulia');
  await page.fill('.guest-form.card input[name="seats"]', '3');
  await page.fill('.guest-form.card input[name="grp"]', 'Colleghi');
  await page.check('.guest-form.card input[name="partial"]');
  await page.click('.guest-form.card .guest-form-actions button[type="submit"]');
  await page.waitForURL(/msg=invitati/);
  const count = await page.locator('.guest').count();
  assert(count === 5, `expected 5 guests, got ${count}`);
  await page.click('[data-group-filter="Colleghi"]');
  assert((await page.locator('.guest:not([hidden])').count()) === 1, 'group filter should show 1 guest');
  await page.click('[data-group-filter=""]');
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
  assert((await page.innerText('.table-banner')).includes('Tavolo 4'), 'the personal link should show the table');
  assert((await page.locator('.moment').count()) === 2, 'a guest invited to everything sees both steps');
  const people = page.locator('.people .person');
  assert((await people.count()) === 2, 'one row per person expected');
  await people.nth(0).locator('[data-p="name"]').fill('Carla');
  await people.nth(0).locator('[data-p="menu"]').selectOption('Pesce');
  await people.nth(1).locator('[data-p="name"]').fill('Paolo');
  await page.click('#rsvp-form button[type="submit"]');
  assert((await page.innerText('#rsvp-form .form-msg')).includes('menu'), 'the menu of each person should be required');
  await people.nth(1).locator('[data-p="menu"]').selectOption('Carne');
  await page.fill('input[name="song"]', 'Volare - Domenico Modugno');
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
  await page.fill('#rsvp-form input[name="name"]', 'Marco Rossi');
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
  assert((await page.inputValue('.person [data-p="name"]')) === 'Marco Rossi', 'the first person should be the one answering');
  await page.selectOption('.person [data-p="menu"]', 'Vegetariano');
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

console.log('▸ guests, tables, registry, rides and sharing');
await step('private steps: only guests invited to everything see the reception', async () => {
  const zia = await (await fetch(state.guestUrl)).text();
  assert(zia.includes('Villa Cimbrone'), 'a guest invited to everything should see the reception');
  const pub = await (await fetch(state.publicUrl)).text();
  assert(!pub.includes('Villa Cimbrone'), 'the shared link must not show private steps');
  const { page } = host;
  await page.goto(`${BASE}/gestisci/${state.token}#invitati`);
  const colleghi = await page.locator('.guest', { hasText: 'Colleghi di Giulia' }).locator('[data-copy]').getAttribute('data-copy');
  const col = await (await fetch(colleghi)).text();
  assert(!col.includes('Villa Cimbrone') && col.includes('Duomo'), 'colleagues should only see the ceremony');
});

await step('tables: finder at the venue, tableau and printables', async () => {
  const path = new URL(state.publicUrl).pathname;
  const found = await (await fetch(`${BASE}${path}/tavolo?nome=carla`)).text();
  assert(found.includes('Tavolo 4'), 'the finder should find Zia Carla');
  const byPerson = await (await fetch(`${BASE}${path}/tavolo?nome=paolo`)).text();
  assert(byPerson.includes('Tavolo 4'), 'the finder should find people by the names in the answer');
  const nothing = await (await fetch(`${BASE}${path}/tavolo?nome=zzzz`)).text();
  assert(nothing.includes('Nessun risultato'), 'unknown names should find nothing');
  const tableau = await (await fetch(`${BASE}/gestisci/${state.token}/tableau`)).text();
  assert(tableau.includes('Tavolo 4') && tableau.includes('Carla, Paolo'), 'the tableau should list the table with its people');
  const print = await (await fetch(`${BASE}/gestisci/${state.token}/stampa`)).text();
  assert(print.includes('<svg') && print.includes('Conferma la tua presenza'), 'the printable invitation needs the QR code');
  const cards = await (await fetch(`${BASE}/gestisci/${state.token}/stampa?invitati=1`)).text();
  assert((cards.match(/class="gcard"/g) || []).length === 5, 'one card per guest');
  const { ctx, page } = await newPage(desktop);
  await page.goto(`${BASE}/gestisci/${state.token}/tableau`);
  await page.screenshot({ path: `${OUT}/14-tableau.png`, fullPage: true });
  await page.goto(`${BASE}/gestisci/${state.token}/stampa`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/15-print.png`, fullPage: true });
  await ctx.close();
});

await step('gift registry: reserve a present, chip in to the fund, cancel', async () => {
  const a = await newPage(mobile);
  await a.page.goto(state.publicUrl);
  await openEnvelope(a.page);
  const item = a.page.locator('.gift', { hasText: 'Macchina del caffè' });
  await item.locator('[data-gift-open]').click();
  await item.locator('input[name="name"]').fill('Marco Rossi');
  await item.locator('[type="submit"]').click();
  await a.page.waitForSelector('.gift.taken.mine');
  const b = await newPage(mobile);
  await b.page.goto(state.publicUrl);
  await openEnvelope(b.page);
  const itemB = b.page.locator('.gift', { hasText: 'Macchina del caffè' });
  assert((await itemB.locator('[data-gift-open]').count()) === 0, 'a reserved present must not be bookable twice');
  assert((await itemB.innerText()).includes('Già scelto'), 'a reserved present should say so');
  const fund = b.page.locator('.gift', { hasText: 'Viaggio di nozze' });
  await fund.locator('[data-gift-open]').click();
  await fund.locator('input[name="name"]').fill('Giorgio');
  await fund.locator('input[name="amount"]').fill('50');
  await fund.locator('[type="submit"]').click();
  await b.page.waitForFunction(() => /Raccolti 50/.test(document.querySelector('.gift-fund .fund-sum').textContent));
  await b.page.locator('.registry').screenshot({ path: `${OUT}/16-registry.png` });
  await item.locator('[data-gift-cancel]').click();
  await item.locator('[data-gift-open]').waitFor();
  await a.ctx.close();
  await b.ctx.close();
  // the server refuses double bookings and cancellations without the token
  const path = new URL(state.publicUrl).pathname;
  const html = await (await fetch(state.publicUrl)).text();
  const giftId = html.match(/data-gift="([a-z0-9]+)" data-kind="item"/)[1];
  const book = () => fetch(`${BASE}${path}/regali`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gift: giftId, name: 'Sara' }) });
  const first = await book();
  assert(first.status === 200, `booking failed: ${first.status}`);
  assert((await book()).status === 409, 'the second booking must be refused');
  const { id } = await first.json();
  const cancel = await fetch(`${BASE}${path}/regali/annulla`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, token: 'wrong' }) });
  assert(cancel.status === 404, 'cancelling needs the token of whoever booked');
});

await step('rides board: offer a lift, others see it, only the author deletes it', async () => {
  const path = new URL(state.publicUrl).pathname;
  const { ctx, page } = await newPage(mobile);
  await page.goto(state.publicUrl);
  await openEnvelope(page);
  await page.click('[data-ride-open]');
  await page.fill('[data-ride-form] input[name="place"]', 'Napoli Centrale');
  await page.fill('[data-ride-form] input[name="seats"]', '3');
  await page.fill('[data-ride-form] input[name="name"]', 'Luca');
  await page.fill('[data-ride-form] input[name="phone"]', '333 9876543');
  await page.click('[data-ride-form] button[type="submit"]');
  const ride = page.locator('.ride', { hasText: 'Napoli Centrale' });
  await ride.locator('[data-ride-delete]').waitFor();
  const wa = await ride.locator('a').getAttribute('href');
  assert(wa.startsWith('https://wa.me/393339876543'), `ride WhatsApp link wrong: ${wa}`);
  const other = await (await fetch(state.publicUrl)).text();
  assert(other.includes('Napoli Centrale'), 'other guests should see the ride');
  const rideId = other.match(/data-ride="([a-z0-9]+)"/)[1];
  const bad = await fetch(`${BASE}${path}/passaggi/elimina`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: rideId, token: 'nope' }) });
  assert(bad.status === 404, 'only the author can delete a ride');
  await ride.locator('[data-ride-delete]').click();
  await ride.waitFor({ state: 'detached' });
  await ctx.close();
});

await step('dashboard: menu totals, songs, gift reservations, catering Excel', async () => {
  const { page } = host;
  await page.goto(`${BASE}/gestisci/${state.token}`);
  const chips = await page.locator('.menu-totals').innerText();
  assert(/Pesce\s*1/.test(chips) && /Carne\s*1/.test(chips) && /Vegetariano\s*1/.test(chips), `menu totals: ${chips}`);
  await page.click('[data-tab="regali"]');
  const gifts = await page.locator('#regali').innerText();
  assert(gifts.includes('Giorgio · 50') && gifts.includes('Prenotato da Sara'), `registry in the dashboard: ${gifts}`);
  await page.screenshot({ path: `${OUT}/17-dashboard-gifts.png`, fullPage: true });
  await page.click('[data-tab="dediche"]');
  assert((await page.locator('.songs li').innerText()).includes('Volare'), 'songs missing');
  const csv = await (await fetch(`${BASE}/gestisci/${state.token}/catering.csv`)).text();
  assert(csv.includes('Carla;Adulto;Pesce') && csv.includes('Tavolo 4'), 'the catering CSV should list each person with menu and table');
  const answers = await (await fetch(`${BASE}/gestisci/${state.token}/risposte.csv`)).text();
  assert(answers.includes('Carla · Pesce | Paolo · Carne') && answers.includes('Volare'), 'the answers CSV should include people, menus and songs');
});

await step('co-organiser link: read-only and revocable', async () => {
  const { page } = host;
  await page.goto(`${BASE}/gestisci/${state.token}#condividi`);
  await page.click('#condividi button[type="submit"]');
  await page.waitForURL(/msg=link-condiviso/);
  const url = await page.locator('#condividi input').inputValue();
  assert(/\/vedi\/[A-Za-z0-9]{20,}$/.test(url), `viewer link: ${url}`);
  const html = await (await fetch(url)).text();
  assert(html.includes('Sola lettura') && html.includes('Zia Carla'), 'the viewer should see the answers');
  assert(!html.includes('method="post"'), 'the read-only page must not change anything');
  assert(!html.includes(state.token), 'the read-only page must never reveal the management link');
  assert((await fetch(`${url}/risposte.csv`)).status === 200, 'the viewer can download the Excel');
  page.once('dialog', (d) => d.accept());
  await page.click('#condividi button.link-danger');
  await page.waitForURL(/msg=link-revocato/);
  assert((await fetch(url)).status === 404, 'a revoked link must stop working');
});

await step('Telegram: link the chat with /start and receive new answers', async () => {
  const dash = await (await fetch(`${BASE}/gestisci/${state.token}`)).text();
  const code = dash.match(/https:\/\/t\.me\/ConfettoTestBot\?start=([a-z0-9]+)/)?.[1];
  assert(code, 'Telegram link missing on the dashboard');
  const hook = (body, secret = TG_SECRET) =>
    fetch(`${BASE}/api/telegram/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret }, body: JSON.stringify(body) });
  assert((await hook({ message: { text: `/start ${code}`, chat: { id: 1 } } }, 'wrong')).status === 401, 'the webhook needs the secret');
  await hook({ update_id: 0, message: { message_id: 1, text: `/start ${code}`, chat: { id: -100, type: 'group' } } });
  assert((await (await fetch(`${BASE}/gestisci/${state.token}`)).text()).includes(`start=${code}`), 'a group chat must not be linked');
  assert((await hook({ update_id: 1, message: { message_id: 1, text: `/start ${code}`, chat: { id: 4242, type: 'private' } } })).status === 200, 'webhook failed');
  const sent = (needle) => stripe.requests.some((r) => r.path.endsWith('/sendMessage') && JSON.parse(r.body).chat_id === '4242' && JSON.parse(r.body).text.includes(needle));
  await waitFor(() => sent('Fatto'), 10000);
  assert((await (await fetch(`${BASE}/gestisci/${state.token}`)).text()).includes('Collegato'), 'the dashboard should show Telegram as linked');
  const path = new URL(state.publicUrl).pathname;
  await fetch(`${BASE}${path}/rsvp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Elena Verdi', attending: 'yes', adults: 1, people: [{ name: 'Elena Verdi', menu: 'Pesce' }] }) });
  await waitFor(() => sent('Elena Verdi'), 10000);
  assert(!stripe.requests.some((r) => r.path.endsWith('/sendMessage') && r.body.includes(state.token)), 'Telegram messages must not contain the management link');
});

await step('notice: banner on the invitation, WhatsApp message from the dashboard', async () => {
  const pub = await (await fetch(state.publicUrl)).text();
  assert(pub.includes('notice-banner') && pub.includes('14:30'), 'notice banner missing');
  const dash = await (await fetch(`${BASE}/gestisci/${state.token}`)).text();
  assert(dash.includes('Manda l’avviso agli invitati'), 'the dashboard should offer to send the notice');
});

console.log('▸ weather, save the date, WhatsApp preview image');
await step('weather forecast appears in the 14 days before the event', async () => {
  const created = await fetch(`${BASE}/crea`, { method: 'POST', body: new URLSearchParams({ type: 'compleanno' }), redirect: 'manual' });
  state.token3 = created.headers.get('location').match(/gestisci\/([A-Za-z0-9]+)/)[1];
  const soon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const save = await fetch(`${BASE}/gestisci/${state.token3}/salva`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: { name1: 'Martina', date: soon, program: [{ time: '17:00', title: 'Festa', place: 'Villa Rufolo', address: 'Piazza Duomo, Ravello' }] } }),
  });
  assert(save.ok, 'save failed');
  const dash = await (await fetch(`${BASE}/gestisci/${state.token3}`)).text();
  state.path3 = dash.match(/href="(\/i\/[a-z0-9]+)"/)[1];
  const w = await (await fetch(`${BASE}${state.path3}/meteo`)).json();
  assert(w.ok && w.text.includes('Ravello') && w.title.includes('quasi sereno'), `forecast: ${JSON.stringify(w)}`);
  const { ctx, page } = await newPage(mobile);
  await page.goto(BASE + state.path3);
  await openEnvelope(page);
  await page.waitForSelector('.weather-sec:not([hidden])');
  assert((await page.innerText('.weather')).includes('27°'), 'the weather card should show the temperature');
  await ctx.close();
});

await step('WhatsApp preview image is drawn in the editor when there is no photo', async () => {
  const { ctx, page } = await newPage(desktop);
  await page.goto(`${BASE}/gestisci/${state.token3}/modifica`);
  await waitFor(async () => /property="og:image" content="[^"]*\/media\/c\//.test(await (await fetch(BASE + state.path3)).text()), 20000);
  await ctx.close();
});

await step('save the date: names and date only, no programme and no RSVP', async () => {
  await fetch(`${BASE}/gestisci/${state.token3}/salva`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: { saveTheDate: true } }) });
  const html = await (await fetch(BASE + state.path3)).text();
  assert(html.includes('Save the date') && !html.includes('id="rsvp-form"') && !html.includes('class="program sec"'), 'a save the date shows only names, date and place');
  const ics = await (await fetch(`${BASE}${state.path3}/calendario.ics`)).text();
  assert(ics.includes('Save the date'), 'the calendar entry should say save the date');
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
