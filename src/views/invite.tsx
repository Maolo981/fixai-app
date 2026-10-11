import { raw } from 'hono/html';
import { googleCalendarUrl } from '../calendar';
import { BRAND, EVENT_BY_ID } from '../config';
import { displayNames, initials, parseGallery, parsePeople, tableRevealActive, visibleProgram } from '../model';
import { THEME_BY_ID, ornaments, themeInlineCss } from '../themes';
import type { GiftClaimRow, GiftItem, GuestRow, InviteData, Invitation, RideRow, RsvpRow } from '../types';
import { euro, formatDateLong, formatDateParts, formatDateShort, formatDayMonth, formatIban, formatTime, mapsLink, romeToUtc, romeYmd, waLink } from '../util';

export type InviteMode = 'live' | 'preview' | 'demo';

export interface InviteViewProps {
  inv: Pick<Invitation, 'id' | 'slug' | 'vanity' | 'event_type' | 'theme' | 'data' | 'status' | 'cover_key' | 'gallery' | 'og_key'>;
  mode: InviteMode;
  origin: string;
  /** public path used for links (/i/slug or /demo/theme) */
  basePath: string;
  guest?: GuestRow | null;
  guestRsvp?: RsvpRow | null;
  showEnvelope: boolean;
  rsvp: { open: boolean; reason?: string };
  /** reservations of the gift registry (statuses only are shown to guests) */
  claims?: GiftClaimRow[];
  rides?: RideRow[];
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function namesSizeClass(d: InviteData): string {
  const longest = Math.max(d.name1.length, d.name2.length);
  if (longest <= 7) return 'ns-xl';
  if (longest <= 10) return 'ns-l';
  if (longest <= 14) return 'ns-m';
  return 'ns-s';
}

/** Initials for the crest and the wax seal ("A & M"). */
export function Monogram({ d }: { d: Pick<InviteData, 'name1' | 'name2'> }) {
  const [a, b] = initials(d).split('&');
  return b ? (
    <>
      {a}
      <span class="mono-amp">&amp;</span>
      {b}
    </>
  ) : (
    <>{a}</>
  );
}

function Countdown({ start }: { start: Date }) {
  const diff = Math.max(0, start.getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return (
    <section class="countdown sec" aria-label="Conto alla rovescia">
      <p class="kicker">Mancano</p>
      <div class="cd" data-countdown={start.toISOString()}>
        <div>
          <span data-u="d">{days}</span>
          <small>giorni</small>
        </div>
        <div>
          <span data-u="h">{hours}</span>
          <small>ore</small>
        </div>
        <div>
          <span data-u="m">{mins}</span>
          <small>minuti</small>
        </div>
        <div>
          <span data-u="s">0</span>
          <small>secondi</small>
        </div>
      </div>
    </section>
  );
}

function GiftForm({ fund }: { fund?: boolean }) {
  return (
    <form class="gift-form" data-gift-form hidden>
      <div class="row">
        <input name="name" maxlength={60} placeholder="Il tuo nome" aria-label="Il tuo nome" autocomplete="name" required />
        {fund && <input name="amount" type="number" min={1} max={10000} inputmode="numeric" placeholder="Quota in €" aria-label="Quota in euro" required />}
      </div>
      <div class="row">
        <button type="submit" class="btn btn-primary btn-sm">
          Conferma
        </button>
        <button type="button" class="btn btn-ghost btn-sm" data-gift-close>
          Annulla
        </button>
      </div>
    </form>
  );
}

function Gift({ g, claims, open }: { g: GiftItem; claims: GiftClaimRow[]; open: boolean }) {
  const ids = claims.map((c) => c.id).join(',');
  if (g.kind === 'fund') {
    const sum = claims.reduce((s, c) => s + c.amount_cents, 0);
    const pct = g.price > 0 ? Math.min(100, Math.round((sum / (g.price * 100)) * 100)) : 0;
    return (
      <li class="gift gift-fund" data-gift={g.id} data-kind="fund" data-claims={ids} data-target={String(g.price)}>
        <div class="gift-head">
          <span class="gift-title">{g.title}</span>
          {g.price > 0 && <span class="gift-price">obiettivo {euro(g.price * 100)}</span>}
        </div>
        {g.note && <p class="gift-note">{g.note}</p>}
        {g.price > 0 && (
          <div class="fund-bar" aria-hidden="true">
            <span style={`width:${pct}%`}></span>
          </div>
        )}
        <p class="fund-sum">
          {claims.length ? `Raccolti ${euro(sum)} da ${claims.length} ${claims.length === 1 ? 'persona' : 'persone'}` : 'Ancora nessuna quota: inizia tu!'}
        </p>
        <div class="gift-actions">
          {g.link && (
            <a class="btn btn-ghost btn-sm" href={g.link} target="_blank" rel="noopener nofollow">
              Vedi
            </a>
          )}
          {open && (
            <button type="button" class="btn btn-primary btn-sm" data-gift-open>
              Partecipo
            </button>
          )}
          <span class="gift-state" data-gift-state></span>
        </div>
        <GiftForm fund />
      </li>
    );
  }
  const taken = claims.length > 0;
  return (
    <li class={`gift${taken ? ' taken' : ''}`} data-gift={g.id} data-kind="item" data-claims={ids}>
      <div class="gift-head">
        <span class="gift-title">{g.title}</span>
        {g.price > 0 && <span class="gift-price">{euro(g.price * 100)}</span>}
      </div>
      {g.note && <p class="gift-note">{g.note}</p>}
      <div class="gift-actions">
        {g.link && (
          <a class="btn btn-ghost btn-sm" href={g.link} target="_blank" rel="noopener nofollow">
            Vedi
          </a>
        )}
        {!taken && open && (
          <button type="button" class="btn btn-primary btn-sm" data-gift-open>
            Lo regalo io
          </button>
        )}
        <span class="gift-state" data-gift-state>
          {taken ? 'Già scelto da un invitato' : ''}
        </span>
      </div>
      <GiftForm />
    </li>
  );
}

/** Names, date, time and place: shared by the invitation and its printable version. */
export function HeroText({ inv, std, place }: { inv: Pick<Invitation, 'event_type' | 'theme' | 'data'>; std?: boolean; place?: string }) {
  const d = inv.data;
  const ev = EVENT_BY_ID[inv.event_type];
  const dateParts = formatDateParts(d.date);
  return (
    <>
      {std && <p class="eyebrow">Save the date</p>}
      {d.eyebrow && <p class="eyebrow">{d.eyebrow}</p>}
      <h1 class={`names ${namesSizeClass(d)}`}>
        {ev.couple && d.name2 ? (
          <>
            <span class="n">{d.name1}</span>
            <span class="amp">&amp;</span>
            <span class="n">{d.name2}</span>
          </>
        ) : (
          <span class="n">{d.name1 || displayNames(d)}</span>
        )}
      </h1>
      {d.subtitle && <p class="subtitle">{d.subtitle}</p>}
      {raw(ornaments(inv.theme).divider)}
      {dateParts && (
        <p class="date">
          <span class="d-wd">{dateParts.weekday}</span> <span class="d-day">{dateParts.day}</span> <span class="d-mo">{dateParts.month}</span>{' '}
          <span class="d-yr">{dateParts.year}</span>
        </p>
      )}
      {d.time && !std && <p class="time">{formatTime(d.time)}</p>}
      {place && <p class="place">{place}</p>}
    </>
  );
}

/** One line under a ride on the board ("Giulia · 3 posti liberi · parto alle 9"). */
export function rideSummary(r: Pick<RideRow, 'kind' | 'name' | 'seats' | 'note'>): string {
  const seats = r.kind === 'offer' ? ` · ${r.seats} ${r.seats === 1 ? 'posto libero' : 'posti liberi'}` : r.seats > 1 ? ` · ${r.seats} persone` : '';
  return `${r.name}${seats}${r.note ? ` · ${r.note}` : ''}`;
}

export function rideWaText(r: Pick<RideRow, 'kind' | 'name' | 'place'>, eventPhrase: string): string {
  return `Ciao ${r.name}! Ho visto sulla bacheca dei passaggi dell’invito ${eventPhrase} che ${r.kind === 'offer' ? 'offri un passaggio' : 'cerchi un passaggio'} da ${r.place}. `;
}

function RsvpSection(p: InviteViewProps) {
  const d = p.inv.data;
  const ev = EVENT_BY_ID[p.inv.event_type];
  const g = p.guest;
  const prev = p.guestRsvp;
  const maxSeats = g && g.seats > 0 ? g.seats : 10;
  const adults = prev && prev.attending ? Math.max(prev.adults, 0) : Math.min(g?.seats || 1, maxSeats) || 1;
  const children = prev && prev.attending ? prev.children : 0;
  const askPeople = d.askNames || d.menuOptions.length > 0;
  return (
    <section class="rsvp sec" id="rsvp">
      <p class="kicker">Rispondi all’invito</p>
      <h2 class="sec-title">Ci sarai?</h2>
      {d.rsvpDeadline && p.rsvp.open && (
        <p class="deadline">
          Ti chiediamo di rispondere entro il <strong>{formatDayMonth(d.rsvpDeadline)}</strong>.
        </p>
      )}
      {!p.rsvp.open && p.rsvp.reason && <p class="rsvp-closed">{p.rsvp.reason}</p>}
      {prev && (
        <p class="already" id="rsvp-already">
          Hai già risposto: <strong>{prev.attending ? `ci sarai (${prev.adults + prev.children} ${prev.adults + prev.children === 1 ? 'persona' : 'persone'})` : 'non potrai esserci'}</strong>. Puoi modificare la risposta qui sotto.
        </p>
      )}
      <form
        class="rsvp-form"
        id="rsvp-form"
        data-mode={p.mode}
        data-open={p.rsvp.open ? '1' : '0'}
        data-endpoint={`${p.basePath}/rsvp`}
        data-key={`confetto:${p.inv.slug}`}
        novalidate
      >
        <input type="text" name="website" class="hp" tabindex={-1} autocomplete="off" aria-hidden="true" />
        {g && <input type="hidden" name="guestCode" value={g.code} />}
        <label class="field">
          <span>Nome e cognome</span>
          <input name="name" required maxlength={80} value={prev?.name ?? g?.name ?? ''} autocomplete="name" placeholder="Il tuo nome" />
        </label>
        <fieldset class="choice">
          <legend class="sr-only">Parteciperai?</legend>
          <label class="choice-opt">
            <input type="radio" name="attending" value="yes" checked={prev?.attending === 1} />
            <span>Sì, ci sarò</span>
          </label>
          <label class="choice-opt">
            <input type="radio" name="attending" value="no" checked={prev?.attending === 0} />
            <span>No, non potrò esserci</span>
          </label>
        </fieldset>
        <div class="if-yes">
          <div class="steppers">
            <div class="stepper">
              <span class="stp-label">Adulti</span>
              <div class="stp">
                <button type="button" data-step="-1" aria-label="Un adulto in meno">−</button>
                <input type="number" name="adults" inputmode="numeric" min={0} max={maxSeats} value={adults} aria-label="Numero di adulti" />
                <button type="button" data-step="1" aria-label="Un adulto in più">+</button>
              </div>
            </div>
            {d.askChildren && (
              <div class="stepper">
                <span class="stp-label">Bambini</span>
                <div class="stp">
                  <button type="button" data-step="-1" aria-label="Un bambino in meno">−</button>
                  <input type="number" name="children" inputmode="numeric" min={0} max={maxSeats} value={children} aria-label="Numero di bambini" />
                  <button type="button" data-step="1" aria-label="Un bambino in più">+</button>
                </div>
              </div>
            )}
          </div>
          {g && g.seats > 0 && (
            <p class="seats-note" data-seats={g.seats}>
              Abbiamo riservato {g.seats} {g.seats === 1 ? 'posto' : 'posti'} per voi.
            </p>
          )}
          {askPeople && (
            <div class="people" data-people data-names={d.askNames ? '1' : '0'} data-menu={JSON.stringify(d.menuOptions)} data-prev={JSON.stringify(prev ? parsePeople(prev.people) : [])}>
              <p class="people-title">{d.askNames && d.menuOptions.length ? 'Nome e menu di ogni persona' : d.askNames ? 'Chi viene?' : 'Il menu di ogni persona'}</p>
            </div>
          )}
          {d.askDiet && (
            <label class="field">
              <span>Allergie o intolleranze</span>
              <textarea name="diet" rows={2} maxlength={300} placeholder="Es. 1 celiaco, 1 senza lattosio">
                {prev?.diet ?? ''}
              </textarea>
            </label>
          )}
          {d.customQuestion && (
            <label class="field">
              <span>{d.customQuestion}</span>
              <input name="answer" maxlength={200} value={prev?.answer ?? ''} />
            </label>
          )}
          {d.askSong && (
            <label class="field">
              <span>
                Una canzone che non può mancare <em>(facoltativo)</em>
              </span>
              <input name="song" maxlength={120} value={prev?.song ?? ''} placeholder="Titolo e cantante" />
            </label>
          )}
        </div>
        <label class="field">
          <span>
            {capitalize(ev.messageFor)} <em>(facoltativo)</em>
          </span>
          <textarea name="message" rows={3} maxlength={600}>
            {prev?.message ?? ''}
          </textarea>
        </label>
        <button class="btn btn-primary btn-block" type="submit">
          Invia la risposta
        </button>
        <p class="form-msg" role="status" aria-live="polite"></p>
      </form>
      <div class="rsvp-done" id="rsvp-done" hidden>
        <div class="done-yes">
          <p class="done-emoji" aria-hidden="true">
            ✦
          </p>
          <h3>Grazie, a presto!</h3>
          <p>Abbiamo ricevuto la tua risposta. Segna la data in calendario qui sotto.</p>
        </div>
        <div class="done-no">
          <p class="done-emoji" aria-hidden="true">
            ✦
          </p>
          <h3>Grazie di cuore</h3>
          <p>Ci dispiace che non potrai esserci: ti penseremo.</p>
        </div>
        <button class="link-btn" type="button" id="rsvp-edit">
          Modifica la risposta
        </button>
      </div>
    </section>
  );
}

function RidesSection({ rides, basePath, open, eventPhrase }: { rides: RideRow[]; basePath: string; open: boolean; eventPhrase: string }) {
  return (
    <section class="rides sec" id="passaggi">
      <h2 class="sec-title">Passaggi</h2>
      <p class="sec-intro">Offri un posto in macchina o chiedi un passaggio agli altri invitati.</p>
      <ul class="ride-list" data-ride-list>
        {rides.map((r) => (
          <li class="ride" data-ride={r.id}>
            <div class="ride-main">
              <span class={`ride-kind ${r.kind}`}>{r.kind === 'offer' ? 'Offre un passaggio' : 'Cerca un passaggio'}</span>
              <strong>Da {r.place}</strong>
              <span>{rideSummary(r)}</span>
            </div>
            <a
              class="btn btn-ghost btn-sm"
              href={waLink(rideWaText(r, eventPhrase), r.phone)}
              target="_blank"
              rel="noopener"
            >
              Scrivi
            </a>
          </li>
        ))}
      </ul>
      {rides.length === 0 && (
        <p class="rides-empty" data-rides-empty>
          Ancora nessun passaggio: sii il primo!
        </p>
      )}
      {open && (
        <>
          <button type="button" class="btn btn-ghost" data-ride-open>
            Offri o chiedi un passaggio
          </button>
          <form class="ride-form" data-ride-form data-endpoint={`${basePath}/passaggi`} hidden>
            <fieldset class="choice ride-kinds">
              <legend class="sr-only">Offri o cerchi?</legend>
              <label class="choice-opt">
                <input type="radio" name="kind" value="offer" checked />
                <span>Offro</span>
              </label>
              <label class="choice-opt">
                <input type="radio" name="kind" value="need" />
                <span>Cerco</span>
              </label>
            </fieldset>
            <label class="field">
              <span>Da dove parti?</span>
              <input name="place" maxlength={80} placeholder="Es. Milano Centrale" required />
            </label>
            <label class="field">
              <span>Posti (o persone, se cerchi)</span>
              <input name="seats" type="number" min={1} max={8} value="1" inputmode="numeric" />
            </label>
            <label class="field">
              <span>Il tuo nome</span>
              <input name="name" maxlength={60} autocomplete="name" required />
            </label>
            <label class="field">
              <span>Il tuo WhatsApp</span>
              <input name="phone" type="tel" maxlength={24} inputmode="tel" autocomplete="tel" required />
            </label>
            <label class="field">
              <span>
                Note <em>(facoltative)</em>
              </span>
              <input name="note" maxlength={120} placeholder="Es. parto alle 9, rientro dopo la torta" />
            </label>
            <p class="seats-note">Nome e numero saranno visibili solo a chi ha il link di questo invito. Puoi cancellare l’annuncio quando vuoi.</p>
            <button type="submit" class="btn btn-primary btn-block">
              Pubblica l’annuncio
            </button>
            <p class="form-msg" role="status" aria-live="polite"></p>
          </form>
        </>
      )}
    </section>
  );
}

export function InvitePage(p: InviteViewProps) {
  const { inv, mode, origin } = p;
  const d = inv.data;
  const ev = EVENT_BY_ID[inv.event_type];
  const theme = THEME_BY_ID[inv.theme];
  const orn = ornaments(inv.theme);
  const names = displayNames(d);
  const dateLong = formatDateLong(d.date);
  const start = romeToUtc(d.date, d.time || '12:00');
  const coverUrl = inv.cover_key ? `/media/${inv.cover_key}` : null;
  const ogImage = coverUrl ? origin + coverUrl : inv.og_key ? `${origin}/media/${inv.og_key}` : `${origin}/og/${inv.theme}.png`;
  const program = visibleProgram(d, p.guest, mode !== 'live');
  const firstPlace = program.find((x) => x.place)?.place ?? '';
  const pageUrl = origin + p.basePath + (p.guest ? `/${p.guest.code}` : '');
  const calTitle = `${ev.label}: ${names}`;
  const calLocation = [program[0]?.place, program[0]?.address].filter(Boolean).join(', ');
  const lastTime = [...program].reverse().find((x) => x.time)?.time;
  const duration = lastTime && d.time && lastTime > d.time ? (+lastTime.slice(0, 2) - +d.time.slice(0, 2)) * 60 + 240 : 300;
  const gcal = googleCalendarUrl({ uid: inv.id, title: calTitle, date: d.date, time: d.time, durationMin: duration, location: calLocation, details: d.eyebrow ? `${d.eyebrow} ${names}` : names, url: pageUrl });
  const isDraft = inv.status === 'draft' && mode === 'live';
  const std = d.saveTheDate;
  const ogTitle = std ? `Save the date · ${names}` : p.guest ? `Un invito per ${p.guest.name} · ${names}` : `${names} · ${ev.label}`;
  const hasGifts = Boolean(d.giftText || d.iban || d.giftLink || d.gifts.length);
  const showCountdown = d.showCountdown && start.getTime() > Date.now();
  const gallery = parseGallery(inv.gallery);
  const claims = p.claims ?? [];
  const rides = p.rides ?? [];
  const interactive = mode !== 'live' || inv.status === 'active';
  const tableOn = tableRevealActive(d);
  const showWeather = d.showWeather && mode !== 'demo' && program.some((x) => x.place || x.address);
  const hasDetails =
    showCountdown || showWeather || d.message || gallery.length > 0 || d.story.length > 0 || program.length > 0 || d.dressCode || hasGifts || d.stays.length > 0 || d.ridesBoard || d.signature;
  const couple = ev.couple || inv.event_type === 'anniversario';
  const noticeDate = d.notice && d.noticeAt ? formatDayMonth(romeYmd(new Date(d.noticeAt))) : '';

  return (
    <html lang="it">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{`${names} · ${std ? 'Save the date' : ev.label}`}</title>
        <meta name="description" content={`${capitalize(dateLong)}. ${std ? 'Segnati la data!' : 'Apri l’invito e conferma la tua presenza.'}`} />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content={theme.swatches[0]} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={`${capitalize(dateLong)} · ${std ? 'Segnati la data!' : 'Apri l’invito e conferma la tua presenza'}`} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={pageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {theme.fonts.map((f) => (
          <link rel="preload" href={`/fonts/${f}.woff2`} as="font" type="font/woff2" crossorigin="anonymous" />
        ))}
        <link rel="stylesheet" href="/css/fonts.css" />
        <link rel="stylesheet" href="/css/invite.css" />
        <style>{raw(themeInlineCss(inv.theme))}</style>
        <noscript>
          <style>{raw('.env-screen{display:none}.has-envelope{overflow:auto}')}</style>
        </noscript>
        <script src="/js/invite.js" defer></script>
      </head>
      <body
        class={`inv t-${inv.theme} ev-${inv.event_type}${isDraft ? ' is-draft' : ''}${p.showEnvelope ? ' has-envelope' : ''}`}
        data-mode={mode}
        data-beacon={mode === 'live' && inv.status === 'active' ? `${p.basePath}/visto` : ''}
        data-guest={p.guest?.code ?? ''}
        data-guest-name={p.guest?.name ?? ''}
        data-slug={inv.slug}
      >
        {isDraft && (
          <div class="draft-banner" role="note">
            Anteprima · questo invito non è ancora stato pubblicato
          </div>
        )}
        {p.showEnvelope && (
          <div class="env-screen" id="envelope">
            <div class="env-intro">
              {p.guest ? (
                <>
                  <p class="env-kicker">Un invito per</p>
                  <p class="env-guest">{p.guest.name}</p>
                </>
              ) : (
                <>
                  <p class="env-kicker">Hai ricevuto</p>
                  <p class="env-guest">{std ? 'un save the date' : 'un invito'}</p>
                </>
              )}
            </div>
            <button class="env" type="button" id="env-open" aria-label="Apri l’invito">
              <span class="env-back"></span>
              <span class="env-letter">
                <span class="env-letter-eyebrow">{std ? 'Save the date' : d.eyebrow || ev.label}</span>
                <span class="env-letter-names">{names}</span>
                <span class="env-letter-date">{formatDateShort(d.date)}</span>
              </span>
              <span class="env-pocket"></span>
              <span class="env-flap">
                <span class="face-out"></span>
                <span class="face-in"></span>
              </span>
              <span class="env-seal">
                <Monogram d={d} />
              </span>
            </button>
            <p class="env-hint">Tocca la busta per aprirla</p>
          </div>
        )}
        <div class="page">
          <main class="card">
            {isDraft && (
              <div class="watermark" aria-hidden="true">
                ANTEPRIMA
              </div>
            )}
            {d.notice && (
              <aside class="notice-banner" role="note">
                <strong>Aggiornamento{noticeDate ? ` del ${noticeDate}` : ''}</strong>
                <p>{d.notice}</p>
              </aside>
            )}
            <article class={`sheet sheet-main${std ? ' sheet-std' : ''}`}>
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
                  {p.guest && (
                    <p class="for-guest">
                      Un invito speciale per <strong>{p.guest.name}</strong>
                    </p>
                  )}
                  {p.guest && p.guest.table_name && tableOn && (
                    <p class="table-banner">
                      Il tuo tavolo: <strong>{p.guest.table_name}</strong>
                    </p>
                  )}
                  {coverUrl && (
                    <figure class="cover">
                      <img src={coverUrl} alt={`Foto di ${names}`} width={600} height={750} />
                    </figure>
                  )}
                  <HeroText inv={inv} std={std} place={firstPlace} />
                  {std && (
                    <>
                      <p class="std-note">L’invito con tutti i dettagli arriverà più avanti.</p>
                      <div class="std-actions">
                        <a class="btn btn-ghost" href={`${p.basePath}/calendario.ics`}>
                          Aggiungi al calendario
                        </a>
                        <a class="btn btn-ghost" href={gcal} target="_blank" rel="noopener">
                          Google Calendar
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </header>
            </article>

            {!std && hasDetails && (
              <article class="sheet sheet-details">
                {showCountdown && <Countdown start={start} />}

                {showWeather && (
                  <section class="weather-sec sec" data-weather={`${p.basePath}/meteo`} hidden>
                    <div class="weather" role="note"></div>
                  </section>
                )}

                {d.message && (
                  <section class="message sec">
                    <p>{d.message}</p>
                  </section>
                )}

                {gallery.length > 0 && (
                  <section class="gallery-sec sec">
                    <h2 class="sec-title">{couple ? 'Le nostre foto' : 'Le foto'}</h2>
                    <div class="gallery">
                      {gallery.map((k) => (
                        <button type="button" data-full={`/media/${k}`} aria-label="Ingrandisci la foto">
                          <img src={`/media/${k}`} alt="" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {d.story.length > 0 && (
                  <section class="story-sec sec">
                    <h2 class="sec-title">{couple ? 'La nostra storia' : 'La storia'}</h2>
                    <ol class="story">
                      {d.story.map((s) => (
                        <li>
                          {s.when && <span class="story-when">{s.when}</span>}
                          {s.title && <span class="story-title">{s.title}</span>}
                          {s.text && <p class="story-text">{s.text}</p>}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {program.length > 0 && (
                  <section class="program sec">
                    <h2 class="sec-title">Programma</h2>
                    <ol class="moments">
                      {program.map((m) => (
                        <li class="moment">
                          {m.time && <span class="m-time">{m.time}</span>}
                          {m.title && <h3 class="m-title">{m.title}</h3>}
                          {m.place && <p class="m-place">{m.place}</p>}
                          {m.address && <p class="m-addr">{m.address}</p>}
                          {(m.place || m.address) && (
                            <a class="btn btn-ghost btn-sm" href={mapsLink(m.place, m.address)} target="_blank" rel="noopener">
                              Indicazioni stradali
                            </a>
                          )}
                          {m.restricted && mode !== 'live' && (
                            <>
                              <br />
                              <span class="m-tag">Solo per chi è invitato a tutto</span>
                            </>
                          )}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {d.dressCode && (
                  <section class="dress sec">
                    <h2 class="sec-title">Dress code</h2>
                    <p>{d.dressCode}</p>
                  </section>
                )}

                {hasGifts && (
                  <section class="gifts sec" id="regali">
                    <h2 class="sec-title">{inv.event_type === 'matrimonio' ? 'Lista nozze' : 'Regali'}</h2>
                    {d.giftText && <p>{d.giftText}</p>}
                    {d.iban && (
                      <div class="iban-box">
                        <p class="iban-label">IBAN{d.ibanHolder ? ` · intestato a ${d.ibanHolder}` : ''}</p>
                        <p class="iban">{formatIban(d.iban)}</p>
                        <button type="button" class="btn btn-ghost btn-sm" data-copy={d.iban}>
                          Copia IBAN
                        </button>
                      </div>
                    )}
                    {d.giftLink && (
                      <a class="btn btn-ghost" href={d.giftLink} target="_blank" rel="noopener nofollow">
                        Vai alla lista regali
                      </a>
                    )}
                    {d.gifts.length > 0 && (
                      <>
                        <ul class="registry" data-registry data-endpoint={`${p.basePath}/regali`}>
                          {d.gifts.map((g) => (
                            <Gift g={g} claims={claims.filter((c) => c.gift_id === g.id)} open={interactive} />
                          ))}
                        </ul>
                        <p class="seats-note">Prenota il regalo così nessuno lo sceglie due volte. Il pagamento lo fai tu, come preferisci.</p>
                      </>
                    )}
                  </section>
                )}

                {d.stays.length > 0 && (
                  <section class="stays sec">
                    <h2 class="sec-title">Dove dormire</h2>
                    <div class="stay-list">
                      {d.stays.map((s) => (
                        <div class="stay">
                          <div class="stay-name">{s.name}</div>
                          {s.address && <p class="stay-addr">{s.address}</p>}
                          {s.note && <p class="stay-note">{s.note}</p>}
                          <div class="stay-links">
                            <a class="btn btn-ghost btn-sm" href={mapsLink(s.name, s.address)} target="_blank" rel="noopener">
                              Mappa
                            </a>
                            {s.link && (
                              <a class="btn btn-ghost btn-sm" href={s.link} target="_blank" rel="noopener nofollow">
                                Sito e prenotazioni
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {d.ridesBoard && <RidesSection rides={rides} basePath={p.basePath} open={interactive} eventPhrase={ev.eventPhrase(d)} />}

                {d.signature && (
                  <section class="sign sec">
                    <p class="signature">{d.signature}</p>
                  </section>
                )}
                {orn.bottom && raw(orn.bottom)}
              </article>
            )}

            {!std && (
              <article class="sheet sheet-reply">
                <RsvpSection {...p} />

                <section class="actions sec">
                  <a class="btn btn-ghost" href={`${p.basePath}/calendario.ics`}>
                    Aggiungi al calendario
                  </a>
                  <a class="btn btn-ghost" href={gcal} target="_blank" rel="noopener">
                    Google Calendar
                  </a>
                  {tableOn && mode !== 'demo' && (
                    <a class="btn btn-ghost" href={`${p.basePath}/tavolo`}>
                      Trova il tuo tavolo
                    </a>
                  )}
                  {d.contactPhone && (
                    <a
                      class="btn btn-ghost"
                      href={waLink(`Ciao${d.contactName ? ` ${d.contactName}` : ''}! Ti scrivo per l’invito ${ev.eventPhrase(d)}: `, d.contactPhone)}
                      target="_blank"
                      rel="noopener"
                    >
                      Scrivi {d.contactName ? `a ${d.contactName}` : 'agli organizzatori'}
                    </a>
                  )}
                </section>
              </article>
            )}
          </main>
        </div>
        <footer class="made-with">
          <a href={`/?ref=invito-${inv.theme}`} target={mode === 'preview' ? '_blank' : mode === 'demo' ? '_top' : undefined}>
            Creato con <strong>{BRAND.name}</strong> · crea anche tu il tuo invito
          </a>
        </footer>
        <div class="toast" id="toast" role="status" aria-live="polite"></div>
      </body>
    </html>
  );
}
