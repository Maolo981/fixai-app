// Copies the self-hosted font files (SIL OFL) from @fontsource into public/fonts.
// Self-hosting avoids sending visitors' IPs to Google Fonts (GDPR).
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const FONTS = {
  'cormorant-garamond': ['400-normal', '400-italic', '500-normal', '500-italic', '600-normal'],
  'cinzel': ['400-normal', '500-normal', '600-normal'],
  'pinyon-script': ['400-normal'],
  'italiana': ['400-normal'],
  'dm-serif-display': ['400-normal', '400-italic'],
  'jost': ['300-normal', '400-normal', '500-normal', '600-normal'],
  'fredoka': ['400-normal', '500-normal', '600-normal'],
};

const out = new URL('../public/fonts/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
for (const [family, variants] of Object.entries(FONTS)) {
  for (const v of variants) {
    const file = `${family}-latin-${v}.woff2`;
    copyFileSync(join('node_modules/@fontsource', family, 'files', file), join(out, file));
    console.log('copied', file);
  }
}
