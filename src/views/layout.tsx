import type { Child } from 'hono/jsx';
import { raw } from 'hono/html';
import { dataUri, linen, paperGrain } from '../art';
import { BRAND, EVENTS } from '../config';
import { type UiIcon, uiIcon } from '../icons';

/** The sugared almond ("confetto") drawn in a single gold line. */
export const LOGO_SVG = `<svg viewBox="0 0 40 40" aria-hidden="true" class="logo-mark"><ellipse cx="20" cy="20.5" rx="9.5" ry="13" transform="rotate(-30 20 20.5)" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M14.6 13.4C16.4 11.2 19 10.2 21.4 10.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" transform="rotate(-30 20 20.5)"/></svg>`;

/** Linen and cotton-paper textures shared by every site page (drawn once per isolate). */
let textures = '';
const siteTextures = () => (textures ||= `:root{--linen:${dataUri(linen(200, 9, 0.6))};--grain:${dataUri(paperGrain())}}`);

export function Logo() {
  return (
    <a href="/" class="logo" aria-label={`${BRAND.name}, torna alla home`}>
      {raw(LOGO_SVG)}
      <span>{BRAND.name}</span>
    </a>
  );
}

interface LayoutProps {
  title: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  bodyClass?: string;
  scripts?: string[];
  ogImage?: string;
  jsonLd?: object;
  header?: Child;
  hideFooter?: boolean;
  children?: Child;
}

export function SiteHeader() {
  return (
    <header class="site-header">
      <div class="container header-inner">
        <Logo />
        <nav class="nav" aria-label="Principale">
          <a href="/#esempi">Esempi</a>
          <a href="/#prezzi">Prezzi</a>
          <a href="/#domande">Domande</a>
        </nav>
        <a class="btn btn-primary btn-sm" href="/crea">
          Crea il tuo invito
        </a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer class="site-footer">
      <div class="container footer-grid">
        <div>
          <Logo />
          <p class="muted small">{BRAND.tagline}. Inviti digitali con conferme di presenza per matrimoni, battesimi, comunioni, lauree e feste.</p>
        </div>
        <div>
          <p class="footer-title">Inviti per</p>
          <ul class="footer-links">
            {EVENTS.map((e) => (
              <li>
                <a href={`/inviti/${e.slug}`}>{e.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p class="footer-title">Frasi per inviti</p>
          <ul class="footer-links">
            {EVENTS.slice(0, 7).map((e) => (
              <li>
                <a href={`/frasi/${e.slug}`}>Frasi {e.label.toLowerCase()}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p class="footer-title">{BRAND.name}</p>
          <ul class="footer-links">
            <li>
              <a href="/crea">Crea un invito</a>
            </li>
            <li>
              <a href="/recupera">Ritrova i tuoi inviti</a>
            </li>
            <li>
              <a href="/privacy">Privacy</a>
            </li>
            <li>
              <a href="/termini">Termini di servizio</a>
            </li>
            <li>
              <a href={`mailto:${BRAND.supportEmail}`}>Contatti</a>
            </li>
          </ul>
        </div>
      </div>
      <div class="container footer-bottom small muted">
        © {new Date().getFullYear()} {BRAND.legalName} · P.IVA {BRAND.vatNumber}
      </div>
    </footer>
  );
}

export function Layout(p: LayoutProps) {
  return (
    <html lang="it">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{p.title}</title>
        {p.description && <meta name="description" content={p.description} />}
        {p.canonical && <link rel="canonical" href={p.canonical} />}
        {p.noindex && <meta name="robots" content="noindex, nofollow" />}
        <meta name="theme-color" content="#f3ede3" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND.name} />
        <meta property="og:title" content={p.title} />
        {p.description && <meta property="og:description" content={p.description} />}
        {p.ogImage && <meta property="og:image" content={p.ogImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preload" href="/fonts/cormorant-garamond-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
        <link rel="preload" href="/fonts/cinzel-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
        <link rel="preload" href="/fonts/jost-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin="anonymous" />
        <link rel="stylesheet" href="/css/fonts.css" />
        <link rel="stylesheet" href="/css/app.css" />
        <style>{raw(siteTextures())}</style>
        {p.jsonLd && <script type="application/ld+json">{raw(JSON.stringify(p.jsonLd).replace(/</g, '\\u003c'))}</script>}
        {(p.scripts ?? []).map((s) => (
          <script src={s} defer></script>
        ))}
      </head>
      <body class={p.bodyClass ?? ''}>
        {p.header ?? <SiteHeader />}
        {p.children}
        {!p.hideFooter && <SiteFooter />}
        <div class="toast" id="toast" role="status" aria-live="polite"></div>
      </body>
    </html>
  );
}

/** Simple centered message page (errors, confirmations). */
export function MessagePage(p: { title: string; icon?: UiIcon; children?: Child; noindex?: boolean }) {
  return (
    <Layout title={`${p.title} · ${BRAND.name}`} noindex={p.noindex ?? true}>
      <main class="container narrow message-page">
        {p.icon && <p class="big-icon">{raw(uiIcon(p.icon))}</p>}
        <h1 class="h2">{p.title}</h1>
        {p.children}
      </main>
    </Layout>
  );
}
