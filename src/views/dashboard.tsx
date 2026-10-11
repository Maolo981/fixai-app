import { raw } from 'hono/html';
import { BRAND, EVENT_BY_ID, RETENTION_DAYS_AFTER_EVENT, priceFor } from '../config';
import { occasionIcon, uiIcon } from '../icons';
import type { Stats } from '../db';
import { displayNames, parsePeople, publicPath, untouchedSampleFields } from '../model';
import type { GiftClaimRow, GuestRow, Invitation, RideRow, RsvpRow } from '../types';
import { addDays, daysUntil, euro, formatDateLong, formatDateShort, formatDateTimeIt, formatDayMonth, waLink } from '../util';
import { AppHeader } from './app-header';
import { Layout } from './layout';

export interface DashboardProps {
  inv: Invitation;
  origin: string;
  /** /gestisci/<admin token>, or /vedi/<viewer token> for the read-only view */
  base: string;
  rsvps: RsvpRow[];
  guests: GuestRow[];
  claims: GiftClaimRow[];
  rides: RideRow[];
  stats: Stats;
  flash?: { kind: 'ok' | 'err' | 'info'; text: string } | null;
  paymentsReady: boolean;
  /** co-organiser link: sees everything, changes nothing */
  readOnly?: boolean;
  /** null when the Telegram bot is not configured on this site */
  telegram: { linked: boolean; link: string } | null;
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

export function noticeText(inv: Invitation, url: string, name?: string) {
  const ev = EVENT_BY_ID[inv.event_type];
  return `Ciao${name ? ` ${name}` : ''}! Un aggiornamento sull’invito ${ev.eventPhrase(inv.data)}: ${inv.data.notice}\nTutti i dettagli qui: ${url}`;
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
          <li>Lista regali, tavoli, menu e passaggi</li>
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

/** Name, seats, phone, group, table and (when the programme has private steps) what the guest is invited to. */
function GuestFields({ g, hasRestricted }: { g?: GuestRow; hasRestricted: boolean }) {
  return (
    <>
      <div class="guest-form-row">
        <label class="field grow">
          <span class="field-label">Nome (persona o famiglia)</span>
          <input name="name" maxlength={80} placeholder="Es. Zia Carla e Zio Paolo" value={g?.name ?? ''} required />
        </label>
        <label class="field seats">
          <span class="field-label">Posti</span>
          <input name="seats" type="number" min={1} max={20} value={String(g?.seats ?? 2)} inputmode="numeric" />
        </label>
        <label class="field grow">
          <span class="field-label">WhatsApp (facoltativo)</span>
          <input name="phone" type="tel" maxlength={24} placeholder="333 123 4567" inputmode="tel" value={g?.phone ?? ''} />
        </label>
      </div>
      <div class="guest-form-row gf-2">
        <label class="field grow">
          <span class="field-label">Gruppo (facoltativo)</span>
          <input name="grp" maxlength={40} list="dl-groups" placeholder="Es. Famiglia, Amici, Colleghi" value={g?.grp ?? ''} />
        </label>
        <label class="field grow">
          <span class="field-label">Tavolo (facoltativo)</span>
          <input name="table" maxlength={40} list="dl-tables" placeholder="Es. Tavolo 4" value={g?.table_name ?? ''} />
        </label>
      </div>
      {hasRestricted && (
        <label class="check-line">
          <input type="checkbox" name="partial" checked={g ? g.full_access === 0 : false} />
          <span>Invitato solo alle tappe aperte a tutti (non vede quelle riservate)</span>
        </label>
      )}
    </>
  );
}

function MenuTotals({ menus, options }: { menus: Record<string, number>; options: string[] }) {
  const missing = menus[''] ?? 0;
  return (
    <div class="menu-totals" aria-label="Totale menu">
      <span class="menu-totals-label">Menu</span>
      {options.map((o) => (
        <span class="menu-chip">
          {o} <strong>{menus[o] ?? 0}</strong>
        </span>
      ))}
      {missing > 0 && (
        <span class="menu-chip menu-chip-missing">
          Non scelto <strong>{missing}</strong>
        </span>
      )}
    </div>
  );
}

function GiftsPanel({ inv, claims, rides, base, readOnly }: { inv: Invitation; claims: GiftClaimRow[]; rides: RideRow[]; base: string; readOnly?: boolean }) {
  const d = inv.data;
  return (
    <section class="panel" id="regali" data-panel="regali">
      {d.gifts.length > 0 && (
        <>
          <div class="panel-head">
            <h2 class="h3">{inv.event_type === 'matrimonio' ? 'Lista nozze' : 'Lista regali'}</h2>
          </div>
          <p class="muted">Gli invitati prenotano i regali dall’invito, così nessuno sceglie lo stesso. Il pagamento lo fanno loro, come preferiscono.</p>
          <ul class="gift-admin">
            {d.gifts.map((g) => {
              const mine = claims.filter((c) => c.gift_id === g.id);
              const sum = mine.reduce((s, c) => s + c.amount_cents, 0);
              return (
                <li>
                  <div class="ga-head">
                    <strong>{g.title}</strong>
                    <span class="muted small">
                      {g.kind === 'fund' ? `Raccolti ${euro(sum)}${g.price ? ` su ${euro(g.price * 100)}` : ''}` : g.price ? euro(g.price * 100) : ''}
                    </span>
                  </div>
                  {mine.length === 0 ? (
                    <p class="muted small">{g.kind === 'fund' ? 'Ancora nessuna quota.' : 'Ancora libero'}</p>
                  ) : (
                    <ul class="ga-claims">
                      {mine.map((c) => (
                        <li>
                          <span>
                            {g.kind === 'fund' ? `${c.name} · ${euro(c.amount_cents)}` : `Prenotato da ${c.name}`}
                            <span class="muted small"> · {formatDateTimeIt(c.created_at)}</span>
                          </span>
                          {!readOnly && (
                            <form
                              method="post"
                              action={`${base}/regali/${c.id}/elimina`}
                              data-confirm={g.kind === 'fund' ? `Cancellare la quota di ${c.name}?` : `Liberare «${g.title}»? Tornerà disponibile per gli altri invitati.`}
                            >
                              <button type="submit" class="link-danger">
                                {g.kind === 'fund' ? 'Cancella' : 'Libera'}
                              </button>
                            </form>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {d.ridesBoard && (
        <>
          <div class="panel-head" id="passaggi">
            <h2 class="h3">Bacheca dei passaggi</h2>
          </div>
          {rides.length === 0 ? (
            <p class="muted">Ancora nessun annuncio. Gli invitati possono offrire o chiedere un passaggio dall’invito.</p>
          ) : (
            <ul class="ride-admin">
              {rides.map((r) => (
                <li>
                  <span>
                    <strong>{r.kind === 'offer' ? 'Offre' : 'Cerca'}</strong> · da {r.place} · {r.name}
                    {r.kind === 'offer' ? ` · ${r.seats} ${r.seats === 1 ? 'posto' : 'posti'}` : ''}
                    {r.note ? <span class="muted small"> · {r.note}</span> : ''}
                  </span>
                  {!readOnly && (
                    <form method="post" action={`${base}/passaggi/${r.id}/elimina`} data-confirm={`Eliminare l’annuncio di ${r.name}?`}>
                      <button type="submit" class="link-danger">
                        Elimina
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function ToolsCard({ inv, origin, guests, telegram }: { inv: Invitation; origin: string; guests: GuestRow[]; telegram: DashboardProps['telegram'] }) {
  const base = `/gestisci/${inv.admin_token}`;
  const d = inv.data;
  const viewerUrl = inv.viewer_token ? `${origin}/vedi/${inv.viewer_token}` : '';
  const publicUrl = origin + publicPath(inv);
  const withPhone = guests.filter((g) => g.phone);
  return (
    <section class="tools" id="strumenti" aria-label="Strumenti">
      {d.notice && inv.status === 'active' && (
        <div class="card tool tool-wide" id="avviso">
          <h2 class="h4">
            {raw(uiIcon('megaphone', 'icon inline-icon'))} Manda l’avviso agli invitati
          </h2>
          <p class="muted">«{d.notice}»</p>
          <div class="share-btns">
            <a class="btn btn-wa btn-sm" href={waLink(noticeText(inv, publicUrl))} target="_blank" rel="noopener">
              Condividi su WhatsApp
            </a>
          </div>
          {withPhone.length > 0 && (
            <details class="notice-list">
              <summary>Mandalo a uno a uno ({withPhone.length})</summary>
              <ul>
                {withPhone.map((g) => (
                  <li>
                    <span>{g.name}</span>
                    <a class="btn btn-wa btn-sm" href={waLink(noticeText(inv, origin + publicPath(inv, g.code), g.name), g.phone)} target="_blank" rel="noopener">
                      Invia
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <div class="card tool">
        <h2 class="h4">{raw(uiIcon('printer', 'icon inline-icon'))} Da stampare</h2>
        <p class="muted">Per chi preferisce la carta, con il codice QR che apre l’invito.</p>
        <ul class="tool-links">
          <li>
            <a href={`${base}/stampa`} target="_blank" rel="noopener">
              Invito A5 con QR ↗
            </a>
          </li>
          <li>
            <a href={`${base}/stampa?invitati=1`} target="_blank" rel="noopener">
              Biglietti con il nome di ogni invitato ↗
            </a>
          </li>
          <li>
            <a href={`${base}/tableau`} target="_blank" rel="noopener">
              Tableau dei tavoli ↗
            </a>
          </li>
        </ul>
      </div>
      <div class="card tool" id="condividi">
        <h2 class="h4">{raw(uiIcon('users', 'icon inline-icon'))} Fatti aiutare</h2>
        <p class="muted">Un link per vedere risposte, lista e tavoli senza poter cambiare nulla: per i genitori, i testimoni o la wedding planner.</p>
        {viewerUrl ? (
          <>
            <div class="copy-field">
              <input readonly value={viewerUrl} aria-label="Link di sola lettura" />
              <button type="button" class="btn btn-secondary btn-sm" data-copy={viewerUrl}>
                Copia
              </button>
            </div>
            <form method="post" action={`${base}/condividi/revoca`} data-confirm="Disattivare il link? Chi lo ha non potrà più vedere le risposte.">
              <button type="submit" class="link-danger">
                Disattiva il link
              </button>
            </form>
          </>
        ) : (
          <form method="post" action={`${base}/condividi`}>
            <button type="submit" class="btn btn-secondary btn-sm">
              Crea il link di sola lettura
            </button>
          </form>
        )}
      </div>
      {telegram && (
        <div class="card tool" id="avvisi">
          <h2 class="h4">{raw(uiIcon('send', 'icon inline-icon'))} Risposte su Telegram</h2>
          {telegram.linked ? (
            <>
              <p class="muted">
                <strong class="ok-text">✓ Collegato.</strong> Ogni nuova risposta arriva anche su Telegram.
              </p>
              <form method="post" action={`${base}/telegram/scollega`}>
                <button type="submit" class="link-danger">
                  Scollega Telegram
                </button>
              </form>
            </>
          ) : (
            <>
              <p class="muted">Ricevi ogni nuova risposta in un messaggio su Telegram. Si apre Telegram: premi «Avvia» e hai finito.</p>
              <a class="btn btn-secondary btn-sm" href={telegram.link} target="_blank" rel="noopener">
                Collega Telegram
              </a>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export function DashboardPage(p: DashboardProps) {
  const { inv, rsvps, guests, stats, origin, base, readOnly } = p;
  const d = inv.data;
  const ev = EVENT_BY_ID[inv.event_type];
  const days = daysUntil(d.date);
  const rsvpByGuest = new Map(rsvps.filter((r) => r.guest_id).map((r) => [r.guest_id!, r]));
  const messages = rsvps.filter((r) => r.message);
  const songs = rsvps.filter((r) => r.song);
  const deleteOn = formatDateShort(addDays(d.date, RETENTION_DAYS_AFTER_EVENT));
  const isActive = inv.status === 'active';
  const askPeople = d.askNames || d.menuOptions.length > 0;
  const hasRestricted = d.program.some((x) => x.restricted);
  const groups = [...new Set(guests.map((g) => g.grp).filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b, 'it'));
  const tables = [...new Set(guests.map((g) => g.table_name).filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b, 'it', { numeric: true }));
  const showGifts = d.gifts.length > 0 || d.ridesBoard;

  return (
    <Layout
      title={`${displayNames(d)} · Risposte · ${BRAND.name}`}
      noindex
      bodyClass="app"
      header={<AppHeader inv={inv} active="dash" readOnly={readOnly} />}
      hideFooter
      scripts={['/js/site.js', '/js/dashboard.js']}
    >
      <main class="container dash">
        {p.flash && <div class={`notice notice-${p.flash.kind}`}>{p.flash.text}</div>}
        {readOnly && (
          <div class="notice notice-info">
            <strong>Sola lettura.</strong> Vedi risposte, lista e tavoli in tempo reale; per cambiare qualcosa chiedi a chi organizza.
          </div>
        )}

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
          {!readOnly && (
            <div class="dash-actions">
              <a class="btn btn-secondary" href={`${base}/modifica`}>
                Modifica invito
              </a>
            </div>
          )}
        </div>

        {!readOnly && !isActive && <PublishCard inv={inv} paymentsReady={p.paymentsReady} />}
        {!readOnly && isActive && <ShareCard inv={inv} origin={origin} />}

        {!readOnly && !inv.email && (
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
            Invitati <span class="count">{guests.length}</span>
          </a>
          {showGifts && (
            <a href="#regali" class="tab" role="tab" data-tab="regali">
              {d.gifts.length ? 'Regali' : 'Passaggi'} <span class="count">{d.gifts.length ? p.claims.length : p.rides.length}</span>
            </a>
          )}
          <a href="#dediche" class="tab" role="tab" data-tab="dediche">
            {d.askSong ? 'Dediche e musica' : 'Dediche'} <span class="count">{messages.length + songs.length}</span>
          </a>
        </div>

        <section class="panel" id="risposte" data-panel="risposte">
          <div class="panel-head">
            <h2 class="h3">Risposte</h2>
            {rsvps.length > 0 && (
              <div class="panel-tools">
                <a class="btn btn-secondary btn-sm" href={`${base}/risposte.csv`}>
                  ⬇ Excel delle risposte
                </a>
                {stats.yes > 0 && (
                  <a class="btn btn-ghost btn-sm" href={`${base}/catering.csv`}>
                    ⬇ Excel per il catering
                  </a>
                )}
              </div>
            )}
          </div>
          {d.menuOptions.length > 0 && stats.people > 0 && <MenuTotals menus={stats.menus} options={d.menuOptions} />}
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
                    {askPeople && <th>{d.menuOptions.length ? 'Persone e menu' : 'Persone'}</th>}
                    {d.askDiet && <th>Allergie</th>}
                    {d.customQuestion && <th>{d.customQuestion}</th>}
                    <th>Quando</th>
                    {!readOnly && (
                      <th>
                        <span class="sr-only">Azioni</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rsvps.map((r) => {
                    const people = parsePeople(r.people).filter((x) => x.name || x.menu);
                    return (
                      <tr class={r.attending ? 'yes' : 'no'}>
                        <td data-label="Nome">
                          <strong>{r.name}</strong>
                          {r.guest_id && <span class="muted small"> · link personale</span>}
                        </td>
                        <td data-label="Risposta">{r.attending ? <span class="pill pill-yes">Parteciperà</span> : <span class="pill pill-no">Non viene</span>}</td>
                        <td data-label="Adulti">{r.attending ? r.adults : '—'}</td>
                        {d.askChildren && <td data-label="Bambini">{r.attending ? r.children : '—'}</td>}
                        {askPeople && (
                          <td data-label={d.menuOptions.length ? 'Persone e menu' : 'Persone'}>
                            {people.length ? (
                              <ul class="people-cell">
                                {people.map((x) => (
                                  <li>
                                    {x.name || (x.child ? 'Bambino' : 'Adulto')}
                                    {x.menu && <span class="m-badge">{x.menu}</span>}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
                        {d.askDiet && <td data-label="Allergie">{r.diet || '—'}</td>}
                        {d.customQuestion && <td data-label={d.customQuestion}>{r.answer || '—'}</td>}
                        <td data-label="Quando" class="muted small">
                          {formatDateTimeIt(r.updated_at)}
                        </td>
                        {!readOnly && (
                          <td class="actions-cell">
                            <form method="post" action={`${base}/risposte/${r.id}/elimina`} data-confirm={`Eliminare la risposta di ${r.name}?`}>
                              <button class="icon-btn" type="submit" aria-label={`Elimina la risposta di ${r.name}`} title="Elimina">
                                {raw(uiIcon('trash'))}
                              </button>
                            </form>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section class="panel" id="invitati" data-panel="invitati">
          <div class="panel-head">
            <h2 class="h3">Lista invitati</h2>
            {guests.length > 0 && (
              <div class="panel-tools">
                <a class="btn btn-ghost btn-sm" href={`${base}/tableau`} target="_blank" rel="noopener">
                  {raw(uiIcon('table', 'icon inline-icon'))} Tableau
                </a>
                {!readOnly && (
                  <a class="btn btn-ghost btn-sm" href={`${base}/stampa?invitati=1`} target="_blank" rel="noopener">
                    {raw(uiIcon('printer', 'icon inline-icon'))} Biglietti con QR
                  </a>
                )}
              </div>
            )}
          </div>
          {!readOnly && (
            <>
              <p class="muted">
                Aggiungi le persone o le famiglie che inviti: ognuna riceve un link con il proprio nome («Un invito speciale per Zia Carla e Zio Paolo»). Così vedi chi l’ha aperto, chi ha risposto e a chi mandare un promemoria.
                {!isActive && ' Puoi preparare la lista già adesso: i link funzioneranno appena pubblichi.'}
              </p>
              <form method="post" action={`${base}/invitati`} class="guest-form card">
                <GuestFields hasRestricted={hasRestricted} />
                <div class="guest-form-actions">
                  <button class="btn btn-primary" type="submit">
                    Aggiungi
                  </button>
                </div>
                <details class="bulk">
                  <summary>Hai già la lista? Incollala qui</summary>
                  <label class="field">
                    <span class="field-label">Una riga per invitato: nome, posti, telefono (posti e telefono facoltativi). Il gruppo scritto sopra vale per tutti.</span>
                    <textarea name="bulk" rows={6} placeholder={'Zia Carla e Zio Paolo, 2, 333 1234567\nFamiglia Rossi, 4\nGiulia Bianchi'}></textarea>
                  </label>
                  <div class="row-between">
                    <button class="btn btn-secondary btn-sm" type="submit" name="mode" value="bulk" formnovalidate>
                      Aggiungi tutti
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm" id="pick-contacts" hidden>
                      {raw(uiIcon('phone', 'icon inline-icon'))} Scegli dalla rubrica
                    </button>
                  </div>
                </details>
              </form>
              <datalist id="dl-groups">
                {[...new Set([...groups, 'Famiglia', 'Amici', 'Colleghi'])].map((x) => (
                  <option value={x} />
                ))}
              </datalist>
              <datalist id="dl-tables">
                {tables.map((x) => (
                  <option value={x} />
                ))}
              </datalist>
            </>
          )}

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
              {groups.length > 0 && (
                <div class="filters group-filters" role="group" aria-label="Filtra per gruppo">
                  <button type="button" class="filter on" data-group-filter="">
                    Tutti i gruppi
                  </button>
                  {groups.map((x) => (
                    <button type="button" class="filter" data-group-filter={x}>
                      {x} <span class="count">{guests.filter((g) => g.grp === x).length}</span>
                    </button>
                  ))}
                </div>
              )}
              <ul class="guest-list">
                {guests.map((g) => {
                  const r = rsvpByGuest.get(g.id);
                  const url = origin + publicPath(inv, g.code);
                  const state = r ? (r.attending ? 'yes' : 'no') : g.sent_at || g.opened_count ? 'pending' : 'tosend';
                  return (
                    <li class="guest" data-state={state} data-group={g.grp ?? ''}>
                      <div class="g-main">
                        <strong>{g.name}</strong>
                        <span class="muted small">
                          {' '}
                          · {g.seats} {g.seats === 1 ? 'posto' : 'posti'}
                          {g.grp ? ` · ${g.grp}` : ''}
                        </span>
                        <div class="g-status">
                          <GuestStatus g={g} rsvp={r} />
                          {g.table_name && <span class="pill pill-table">{g.table_name}</span>}
                          {hasRestricted && g.full_access === 0 && <span class="pill">Solo tappe aperte</span>}
                          {g.opened_count > 0 && !r && <span class="muted small"> ultima apertura {formatDateTimeIt(g.last_opened_at)}</span>}
                        </div>
                      </div>
                      <div class="g-actions">
                        {!readOnly && !r && (
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
                        {!readOnly && (
                          <form method="post" action={`${base}/invitati/${g.id}/elimina`} data-confirm={`Rimuovere ${g.name} dalla lista?`}>
                            <button class="icon-btn" type="submit" aria-label={`Rimuovi ${g.name}`} title="Rimuovi">
                              ✕
                            </button>
                          </form>
                        )}
                      </div>
                      {!readOnly && (
                        <details class="g-edit">
                          <summary>Modifica gruppo, tavolo e posti</summary>
                          <form method="post" action={`${base}/invitati/${g.id}/modifica`} class="guest-form">
                            <GuestFields g={g} hasRestricted={hasRestricted} />
                            <div class="guest-form-actions">
                              <button class="btn btn-secondary btn-sm" type="submit">
                                Salva
                              </button>
                            </div>
                          </form>
                        </details>
                      )}
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

        {showGifts && <GiftsPanel inv={inv} claims={p.claims} rides={p.rides} base={base} readOnly={readOnly} />}

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
          {d.askSong && (
            <>
              <div class="panel-head" id="musica">
                <h2 class="h3">Le canzoni per la festa</h2>
              </div>
              {songs.length === 0 ? (
                <p class="muted">Le canzoni proposte dagli invitati compariranno qui: girale al DJ.</p>
              ) : (
                <ol class="songs">
                  {songs.map((r) => (
                    <li>
                      {raw(uiIcon('music', 'icon inline-icon'))}
                      <strong>{r.song}</strong> <span class="muted small">· {r.name}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </section>

        {!readOnly && <ToolsCard inv={inv} origin={origin} guests={guests} telegram={p.telegram} />}

        {!readOnly && (
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
        )}
      </main>
    </Layout>
  );
}
