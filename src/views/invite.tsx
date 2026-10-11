import { raw } from 'hono/html';
import { googleCalendarUrl } from '../calendar';
import { BRAND, EVENT_BY_ID } from '../config';
import { displayNames, initials } from '../model';
import { THEME_BY_ID, ornaments, themeInlineCss } from '../themes';
import type { GuestRow, InviteData, Invitation, RsvpRow } from '../types';
import { formatDateLong, formatDateParts, formatDateShort, formatDayMonth, formatIban, formatTime, mapsLink, romeToUtc, waLink } from '../util';

export type InviteMode = 'live' | 'preview' | 'demo';

export interface InviteViewProps {
  inv: Pick<Invitation, 'id' | 'slug' | 'vanity' | 'event_type' | 'theme' | 'data' | 'status' | 'cover_key'>;
  mode: InviteMode;
  origin: string;
  /** public path used for links (/i/slug or /demo/theme) */
  basePath: string;
  guest?: GuestRow | null;
  guestRsvp?: RsvpRow | null;
  showEnvelope: boolean;
  rsvp: { open: boolean; reason?: string };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function namesSizeClass(d: InviteData): string {
  const longest = Math.max(d.name1.length, d.name2.length);
  if (longest <= 7) return 'ns-xl';
  if (longest <= 10) return 'ns-l';
  if (longest <= 14) return 'ns-m';
  return 'ns-s';
}

/** Initials for the crest and the wax seal: the script "&" reads badly at small sizes, so it gets its own face. */
function Monogram({ d }: { d: Pick<InviteData, 'name1' | 'name2'> }) {
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

function RsvpSection(p: InviteViewProps) {
  const d = p.inv.data;
  const ev = EVENT_BY_ID[p.inv.event_type];
  const g = p.guest;
  const prev = p.guestRsvp;
  const maxSeats = g && g.seats > 0 ? g.seats : 10;
  const adults = prev && prev.attending ? Math.max(prev.adults, 0) : Math.min(g?.seats || 1, maxSeats) || 1;
  const children = prev && prev.attending ? prev.children : 0;
  return (
    <section class="rsvp sec" id="rsvp">
      <p class="kicker">R.S.V.P.</p>
      <h2 class="sec-title">Conferma la tua presenza</h2>
      {d.rsvpDeadline && p.rsvp.open && (
        <p class="deadline">
          Ti chiediamo gentilmente di rispondere entro il <strong>{formatDayMonth(d.rsvpDeadline)}</strong>.
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
            <span>Parteciperò con piacere</span>
          </label>
          <label class="choice-opt">
            <input type="radio" name="attending" value="no" checked={prev?.attending === 0} />
            <span>Non potrò partecipare</span>
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
          {d.askDiet && (
            <label class="field">
              <span>Allergie, intolleranze o menu particolari</span>
              <textarea name="diet" rows={2} maxlength={300} placeholder="Es. 1 vegetariano, 1 senza glutine">
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
        </div>
        <label class="field">
          <span>
            {ev.messageFor} <em>(facoltativo)</em>
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
          <p class="done-emoji" aria-hidden="true">✦</p>
          <h3>Grazie, a presto!</h3>
          <p>Abbiamo ricevuto la tua risposta. Segna la data in calendario qui sotto.</p>
        </div>
        <div class="done-no">
          <p class="done-emoji" aria-hidden="true">✦</p>
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
  const ogImage = coverUrl ? origin + coverUrl : `${origin}/og/${inv.theme}.png`;
  const firstPlace = d.program.find((x) => x.place)?.place ?? '';
  const pageUrl = origin + p.basePath + (p.guest ? `/${p.guest.code}` : '');
  const calTitle = `${ev.label}: ${names}`;
  const calLocation = [d.program[0]?.place, d.program[0]?.address].filter(Boolean).join(', ');
  const lastTime = [...d.program].reverse().find((x) => x.time)?.time;
  const duration = lastTime && d.time && lastTime > d.time ? (+lastTime.slice(0, 2) - +d.time.slice(0, 2)) * 60 + 240 : 300;
  const gcal = googleCalendarUrl({ uid: inv.id, title: calTitle, date: d.date, time: d.time, durationMin: duration, location: calLocation, details: d.eyebrow ? `${d.eyebrow} ${names}` : names, url: pageUrl });
  const isDraft = inv.status === 'draft' && mode === 'live';
  const ogTitle = p.guest ? `Un invito per ${p.guest.name} · ${names}` : `${names} · ${ev.label}`;
  const hasGifts = d.giftText || d.iban || d.giftLink;
  const dateParts = formatDateParts(d.date);
  const showCountdown = d.showCountdown && start.getTime() > Date.now();
  const hasDetails = showCountdown || d.message || d.program.length > 0 || d.dressCode || hasGifts || d.signature;
  const twoNames = ev.couple && d.name2;

  return (
    <html lang="it">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{`${names} · ${ev.label}`}</title>
        <meta name="description" content={`${capitalize(dateLong)}. Apri l’invito e conferma la tua presenza.`} />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content={theme.swatches[0]} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={`${capitalize(dateLong)} · Apri l’invito e conferma la tua presenza`} />
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
                  <p class="env-guest">un invito</p>
                </>
              )}
            </div>
            <button class="env" type="button" id="env-open" aria-label="Apri l’invito">
              <span class="env-back"></span>
              <span class="env-letter">
                <span class="env-letter-eyebrow">{d.eyebrow || ev.label}</span>
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
            <article class="sheet sheet-main">
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
                  {coverUrl && (
                    <figure class="cover">
                      <img src={coverUrl} alt={`Foto di ${names}`} width={600} height={750} />
                    </figure>
                  )}
                  {d.eyebrow && <p class="eyebrow">{d.eyebrow}</p>}
                  <h1 class={`names ${namesSizeClass(d)}`}>
                    {twoNames ? (
                      <>
                        <span class="n">{d.name1}</span>
                        <span class="amp">&amp;</span>
                        <span class="n">{d.name2}</span>
                      </>
                    ) : (
                      <span class="n">{d.name1 || names}</span>
                    )}
                  </h1>
                  {d.subtitle && <p class="subtitle">{d.subtitle}</p>}
                  {raw(orn.divider)}
                  {dateParts && (
                    <p class="date">
                      <span class="d-wd">{dateParts.weekday}</span> <span class="d-day">{dateParts.day}</span> <span class="d-mo">{dateParts.month}</span>{' '}
                      <span class="d-yr">{dateParts.year}</span>
                    </p>
                  )}
                  {d.time && <p class="time">{formatTime(d.time)}</p>}
                  {firstPlace && <p class="place">{firstPlace}</p>}
                </div>
              </header>
            </article>

            {hasDetails && (
              <article class="sheet sheet-details">
                {showCountdown && <Countdown start={start} />}

                {d.message && (
                  <section class="message sec">
                    <p>{d.message}</p>
                  </section>
                )}

                {d.program.length > 0 && (
                  <section class="program sec">
                    <h2 class="sec-title">Programma</h2>
                    <ol class="moments">
                      {d.program.map((m) => (
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
                  <section class="gifts sec">
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
                  </section>
                )}

                {d.signature && (
                  <section class="sign sec">
                    <p class="signature">{d.signature}</p>
                  </section>
                )}
                {orn.bottom && raw(orn.bottom)}
              </article>
            )}

            <article class="sheet sheet-reply">
              <RsvpSection {...p} />

              <section class="actions sec">
                <a class="btn btn-ghost" href={`${p.basePath}/calendario.ics`}>
                  Aggiungi al calendario
                </a>
                <a class="btn btn-ghost" href={gcal} target="_blank" rel="noopener">
                  Google Calendar
                </a>
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
