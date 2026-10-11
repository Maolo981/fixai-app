// Generates the static images used by the site (run with the dev server on BASE_URL):
//   public/img/themes/<theme>.webp      theme cards on the landing page
//   public/img/themes/<theme>-sm.webp   theme picker in the editor
//   public/og/<theme>.png               WhatsApp/Facebook preview of invitations without a photo
//   public/og/brand.png                 preview of the landing page
// Usage: BASE_URL=http://127.0.0.1:8787 node scripts/og-images.mjs
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8787';
const THEMES = ['ulivo', 'avorio', 'limoni', 'notte', 'alloro', 'cielo', 'cipria', 'spiga', 'coriandoli'];
mkdirSync('public/img/themes', { recursive: true });
mkdirSync('public/og', { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });

/** Encodes a PNG buffer to WebP (optionally resized) using Chromium's canvas encoder. */
async function toWebp(page, png, width, quality = 0.82) {
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
  const out = await page.evaluate(
    async ({ dataUrl, width, quality }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const w = width || img.naturalWidth;
      const h = Math.round((img.naturalHeight * w) / img.naturalWidth);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL('image/webp', quality);
    },
    { dataUrl, width, quality },
  );
  return Buffer.from(out.split(',')[1], 'base64');
}

const ctx = await browser.newContext({ viewport: { width: 390, height: 520 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const scratch = await ctx.newPage();
await scratch.goto(`${BASE}/robots.txt`);
for (const t of THEMES) {
  await page.goto(`${BASE}/demo/${t}?busta=0`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  writeFileSync(`public/img/themes/${t}.webp`, await toWebp(scratch, png, 0, 0.8));
  writeFileSync(`public/img/themes/${t}-sm.webp`, await toWebp(scratch, png, 240, 0.8));
  console.log('theme', t);
}

const og = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const ogPage = await og.newPage();
for (const t of THEMES) {
  await ogPage.goto(`${BASE}/demo/${t}?og=1`, { waitUntil: 'networkidle' });
  await ogPage.addStyleTag({ content: '.env-hint{display:none}.env{animation:none}.env-guest{font-size:58px}.env-screen{gap:40px}' });
  await ogPage.evaluate(() => document.fonts.ready);
  await ogPage.screenshot({ path: `public/og/${t}.png` });
  console.log('og', t);
}

await ogPage.setContent(`<!doctype html><html><head><link rel="stylesheet" href="${BASE}/css/fonts.css"><style>
  body{margin:0;width:1200px;height:630px;display:flex;align-items:center;justify-content:center;font-family:Jost,sans-serif;
  background:radial-gradient(700px 420px at 85% 15%,#f8dfe5,transparent 60%),radial-gradient(600px 420px at 10% 90%,#e3f1e8,transparent 60%),#fbf6f0;color:#2a2223}
  .wrap{text-align:center;max-width:980px}
  .logo{display:inline-flex;align-items:center;gap:16px;font-family:'DM Serif Display';font-size:56px}
  h1{font-family:'DM Serif Display';font-weight:400;font-size:74px;line-height:1.05;margin:26px 0 18px}
  h1 em{color:#b8475f}
  p{font-size:30px;color:#6e6365;margin:0}
</style></head><body><div class="wrap">
  <div class="logo"><svg width="64" height="64" viewBox="0 0 40 40"><ellipse cx="20" cy="20.5" rx="10.5" ry="14" transform="rotate(-28 20 20.5)" fill="#fff6f2" stroke="#b8475f" stroke-width="2"/><ellipse cx="16" cy="15" rx="2.6" ry="5.2" transform="rotate(-28 16 15)" fill="#f2c6cf"/></svg>confetto</div>
  <h1>Il tuo invito arriva su WhatsApp.<br><em>Le conferme arrivano da sole.</em></h1>
  <p>Matrimoni · Battesimi · Comunioni · Lauree · Compleanni</p>
</div></body></html>`, { waitUntil: 'networkidle' });
await ogPage.evaluate(() => document.fonts.ready);
await ogPage.screenshot({ path: 'public/og/brand.png' });
console.log('og brand');
await browser.close();
