// Usage: node tests/shot.mjs <outDir> <name>=<url>[@open|@full|@desktop] ...
// Takes mobile screenshots with the preinstalled Chromium (used during development).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const [outDir, ...specs] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
for (const spec of specs) {
  const [name, rest] = spec.split(/=(.+)/);
  const [url, ...flags] = rest.split('@');
  const desktop = flags.includes('desktop');
  const ctx = await browser.newContext({
    viewport: desktop ? { width: 1280, height: 860 } : { width: 390, height: 844 },
    deviceScaleFactor: desktop ? 1 : 2,
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    reducedMotion: flags.some((f) => f === 'open' || f.startsWith('mid')) ? 'no-preference' : 'reduce',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`[${name}] pageerror:`, e.message));
  page.on('console', (m) => m.type() === 'error' && console.error(`[${name}] console:`, m.text()));
  await page.goto(url, { waitUntil: 'networkidle' });
  if (flags.includes('open')) {
    await page.click('#env-open', { force: true });
    await page.waitForTimeout(3300);
  }
  const mid = flags.find((f) => f.startsWith('mid'));
  if (mid) {
    await page.click('#env-open', { force: true });
    await page.waitForTimeout(Number(mid.slice(3)) || 1500);
  }
  if (flags.includes('full')) {
    // trigger lazy images before a full-page capture
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: flags.includes('full') });
  console.log('saved', `${outDir}/${name}.png`);
  await ctx.close();
}
await browser.close();
