import { raw } from 'hono/html';
import { BRAND, EVENT_BY_ID, RETENTION_DAYS_AFTER_EVENT, priceFor } from '../config';
import { occasionIcon, uiIcon } from '../icons';
import type { Stats } from '../db';
import { displayNames, publicPath, untouchedSampleFields } from '../model';
import type { GuestRow, Invitation, RsvpRow } from '../types';
import { addDays, daysUntil, euro, formatDateLong, formatDateShort, formatDateTimeIt, formatDayMonth, waLink } from '../util';
import { AppHeader } from './app-header';
import { Layout } from './layout';

export interface DashboardProps {
  inv: Invitation;
  origin: string;
  rsvps: RsvpRow[];
  guests: GuestRow[];
  stats: Stats;
  flash?: { kind: 'ok' | 'err' | 'info'; text: string } | null;
  paymentsReady: boolean;
}

export function shareText(inv: Invitation, url: string) {
  const ev = EVENT_BY_ID[inv.event_type];
  return `Ciao! Ti invitiamo ${ev.eventPhrase(inv.data)}, ${formatDateLong(inv.data.date)}. Apri l’invito e facci sapere se ci sarai: ${url}`;
}

export function guestText(inv: Invitation, g: GuestRow, url: string) {
  const ev = EVENT_BY_ID[inv.event_type];
  return `Ciao ${g.name}! Ecco il nostro invito ${ev.eventPhrase(inv.data)}, ${formatDateLong(inv.data.date)}. Aprilo qui e facci sapere se ci sarai: ${url}`;
}

export function reminderText(inv: Invitation, g: GuestRow, url: string) {
  const ev = EVENT_BY_ID[inv.event_type];
  const by = inv.data.rsvpDeadline ? ` entro il ${formatDayMonth(inv.data.rsvpDeadline)}` : '';
  return `Ciao ${g.name}! Ti ricordiamo l’invito ${ev.eventPhrase(inv.data)} del ${formatDayMonth(inv.data.date)}: ci farebbe piacere sapere se ci sarai${by}. Basta un tocco qui: ${url}`;
}

function Stat({ n, label, sub }: { n: number | string; label: string; sub?: string }) {
  return (
    <div class="stat">
      <span class="stat-n">{n}</span>
      <span class="stat-label">{label}</span>
      {sub && <span class="stat-sub">{sub}</span>}
    </div>
  );
}

function PublishCard({ inv, paymentsReady }: { inv: Invitation; paymentsReady: boolean }) {
  const price = priceFor(inv.event_type);
  const untouched = untouchedSampleFields(inv);
  const base = `/gestisci/${inv.admin_token}`;
  return (
    <section class="card publish-card" id="pubblica">
      <div class="publish-copy">
        <span class="badge badge-draft">Bozza</span>
        <h2 class="h3">Il tuo invito è pronto? Pubblicalo</h2>
        <p>
          Finché è in bozza l’invito mostra la scritta «Anteprima» e non raccoglie conferme. <a href={publicPath(inv)} target="_blank" rel="noopener">Guardalo come lo vedranno gli invitati ↗</a>
        </p>
        <ul class="checks">
          <li>Conferme di presenza illimitate, in tempo reale</li>
          <li>Link personalizzati e promemoria su WhatsApp</li>
          <li>Excel per catering, ristorante e tableau</li>
          <li>Modifiche illimitate, senza pubblicità</li>
        </ul>
        {untouched.length > 0 && <p class="warn">Controlla {untouched.join(', ')}: sono ancora quelli dell’esempio.</p>}
      </div>
      <form method="post" action={`${base}/attiva`} class="publish-form">
        <p class="price">
          {euro(price.cents)} <span>pagamento unico</span>
        </p>
        <label class="consent">
          <input type="checkbox" name="consenso" value="1" required />
          <span>
            Chiedo l’attivazione immediata dell’invito e so che, una volta pubblicato, non potrò esercitare il diritto di recesso. Ho letto i{' '}
            <a href="/termini" target="_blank" rel="noopener">
              termini
            </a>
            .
          </span>
        </label>
        <button class="btn btn-primary btn-lg btn-block" type="submit">
          {paymentsReady ? `Pubblica l’invito · ${euro(price.cents)}` : 'Pubblica l’invito'}
        </button>
        <p class="small muted center secure-note">
          {raw(uiIcon('lock', 'icon inline-icon'))}
          Pagamento sicuro con Stripe: carte, Apple Pay e Google Pay. Hai un codice sconto? Lo inserisci al pagamento.
        </p>
      </form>
    </section>
  );
}

function ShareCard({ inv, origin }: { inv: Invitation; origin: string }) {
  const url = origin + publicPath(inv);
  const text = shareText(inv, url);
  return (
    <section class="card share-card">
      <div>
        <span class="badge badge-live">● Online</span>
        <h2 class="h3">Manda l’invito</h2>
        <p class="muted">Questo è il link per tutti. Per sapere chi l’ha aperto e chi manca, usa la lista invitati qui sotto.</p>
      </div>
      <div class="copy-field">
        <input readonly value={url} id="public-url" aria-label="Link dell’invito" />
        <button type="button" class="btn btn-secondary btn-sm" data-copy={url}>
          Copia
        </button>
      </div>
      <div class="share-btns">
        <a class="btn btn-wa" href={waLink(text)} target="_blank" rel="noopener">
          Condividi su WhatsApp
        </a>
        <button type="button" class="btn btn-ghost" data-share={url} data-share-text={text} hidden>
          Altre app…
        </button>
      </div>
    </section>
  );
}

function GuestStatus({ g, rsvp }: { g: GuestRow; rsvp?: RsvpRow }) {
  if (rsvp)
    return rsvp.attending ? (
      <span class="pill pill-yes">✓ Viene · {rsvp.adults + rsvp.children}</span>
    ) : (
      <span class="pill pill-no">✗ Non viene</span>
    );
  if (g.opened_count > 0) return <span class="pill pill-open">Aperto, senza risposta</span>;
  if (g.sent_at) return <span class="pill pill-sent">Inviato</span>;
  return <span class="pill">Da inviare</span>;
}

export function DashboardPage(p: DashboardProps) {
  const { inv, rsvps, guests, stats, origin } = p;
  const d = inv.data;
  const ev = EVENT_BY_ID[inv.event_type];
  const base = `/gestisci/${inv.admin_token}`;
  const days = daysUntil(d.date);
  const rsvpByGuest = new Map(rsvps.filter((r) => r.guest_id).map((r) => [r.guest_id!, r]));
  const messages = rsvps.filter((r) => r.message);
  const deleteOn = formatDateShort(addDays(d.date, RETENTION_DAYS_AFTER_EVENT));
  const isActive = inv.status === 'active';

  return (
    <Layout
      title={`${displayNames(d)} · Risposte · ${BRAND.name}`}
      noindex
      bodyClass="app"
      header={<AppHeader inv={inv} active="dash" />}
      hideFooter
      scripts={['/js/site.js', '/js/dashboard.js']}
    >
      <main class="container dash">
        {p.flash && <div class={`notice notice-${p.flash.kind}`}>{p.flash.text}</div>}

        <div class="dash-head">
          <div>
            <p class="kicker kicker-icon">
              {raw(occasionIcon(ev.id))}
              {ev.label} · {formatDateLong(d.date)}
            </p>
            <h1 class="h2">{displayNames(d)}</h1>
            <p class="muted">
              {days > 1 ? `Mancano ${days} giorni` : days === 1 ? 'È domani!' : days === 0 ? 'È oggi!' : 'Evento concluso'}
              {d.rsvpDeadline && days >= 0 ? ` · risposte entro il ${formatDayMonth(d.rsvpDeadline)}` : ''}
            </p>
          </div>
          <div class="dash-actions">
            <a class="btn btn-secondary" href={`${base}/modifica`}>
              Modifica invito
            </a>
          </div>
        </div>

        {!isActive && <PublishCard inv={inv} paymentsReady={p.paymentsReady} />}
        {isActive && <ShareCard inv={inv} origin={origin} />}

        {!inv.email && (
          <form method="post" action={`${base}/email`} class="card email-nudge">
            <p>
              <strong>Non perdere il tuo invito.</strong> Lascia la tua email: ti mandiamo il link di questa pagina e un avviso a ogni nuova risposta.
            </p>
            <div class="inline-form">
              <input type="email" name="email" placeholder="tu@esempio.it" required autocomplete="email" aria-label="La tua email" />
              <input type="hidden" name="notify" value="on" />
              <button class="btn btn-secondary" type="submit">
                Salva
              </button>
            </div>
          </form>
        )}

        <div class="stats">
          <Stat n={stats.people} label="persone confermate" sub={`${stats.adults} adulti${d.askChildren ? ` · ${stats.children} bambini` : ''}`} />
          <Stat n={stats.yes} label="hanno accettato" />
          <Stat n={stats.no} label="non potranno esserci" />
          {guests.length > 0 ? (
            <Stat n={stats.pendingGroups} label="invitati senza risposta" sub={`${stats.openedGroups} su ${guests.length} hanno aperto`} />
          ) : (
            <Stat n={inv.views} label="visite all’invito" />
          )}
        </div>

        <div class="tabs" role="tablist">
          <a href="#risposte" class="tab" role="tab" data-tab="risposte">
            Risposte <span class="count">{rsvps.length}</span>
          </a>
          <a href="#invitati" class="tab" role="tab" data-tab="invitati">
            Lista invitati <span class="count">{guests.length}</span>
          </a>
          <a href="#dediche" class="tab" role="tab" data-tab="dediche">
            Dediche <span class="count">{messages.length}</span>
          </a>
        </div>

        <section class="panel" id="risposte" data-panel="risposte">
          <div class="panel-head">
            <h2 class="h3">Risposte</h2>
            {rsvps.length > 0 && (
              <a class="btn btn-secondary btn-sm" href={`${base}/risposte.csv`}>
                ⬇ Scarica Excel (CSV)
              </a>
            )}
          </div>
          {rsvps.length === 0 ? (
            <div class="empty">
              <p class="big-icon">{raw(uiIcon('envelope'))}</p>
              <p>
                <strong>Ancora nessuna risposta.</strong>
              </p>
              <p class="muted">{isActive ? 'Appena qualcuno risponde lo vedi qui (e, se hai lasciato la tua email, ti avvisiamo).' : 'Le risposte arriveranno dopo la pubblicazione dell’invito.'}</p>
            </div>
          ) : (
            <div class="table-wrap">
              <table class="rsvp-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Risposta</th>
                    <th>Adulti</th>
                    {d.askChildren && <th>Bambini</th>}
                    {d.askDiet && <th>Allergie e menu</th>}
                    {d.customQuestion && <th>{d.customQuestion}</th>}
                    <th>Quando</th>
                    <th>
                      <span class="sr-only">Azioni</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rsvps.map((r) => (
                    <tr class={r.attending ? 'yes' : 'no'}>
                      <td data-label="Nome">
                        <strong>{r.name}</strong>
                        {r.guest_id && <span class="muted small"> · link personale</span>}
                      </td>
                      <td data-label="Risposta">{r.attending ? <span class="pill pill-yes">Parteciperà</span> : <span class="pill pill-no">Non viene</span>}</td>
                      <td data-label="Adulti">{r.attending ? r.adults : '—'}</td>
                      {d.askChildren && <td data-label="Bambini">{r.attending ? r.children : '—'}</td>}
                      {d.askDiet && <td data-label="Allergie e menu">{r.diet || '—'}</td>}
                      {d.customQuestion && <td data-label={d.customQuestion}>{r.answer || '—'}</td>}
                      <td data-label="Quando" class="muted small">
                        {formatDateTimeIt(r.updated_at)}
                      </td>
                      <td class="actions-cell">
                        <form method="post" action={`${base}/risposte/${r.id}/elimina`} data-confirm={`Eliminare la risposta di ${r.name}?`}>
                          <button class="icon-btn" type="submit" aria-label={`Elimina la risposta di ${r.name}`} title="Elimina">
                            {raw(uiIcon('trash'))}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section class="panel" id="invitati" data-panel="invitati">
          <div class="panel-head">
            <h2 class="h3">Lista invitati</h2>
          </div>
          <p class="muted">
            Aggiungi le persone o le famiglie che inviti: ognuna riceve un link con il proprio nome («Un invito speciale per Zia Carla e Zio Paolo»). Così vedi chi l’ha aperto, chi ha risposto e a chi mandare un promemoria.
            {!isActive && ' Puoi preparare la lista già adesso: i link funzioneranno appena pubblichi.'}
          </p>
          <form method="post" action={`${base}/invitati`} class="guest-form card">
            <div class="guest-form-row">
              <label class="field grow">
                <span class="field-label">Nome (persona o famiglia)</span>
                <input name="name" maxlength={80} placeholder="Es. Zia Carla e Zio Paolo" required />
              </label>
              <label class="field seats">
                <span class="field-label">Posti</span>
                <input name="seats" type="number" min={1} max={20} value="2" inputmode="numeric" />
              </label>
              <label class="field grow">
                <span class="field-label">WhatsApp (facoltativo)</span>
                <input name="phone" type="tel" maxlength={24} placeholder="333 123 4567" inputmode="tel" />
              </label>
              <button class="btn btn-primary" type="submit">
                Aggiungi
              </button>
            </div>
            <details class="bulk">
              <summary>Hai già la lista? Incollala qui</summary>
              <label class="field">
                <span class="field-label">Una riga per invitato: nome, posti, telefono (posti e telefono facoltativi)</span>
                <textarea name="bulk" rows={6} placeholder={'Zia Carla e Zio Paolo, 2, 333 1234567\nFamiglia Rossi, 4\nGiulia Bianchi'}></textarea>
              </label>
              <button class="btn btn-secondary btn-sm" type="submit" name="mode" value="bulk" formnovalidate>
                Aggiungi tutti
              </button>
            </details>
          </form>

          {guests.length > 0 && (
            <>
              <div class="filters" role="group" aria-label="Filtra invitati">
                <button type="button" class="filter on" data-filter="all">
                  Tutti
                </button>
                <button type="button" class="filter" data-filter="tosend">
                  Da inviare
                </button>
                <button type="button" class="filter" data-filter="pending">
                  Senza risposta
                </button>
                <button type="button" class="filter" data-filter="yes">
                  Confermati
                </button>
              </div>
              <ul class="guest-list">
                {guests.map((g) => {
                  const r = rsvpByGuest.get(g.id);
                  const url = origin + publicPath(inv, g.code);
                  const state = r ? (r.attending ? 'yes' : 'no') : g.sent_at || g.opened_count ? 'pending' : 'tosend';
                  return (
                    <li class="guest" data-state={state}>
                      <div class="g-main">
                        <strong>{g.name}</strong>
                        <span class="muted small">
                          {' '}
                          · {g.seats} {g.seats === 1 ? 'posto' : 'posti'}
                        </span>
                        <div class="g-status">
                          <GuestStatus g={g} rsvp={r} />
                          {g.opened_count > 0 && !r && <span class="muted small"> ultima apertura {formatDateTimeIt(g.last_opened_at)}</span>}
                        </div>
                      </div>
                      <div class="g-actions">
                        {!r && (
                          <a
                            class="btn btn-wa btn-sm"
                            href={waLink(g.sent_at || g.opened_count ? reminderText(inv, g, url) : guestText(inv, g, url), g.phone)}
                            target="_blank"
                            rel="noopener"
                            data-sent={`${base}/invitati/${g.id}/inviato`}
                          >
                            {g.sent_at || g.opened_count ? 'Promemoria' : 'Invia su WhatsApp'}
                          </a>
                        )}
                        <button type="button" class="btn btn-ghost btn-sm" data-copy={url}>
                          Copia link
                        </button>
                        <form method="post" action={`${base}/invitati/${g.id}/elimina`} data-confirm={`Rimuovere ${g.name} dalla lista?`}>
                          <button class="icon-btn" type="submit" aria-label={`Rimuovi ${g.name}`} title="Rimuovi">
                            ✕
                          </button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p class="muted small">
                Posti riservati in totale: {stats.invitedSeats} · confermati: {stats.people}
              </p>
            </>
          )}
        </section>

        <section class="panel" id="dediche" data-panel="dediche">
          <div class="panel-head">
            <h2 class="h3">Dediche</h2>
          </div>
          {messages.length === 0 ? (
            <p class="muted">I messaggi che gli invitati scrivono insieme alla risposta compariranno qui. Un bel ricordo da conservare.</p>
          ) : (
            <div class="messages">
              {messages.map((r) => (
                <figure class="msg">
                  <blockquote>{r.message}</blockquote>
                  <figcaption>— {r.name}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>

        <section class="card danger-zone">
          <h2 class="h3">Privacy e dati</h2>
          <p class="muted">
            Per proteggere i tuoi invitati, l’invito e tutte le risposte verranno cancellati automaticamente il <strong>{deleteOn}</strong>. Scarica prima l’Excel se vuoi conservarle.
          </p>
          <details>
            <summary>Elimina l’invito adesso</summary>
            <form method="post" action={`${base}/elimina`} class="delete-form" data-confirm="Eliminare definitivamente l’invito e tutte le risposte? Non si può annullare.">
              <label class="consent">
                <input type="checkbox" name="conferma" value="1" required />
                <span>Ho capito: l’invito, la lista invitati e tutte le risposte verranno cancellati per sempre.</span>
              </label>
              <button class="btn btn-danger btn-sm" type="submit">
                Elimina definitivamente
              </button>
            </form>
          </details>
        </section>
      </main>
    </Layout>
  );
}
