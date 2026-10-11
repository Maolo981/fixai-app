import { raw } from 'hono/html';
import { BRAND, EVENTS, PRICES, RETENTION_DAYS_AFTER_EVENT, type EventDef, priceFor } from '../config';
import type { AdminRow } from '../db';
import { adminOverview } from '../db';
import { displayNames } from '../model';
import { THEMES, THEME_BY_ID } from '../themes';
import type { InviteData } from '../types';
import { euro, formatDateShort, formatDateTimeIt } from '../util';
import { occasionIcon } from '../icons';
import { FAQ } from './landing';
import { Layout, MessagePage } from './layout';

// ---------------------------------------------------------------------------
// SEO: one landing page per occasion
// ---------------------------------------------------------------------------

export function EventLandingPage({ ev, origin }: { ev: EventDef; origin: string }) {
  const theme = THEME_BY_ID[ev.theme];
  const others = THEMES.filter((t) => t.id !== ev.theme).slice(0, 3);
  return (
    <Layout
      title={`${ev.seoTitle} · ${BRAND.name}`}
      description={ev.seoIntro}
      canonical={`${origin}/inviti/${ev.slug}`}
      ogImage={`${origin}/og/${ev.theme}.png`}
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `Invito digitale ${ev.label}`,
        description: ev.seoIntro,
        brand: { '@type': 'Brand', name: BRAND.name },
        offers: { '@type': 'Offer', priceCurrency: 'EUR', price: (priceFor(ev.id).cents / 100).toFixed(2), availability: 'https://schema.org/InStock' },
      }}
    >
      <main>
        <section class="hero hero-sm">
          <div class="container hero-grid">
            <div class="hero-copy">
              <p class="kicker kicker-icon">
                {raw(occasionIcon(ev.id))}
                Inviti digitali · {ev.label}
              </p>
              <h1 class="display">{ev.seoTitle}</h1>
              <p class="lead">{ev.seoIntro}</p>
              <form method="post" action="/crea" class="hero-cta">
                <button class="btn btn-primary btn-lg" type="submit" name="type" value={ev.id}>
                  Crea l’invito · {ev.label.toLowerCase()}
                </button>
                <a class="btn btn-secondary btn-lg" href={`/demo/${ev.theme}?ev=${ev.id}`}>
                  Guarda l’esempio
                </a>
              </form>
              <p class="hero-note">
                Provi gratis · {euro(priceFor(ev.id).cents)} una volta sola, solo se lo pubblichi
              </p>
            </div>
            <div class="hero-visual">
              <div class="phone">
                <iframe src={`/demo/${theme.id}?ev=${ev.id}&embed=1`} title={`Esempio di invito per ${ev.label}`} loading="lazy"></iframe>
              </div>
              <p class="phone-caption">Tocca la busta per aprirla</p>
            </div>
          </div>
        </section>
        <section class="section alt">
          <div class="container narrow">
            <h2 class="h2 center">Come funziona</h2>
            <ol class="steps steps-compact">
              <li>
                <span class="step-n">I</span>
                <h3>Personalizza</h3>
                <p>Nomi, data, luoghi, foto e messaggio. Ti suggeriamo anche le frasi più belle.</p>
              </li>
              <li>
                <span class="step-n">II</span>
                <h3>Invia su WhatsApp</h3>
                <p>Un link per tutti, oppure un link personale per ogni invitato con il suo nome.</p>
              </li>
              <li>
                <span class="step-n">III</span>
                <h3>Ricevi le conferme</h3>
                <p>Chi viene, quanti adulti e bambini, allergie: tutto in una lista che scarichi in Excel.</p>
              </li>
            </ol>
          </div>
        </section>
        <section class="section">
          <div class="container narrow">
            <h2 class="h2 center">Frasi per l’invito {ev.label === 'Festa' ? 'alla festa' : `di ${ev.label.toLowerCase()}`}</h2>
            <ul class="phrases">
              {ev.phrases.slice(0, 4).map((ph) => (
                <li>{ph.replaceAll('{nome}', ev.defaults().name1 ?? '')}</li>
              ))}
            </ul>
            <p class="center">
              <a href={`/frasi/${ev.slug}`}>Tutte le frasi per {ev.label.toLowerCase()} →</a>
            </p>
          </div>
        </section>
        <section class="section alt">
          <div class="container">
            <h2 class="h2 center">Altri stili che piacciono</h2>
            <div class="themes-grid small-grid">
              {others.map((t) => (
                <a class="theme-card" href={`/demo/${t.id}?ev=${ev.id}`}>
                  <img src={`/img/themes/${t.id}.webp`} alt={`Stile ${t.name}`} loading="lazy" width={390} height={520} />
                  <span class="theme-meta">
                    <strong>{t.name}</strong>
                    <span>{t.desc}</span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
        <section class="section">
          <div class="container narrow">
            <h2 class="h2 center">Domande frequenti</h2>
            <div class="faq">
              {FAQ.slice(0, 6).map((f) => (
                <details>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section class="section cta-final">
          <div class="container narrow center">
            <h2 class="h2">Pronto in 5 minuti</h2>
            <form method="post" action="/crea">
              <button class="btn btn-primary btn-lg" type="submit" name="type" value={ev.id}>
                Crea l’invito gratis
              </button>
            </form>
          </div>
        </section>
      </main>
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// SEO: phrase collections ("frasi per invito battesimo" etc.)
// ---------------------------------------------------------------------------

export function PhrasesPage({ ev, origin }: { ev: EventDef; origin: string }) {
  const name = ev.defaults().name1 ?? '';
  const title = ev.id === 'festa' ? 'Frasi per inviti a una festa' : `Frasi per inviti di ${ev.label.toLowerCase()}`;
  return (
    <Layout
      title={`${title}: ${ev.phrases.length} idee da copiare · ${BRAND.name}`}
      description={`Le frasi più belle per l’invito di ${ev.label.toLowerCase()}: brevi, eleganti o simpatiche. Copiale e crea il tuo invito digitale da mandare su WhatsApp.`}
      canonical={`${origin}/frasi/${ev.slug}`}
      scripts={['/js/site.js']}
    >
      <main class="container narrow prose-page">
        <p class="kicker kicker-icon">
          {raw(occasionIcon(ev.id))}
          Idee e ispirazione
        </p>
        <h1 class="h2">{title}</h1>
        <p class="lead">
          Non trovi le parole giuste? Ecco {ev.phrases.length} frasi pronte per il tuo invito. Tocca «Copia» e incollala dove vuoi, oppure usala direttamente nel tuo invito digitale: nell’editor
          trovi il tasto «Suggeriscimi una frase».
        </p>
        <ol class="phrases phrases-list">
          {ev.phrases.map((ph) => {
            const text = ph.replaceAll('{nome}', name);
            return (
              <li>
                <p>{text}</p>
                <button type="button" class="btn btn-ghost btn-sm" data-copy={text}>
                  Copia
                </button>
              </li>
            );
          })}
        </ol>
        <div class="card cta-card">
          <h2 class="h3">Trasforma la frase in un invito</h2>
          <p class="muted">Busta da aprire, programma con mappa, conferme di presenza automatiche. Lo crei in 5 minuti e lo mandi su WhatsApp.</p>
          <form method="post" action="/crea">
            <button class="btn btn-primary" type="submit" name="type" value={ev.id}>
              Crea l’invito · {ev.label.toLowerCase()}
            </button>
          </form>
        </div>
        <h2 class="h3">Frasi per altre occasioni</h2>
        <ul class="chips">
          {EVENTS.filter((e) => e.id !== ev.id).map((e) => (
            <li>
              <a class="chip" href={`/frasi/${e.slug}`}>
                {raw(occasionIcon(e.id, 'icon chip-icon'))}
                {e.label}
              </a>
            </li>
          ))}
        </ul>
      </main>
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Recover links by email
// ---------------------------------------------------------------------------

export function RecoverPage({ sent, emailEnabled }: { sent: boolean; emailEnabled: boolean }) {
  return (
    <MessagePage title="Ritrova i tuoi inviti" icon="key" noindex={false}>
      {sent ? (
        <p class="lead">Se ci sono inviti collegati a quell’indirizzo, ti abbiamo appena mandato una email con i link. Controlla anche nello spam.</p>
      ) : (
        <>
          <p class="lead">Scrivi l’email che hai usato: ti mandiamo i link per gestire i tuoi inviti.</p>
          {!emailEnabled && <p class="notice notice-info">Le email non sono ancora configurate su questo sito: scrivici a {BRAND.supportEmail}.</p>}
          <form method="post" action="/recupera" class="inline-form">
            <input type="email" name="email" placeholder="tu@esempio.it" required autocomplete="email" aria-label="La tua email" />
            <button class="btn btn-primary" type="submit">
              Mandami i link
            </button>
          </form>
        </>
      )}
    </MessagePage>
  );
}

// ---------------------------------------------------------------------------
// Legal templates — MUST be reviewed before launch (see README)
// ---------------------------------------------------------------------------

export function PrivacyPage() {
  const months = Math.round(RETENTION_DAYS_AFTER_EVENT / 30);
  return (
    <Layout title={`Privacy · ${BRAND.name}`} description={`Informativa sul trattamento dei dati personali di ${BRAND.name}.`}>
      <main class="container narrow prose-page prose">
        <h1 class="h2">Informativa privacy</h1>
        <p class="notice notice-info">Modello da completare e far verificare prima del lancio (vedi README).</p>
        <h2>Chi siamo</h2>
        <p>
          Il titolare del trattamento è {BRAND.legalName}, {BRAND.address}, P.IVA {BRAND.vatNumber}, email {BRAND.supportEmail}.
        </p>
        <h2>Quali dati trattiamo</h2>
        <ul>
          <li>
            <strong>Chi crea un invito</strong>: i contenuti dell’invito, l’eventuale foto, l’email (facoltativa) e i dati di pagamento, gestiti direttamente da Stripe (noi non vediamo il
            numero della carta).
          </li>
          <li>
            <strong>Chi risponde a un invito</strong>: nome, partecipazione, numero di adulti e bambini, se richiesti nome e menu di ogni persona, eventuali allergie, risposta alla domanda
            dell’organizzatore, canzone e messaggio facoltativi.
          </li>
          <li>
            <strong>Lista regali e passaggi</strong> (solo se l’organizzatore li attiva): il nome di chi prenota un regalo o partecipa a una colletta, con l’importo indicato; nome, telefono e
            luogo di partenza di chi offre o cerca un passaggio, visibili agli altri invitati finché l’autore non cancella l’annuncio.
          </li>
          <li>
            <strong>Dati tecnici</strong>: per prevenire abusi conserviamo per poche ore un’impronta cifrata (hash) dell’indirizzo IP. Non usiamo cookie di profilazione né strumenti di
            pubblicità.
          </li>
        </ul>
        <h2>Ruoli</h2>
        <p>
          Per i dati degli invitati, l’organizzatore dell’evento è titolare del trattamento e {BRAND.name} agisce come responsabile, trattandoli solo per permettere all’organizzatore di
          raccogliere le conferme. Le esigenze alimentari sono facoltative e servono esclusivamente all’organizzazione del pranzo o della cena.
        </p>
        <h2>Per quanto tempo</h2>
        <p>
          Le bozze non pubblicate vengono cancellate dopo 60 giorni di inattività. Gli inviti pubblicati, con tutte le risposte, vengono cancellati automaticamente {months} mesi dopo la data
          dell’evento, o prima se l’organizzatore li elimina. I dati di fatturazione sono conservati per gli obblighi di legge.
        </p>
        <h2>Fornitori</h2>
        <p>
          Hosting e database: Cloudflare (UE/USA, con clausole contrattuali standard). Pagamenti: Stripe. Email transazionali: Resend. Solo se l’organizzatore usa queste funzioni:
          Telegram (avvisi delle nuove risposte), Anthropic (riscrittura del testo dell’invito: ricevono il testo, i nomi e la data). Le previsioni meteo arrivano da Open-Meteo, a cui
          inviamo solo il nome del paese e la data, nessun dato personale. Ciascun fornitore tratta i dati solo per erogare il servizio.
        </p>
        <h2>I tuoi diritti</h2>
        <p>
          Puoi chiedere accesso, rettifica, cancellazione, limitazione o portabilità dei dati e opporti al trattamento scrivendo a {BRAND.supportEmail}. Se rispondi a un invito puoi
          rivolgerti anche all’organizzatore dell’evento. Puoi proporre reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).
        </p>
      </main>
    </Layout>
  );
}

export function TermsPage() {
  return (
    <Layout title={`Termini di servizio · ${BRAND.name}`} description={`Condizioni di utilizzo del servizio ${BRAND.name}.`}>
      <main class="container narrow prose-page prose">
        <h1 class="h2">Termini di servizio</h1>
        <p class="notice notice-info">Modello da completare e far verificare prima del lancio (vedi README).</p>
        <h2>Il servizio</h2>
        <p>
          {BRAND.name} permette di creare inviti digitali, condividerli tramite link e raccogliere le conferme di presenza. La creazione e l’anteprima sono gratuite; la pubblicazione
          dell’invito richiede un pagamento unico il cui importo è indicato prima del pagamento.
        </p>
        <h2>Prezzi e pagamento</h2>
        <p>
          I prezzi sono in euro e comprendono le eventuali imposte applicabili. Il pagamento avviene tramite Stripe. Su richiesta viene emessa fattura scrivendo a {BRAND.supportEmail}.
        </p>
        <h2>Diritto di recesso</h2>
        <p>
          L’invito pubblicato è un contenuto digitale fornito immediatamente. Prima del pagamento chiedi espressamente l’attivazione immediata e prendi atto che, ai sensi dell’art. 59, comma
          1, lett. o) del Codice del Consumo, perdi il diritto di recesso. Se qualcosa non funziona scrivici: troveremo una soluzione.
        </p>
        <h2>Durata</h2>
        <p>
          L’invito resta online fino a {Math.round(RETENTION_DAYS_AFTER_EVENT / 30)} mesi dopo la data dell’evento, poi viene cancellato automaticamente insieme alle risposte.
        </p>
        <h2>Contenuti</h2>
        <p>
          Sei responsabile dei testi e delle foto che pubblichi e garantisci di averne i diritti. Il link di gestione è personale: chi lo possiede può modificare l’invito e vedere le
          risposte, quindi non condividerlo.
        </p>
        <h2>Responsabilità</h2>
        <p>
          Facciamo il possibile perché il servizio sia sempre disponibile, ma non possiamo garantirlo senza interruzioni. Ti consigliamo di scaricare periodicamente l’elenco delle risposte.
        </p>
        <h2>Contatti</h2>
        <p>
          {BRAND.legalName}, {BRAND.address}, P.IVA {BRAND.vatNumber} · {BRAND.supportEmail}
        </p>
      </main>
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Owner dashboard (/admin)
// ---------------------------------------------------------------------------

type Overview = Awaited<ReturnType<typeof adminOverview>>;

export function AdminPage({ o }: { o: Overview }) {
  const conv = o.totals.total ? Math.round((o.totals.active / o.totals.total) * 100) : 0;
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  const created = new Map(o.createdByDay.map((r) => [r.d, r.n]));
  const paid = new Map(o.paidByDay.map((r) => [r.d, r]));
  const maxN = Math.max(1, ...days.map((d) => created.get(d) ?? 0));
  return (
    <Layout title={`Admin · ${BRAND.name}`} noindex hideFooter bodyClass="app">
      <main class="container dash admin">
        <h1 class="h2">Il tuo business</h1>
        <div class="stats">
          <div class="stat">
            <span class="stat-n">{euro(o.revenue.cents)}</span>
            <span class="stat-label">incassati in totale</span>
            <span class="stat-sub">{o.revenue.n} ordini</span>
          </div>
          <div class="stat">
            <span class="stat-n">{euro(o.revenue30.cents)}</span>
            <span class="stat-label">ultimi 30 giorni</span>
            <span class="stat-sub">{o.revenue30.n} ordini</span>
          </div>
          <div class="stat">
            <span class="stat-n">{conv}%</span>
            <span class="stat-label">bozze → pubblicati</span>
            <span class="stat-sub">
              {o.totals.active} su {o.totals.total}
            </span>
          </div>
          <div class="stat">
            <span class="stat-n">{o.rsvps.people}</span>
            <span class="stat-label">ospiti confermati</span>
            <span class="stat-sub">{o.rsvps.n} risposte «sì»</span>
          </div>
        </div>
        <section class="card">
          <h2 class="h3">Ultimi 14 giorni</h2>
          <div class="bars" role="img" aria-label="Inviti creati e pubblicati per giorno">
            {days.map((d) => {
              const c = created.get(d) ?? 0;
              const p = paid.get(d);
              return (
                <div class="bar-col" title={`${d}: ${c} creati, ${p?.n ?? 0} pubblicati (${euro(p?.cents ?? 0)})`}>
                  <div class="bar" style={`height:${(c / maxN) * 100}%`}>
                    <div class="bar-paid" style={`height:${c ? ((p?.n ?? 0) / c) * 100 : 0}%`}></div>
                  </div>
                  <span class="bar-label">{d.slice(8)}</span>
                </div>
              );
            })}
          </div>
          <p class="muted small">Barra intera: inviti creati · parte scura: pubblicati (pagati).</p>
        </section>
        <section class="card">
          <h2 class="h3">Per occasione</h2>
          <div class="table-wrap">
            <table class="rsvp-table">
              <thead>
                <tr>
                  <th>Occasione</th>
                  <th>Creati</th>
                  <th>Pubblicati</th>
                  <th>Conversione</th>
                </tr>
              </thead>
              <tbody>
                {o.byType.map((r) => (
                  <tr>
                    <td>{EVENTS.find((e) => e.id === r.event_type)?.label ?? r.event_type}</td>
                    <td>{r.n}</td>
                    <td>{r.active}</td>
                    <td>{r.n ? Math.round((r.active / r.n) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section class="card">
          <h2 class="h3">Ultimi 100 inviti</h2>
          <div class="table-wrap">
            <table class="rsvp-table">
              <thead>
                <tr>
                  <th>Creato</th>
                  <th>Invito</th>
                  <th>Occasione</th>
                  <th>Stato</th>
                  <th>Risposte</th>
                  <th>Invitati</th>
                  <th>Incasso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {o.recent.map((r: AdminRow) => {
                  let data: Partial<InviteData> = {};
                  try {
                    data = JSON.parse(r.data);
                  } catch {
                    data = {};
                  }
                  return (
                    <tr>
                      <td class="small muted">{formatDateTimeIt(r.created_at)}</td>
                      <td>
                        <strong>{displayNames({ name1: data.name1 ?? '', name2: data.name2 ?? '' })}</strong>
                        <span class="muted small"> · {data.date ? formatDateShort(data.date) : ''}</span>
                      </td>
                      <td>{EVENTS.find((e) => e.id === r.event_type)?.label}</td>
                      <td>{r.status === 'active' ? <span class="pill pill-yes">Pubblicato</span> : <span class="pill">Bozza</span>}</td>
                      <td>{r.rsvp_count}</td>
                      <td>{r.guest_count}</td>
                      <td>{r.amount_cents != null ? euro(r.amount_cents) : '—'}</td>
                      <td>
                        <a href={`/gestisci/${r.admin_token}`} target="_blank" rel="noopener">
                          Apri
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <p class="muted small">
          Prezzi attuali: {Object.values(PRICES)
            .map((p) => `${p.label} ${euro(p.cents)}`)
            .join(' · ')}{' '}
          (si cambiano in <code>src/config.ts</code>).
        </p>
      </main>
    </Layout>
  );
}

export function NotFoundPage() {
  return (
    <MessagePage title="Pagina non trovata" icon="search">
      <p class="lead">Il link potrebbe essere sbagliato o l’invito potrebbe essere stato eliminato.</p>
      <p>
        <a class="btn btn-primary" href="/">
          Torna alla home
        </a>
      </p>
    </MessagePage>
  );
}

export function ErrorPage({ text }: { text: string }) {
  return (
    <MessagePage title="Ops, qualcosa è andato storto" icon="compass">
      <p class="lead">{text}</p>
      <p>
        <a class="btn btn-secondary" href="/">
          {raw('&larr;')} Torna alla home
        </a>
      </p>
    </MessagePage>
  );
}
