import type { Child } from 'hono/jsx';
import { raw } from 'hono/html';
import { EVENT_BY_ID } from '../config';
import type { SeatedGuest } from '../db';
import { displayNames, parsePeople, publicPath, visibleProgram } from '../model';
import { qrSvg } from '../qr';
import { THEME_BY_ID, ornaments, themeInlineCss } from '../themes';
import type { GuestRow, Invitation } from '../types';
import { formatDateShort } from '../util';
import { HeroText, Monogram } from './invite';

type Inv = Pick<Invitation, 'id' | 'slug' | 'vanity' | 'event_type' | 'theme' | 'data' | 'admin_token'>;

/** A page drawn with the invitation's own paper, colours and type (screen and print). */
function PaperDoc(p: { inv: Inv; title: string; bodyClass: string; children?: Child; noindex?: boolean }) {
  const theme = THEME_BY_ID[p.inv.theme];
  return (
    <html lang="it">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{p.title}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content={theme.swatches[0]} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/css/fonts.css" />
        <link rel="stylesheet" href="/css/invite.css" />
        <link rel="stylesheet" href="/css/print.css" />
        <style>{raw(themeInlineCss(p.inv.theme))}</style>
        <script src="/js/print.js" defer></script>
      </head>
      <body class={`inv t-${p.inv.theme} ${p.bodyClass}`}>{p.children}</body>
    </html>
  );
}

function Toolbar({ back, children }: { back: string; children?: Child }) {
  return (
    <div class="print-toolbar">
      <a class="btn btn-ghost btn-sm" href={back}>
        ← Torna al pannello
      </a>
      <div class="print-toolbar-tools">
        {children}
        <button type="button" class="btn btn-primary btn-sm" data-print>
          Stampa o salva in PDF
        </button>
      </div>
    </div>
  );
}

const shortUrl = (url: string) => url.replace(/^https?:\/\//, '');

/** A5 invitation with a QR code to the online invitation (for grandparents, or to slip in a box of sugared almonds). */
export function PrintPage({ inv, origin, back }: { inv: Inv; origin: string; back: string }) {
  const d = inv.data;
  const orn = ornaments(inv.theme);
  const url = origin + publicPath(inv);
  const place = visibleProgram(d, null).find((x) => x.place)?.place ?? '';
  const message = d.message.length <= 260 ? d.message : '';
  return (
    <PaperDoc inv={inv} title={`Invito da stampare · ${displayNames(d)}`} bodyClass="print-doc print-a5">
      <Toolbar back={back}>
        <a class="btn btn-ghost btn-sm" href="?invitati=1">
          Biglietti con il nome di ogni invitato
        </a>
      </Toolbar>
      <p class="print-tip">Formato A5. Nelle opzioni di stampa attiva «Grafica di sfondo» per stampare anche la carta e i decori.</p>
      <div class="print-area">
        <article class="sheet sheet-main print-card">
          {orn.scatter && raw(orn.scatter)}
          <header class="hero sec">
            {orn.top && raw(orn.top)}
            <div class="hero-body">
              {orn.crest && (
                <div class="crest" aria-hidden="true">
                  <span class="crest-mono">
                    <Monogram d={d} />
                  </span>
                </div>
              )}
              <HeroText inv={inv} std={d.saveTheDate} place={place} />
              {message && <p class="print-message">{message}</p>}
              <div class="print-qr">
                {raw(qrSvg(url, 112))}
                <p>
                  <strong>{d.saveTheDate ? 'Segnati la data' : 'Conferma la tua presenza'}</strong>
                  Inquadra il codice con la fotocamera del telefono, oppure apri
                  <span class="print-url">{shortUrl(url)}</span>
                </p>
              </div>
            </div>
          </header>
        </article>
      </div>
    </PaperDoc>
  );
}

/** One card per guest with the QR of their personal link (8 per A4 sheet). */
export function GuestCardsPage({ inv, origin, guests, back }: { inv: Inv; origin: string; guests: GuestRow[]; back: string }) {
  const d = inv.data;
  const ev = EVENT_BY_ID[inv.event_type];
  return (
    <PaperDoc inv={inv} title={`Biglietti per gli invitati · ${displayNames(d)}`} bodyClass="print-doc print-a4">
      <Toolbar back={back}>
        <a class="btn btn-ghost btn-sm" href="?">
          Invito A5
        </a>
      </Toolbar>
      <p class="print-tip">Ogni biglietto apre l’invito personale di quell’invitato: così vedi anche chi l’ha aperto. Formato A4, 8 biglietti per foglio.</p>
      {guests.length === 0 ? (
        <p class="print-empty">Aggiungi prima gli invitati dalla lista nel pannello.</p>
      ) : (
        <div class="gcards">
          {guests.map((g) => {
            const url = origin + publicPath(inv, g.code);
            return (
              <article class="gcard">
                <div class="gcard-text">
                  <p class="kicker">Un invito per</p>
                  <p class="gcard-name">{g.name}</p>
                  <p class="gcard-event">
                    {ev.label} di {displayNames(d, ' e ')}
                    <br />
                    {formatDateShort(d.date)}
                  </p>
                </div>
                <div class="gcard-qr">
                  {raw(qrSvg(url, 92))}
                  <span>Inquadra e rispondi</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PaperDoc>
  );
}

export interface TableGroup {
  name: string;
  people: number;
  rows: { label: string; detail: string; out?: boolean }[];
}

/** Guests grouped by table (natural order: "Tavolo 2" before "Tavolo 10"). */
export function groupTables(seated: SeatedGuest[]): TableGroup[] {
  const map = new Map<string, TableGroup>();
  for (const g of seated) {
    const name = (g.table_name ?? '').trim();
    if (!name) continue;
    const t = map.get(name) ?? { name, people: 0, rows: [] };
    map.set(name, t);
    if (g.attending === 0) {
      t.rows.push({ label: g.name, detail: 'non viene', out: true });
      continue;
    }
    const count = g.attending === 1 ? (g.adults ?? 0) + (g.children ?? 0) : g.seats;
    t.people += count;
    const names = parsePeople(g.people)
      .map((p) => p.name)
      .filter(Boolean);
    t.rows.push({
      label: g.name,
      detail: names.length ? names.join(', ') : g.attending === 1 ? `${count} ${count === 1 ? 'persona' : 'persone'}` : `${count} ${count === 1 ? 'posto' : 'posti'} · in attesa di risposta`,
    });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'it', { numeric: true }));
}

export function TableauPage({ inv, origin, tables, back, unseated }: { inv: Inv; origin: string; tables: TableGroup[]; back: string; unseated: number }) {
  const d = inv.data;
  const finder = origin + publicPath(inv) + '/tavolo';
  return (
    <PaperDoc inv={inv} title={`Tableau · ${displayNames(d)}`} bodyClass="print-doc print-a4 print-landscape">
      <Toolbar back={back} />
      <p class="print-tip">
        Scegli il tavolo di ogni invitato dalla lista nel pannello (tasto «Modifica»).
        {unseated > 0 && ` ${unseated} ${unseated === 1 ? 'invitato non ha' : 'invitati non hanno'} ancora un tavolo.`}
      </p>
      <header class="tableau-head">
        <p class="kicker">{inv.event_type === 'matrimonio' ? 'Tableau de mariage' : 'I tavoli'}</p>
        <h1 class="sec-title">{displayNames(d)}</h1>
      </header>
      {tables.length === 0 ? (
        <p class="print-empty">Nessun tavolo assegnato per ora.</p>
      ) : (
        <div class="tableau">
          {tables.map((t) => (
            <section class="tb">
              <h2 class="tb-name">{t.name}</h2>
              <p class="tb-count">
                {t.people} {t.people === 1 ? 'persona' : 'persone'}
              </p>
              <ul>
                {t.rows.map((r) => (
                  <li class={r.out ? 'out' : ''}>
                    <strong>{r.label}</strong>
                    <span>{r.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <section class="tb-sign">
        {raw(qrSvg(finder, 120))}
        <div>
          <p class="sec-title">Trova il tuo tavolo</p>
          <p>
            Inquadra il codice e scrivi il tuo nome.
            <span class="print-url">{shortUrl(finder)}</span>
          </p>
        </div>
      </section>
    </PaperDoc>
  );
}

/** Guest-facing search at the venue: "Scrivi il tuo nome" → table. */
export function TableFinderPage({ inv, active, q, results }: { inv: Inv; active: boolean; q: string; results: { name: string; table: string }[] }) {
  const d = inv.data;
  return (
    <PaperDoc inv={inv} title={`Trova il tuo tavolo · ${displayNames(d)}`} bodyClass="finder-doc">
      <div class="page">
        <main class="card">
          <article class="sheet finder">
            <p class="kicker">{displayNames(d)}</p>
            <h1 class="sec-title">Trova il tuo tavolo</h1>
            {!active ? (
              <p class="sec-intro">I tavoli saranno visibili qui il giorno dell’evento.</p>
            ) : (
              <>
                <form method="get" class="finder-form" role="search">
                  <label class="field">
                    <span>Scrivi il tuo nome o il cognome</span>
                    <input name="nome" value={q} minlength={3} maxlength={60} autocomplete="name" required autofocus={!q} />
                  </label>
                  <button class="btn btn-primary btn-block" type="submit">
                    Cerca
                  </button>
                </form>
                {q && q.length < 3 && <p class="finder-msg">Scrivi almeno 3 lettere.</p>}
                {q.length >= 3 &&
                  (results.length ? (
                    <ul class="finder-results" aria-live="polite">
                      {results.map((r) => (
                        <li>
                          <span>{r.name}</span>
                          <strong>{r.table}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p class="finder-msg">Nessun risultato per «{q}». Prova con il cognome, oppure chiedi a chi vi accoglie.</p>
                  ))}
              </>
            )}
            <a class="link-btn" href={publicPath(inv)}>
              Torna all’invito
            </a>
          </article>
        </main>
      </div>
    </PaperDoc>
  );
}
