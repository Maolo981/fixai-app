import { raw } from 'hono/html';
import type { AiTone } from '../ai';
import { BRAND, EVENT_BY_ID, PHOTO_STYLES } from '../config';
import { uiIcon } from '../icons';
import { LIMITS, displayNames, parseGallery } from '../model';
import { THEMES, THEME_CATEGORIES, themesFor } from '../themes';
import type { GiftItem, Invitation, PhotoStyle, ProgramItem, StayItem, StoryItem } from '../types';
import { AppHeader } from './app-header';
import { Layout } from './layout';

interface FieldProps {
  label: string;
  name: string;
  value?: string;
  type?: string;
  placeholder?: string;
  maxlength?: number;
  hint?: string;
  textarea?: boolean;
  rows?: number;
  autocomplete?: string;
  inputmode?: 'decimal' | 'email' | 'none' | 'numeric' | 'search' | 'tel' | 'text' | 'url';
}

function Field(p: FieldProps) {
  return (
    <label class="field">
      <span class="field-label">{p.label}</span>
      {p.textarea ? (
        <textarea name={p.name} rows={p.rows ?? 3} maxlength={p.maxlength} placeholder={p.placeholder}>
          {p.value ?? ''}
        </textarea>
      ) : (
        <input
          type={p.type ?? 'text'}
          name={p.name}
          value={p.value ?? ''}
          maxlength={p.maxlength}
          placeholder={p.placeholder}
          autocomplete={p.autocomplete ?? 'off'}
          inputmode={p.inputmode}
        />
      )}
      {p.hint && <span class="field-hint">{p.hint}</span>}
    </label>
  );
}

function Toggle({ name, checked, label, hint }: { name: string; checked: boolean; label: string; hint?: string }) {
  return (
    <label class="toggle">
      <input type="checkbox" name={name} checked={checked} />
      <span class="toggle-ui" aria-hidden="true"></span>
      <span>
        {label}
        {hint && <span class="toggle-hint">{hint}</span>}
      </span>
    </label>
  );
}

/** A field of a repeatable row: identified by data-k, never by name (collect() reads rows separately). */
function RowField({ k, label, value, placeholder, maxlength, type, grow, textarea }: { k: string; label: string; value: string; placeholder?: string; maxlength?: number; type?: string; grow?: boolean; textarea?: boolean }) {
  return (
    <label class={`field${grow ? ' grow' : ''}`}>
      <span class="field-label">{label}</span>
      {textarea ? (
        <textarea data-k={k} rows={2} maxlength={maxlength} placeholder={placeholder}>
          {value}
        </textarea>
      ) : (
        <input type={type ?? 'text'} data-k={k} value={value} maxlength={maxlength} placeholder={placeholder} inputmode={type === 'number' ? 'numeric' : undefined} />
      )}
    </label>
  );
}

function RowTools() {
  return (
    <div class="moment-tools">
      <button type="button" class="icon-btn" data-move="-1" aria-label="Sposta su">
        ↑
      </button>
      <button type="button" class="icon-btn" data-move="1" aria-label="Sposta giù">
        ↓
      </button>
      <button type="button" class="link-danger" data-remove>
        Rimuovi
      </button>
    </div>
  );
}

function ProgramRow({ item }: { item: ProgramItem }) {
  return (
    <div class="moment-row" data-moment>
      <div class="row-time">
        <label class="field">
          <span class="field-label">Ora</span>
          <input type="time" data-k="time" value={item.time} />
        </label>
        <label class="field grow">
          <span class="field-label">Cosa</span>
          <input type="text" data-k="title" value={item.title} maxlength={LIMITS.programTitle} placeholder="Es. Cerimonia, Pranzo, Festa" />
        </label>
      </div>
      <label class="field">
        <span class="field-label">Luogo</span>
        <input type="text" data-k="place" value={item.place} maxlength={LIMITS.programPlace} placeholder="Es. Chiesa di San Lorenzo" />
      </label>
      <label class="field">
        <span class="field-label">Indirizzo</span>
        <input type="text" data-k="address" value={item.address} maxlength={LIMITS.programAddress} placeholder="Via, numero, città" />
      </label>
      <label class="check-line">
        <input type="checkbox" data-k="restricted" checked={Boolean(item.restricted)} />
        <span>Solo per chi è invitato a tutto (es. il ricevimento)</span>
      </label>
      <RowTools />
    </div>
  );
}

function GiftRow({ g }: { g: GiftItem }) {
  return (
    <div class="moment-row" data-row data-id={g.id}>
      <div class="row-kind">
        <label class="field">
          <span class="field-label">Tipo</span>
          <select data-k="kind">
            <option value="item" selected={g.kind === 'item'}>
              Regalo da prenotare
            </option>
            <option value="fund" selected={g.kind === 'fund'}>
              Colletta (ognuno mette una quota)
            </option>
          </select>
        </label>
        <RowField k="price" label="Prezzo o obiettivo (€)" value={g.price ? String(g.price) : ''} type="number" placeholder="Facoltativo" />
      </div>
      <RowField k="title" label="Cosa" value={g.title} maxlength={LIMITS.giftTitle} placeholder="Es. Macchina del caffè, Viaggio di nozze" />
      <RowField k="link" label="Link (facoltativo)" value={g.link} maxlength={LIMITS.giftLink} placeholder="https://…" />
      <RowField k="note" label="Nota (facoltativa)" value={g.note} maxlength={LIMITS.giftNote} placeholder="Es. colore bianco, la trovi da…" />
      <RowTools />
    </div>
  );
}

function StayRow({ s }: { s: StayItem }) {
  return (
    <div class="moment-row" data-row>
      <RowField k="name" label="Nome" value={s.name} maxlength={80} placeholder="Es. Hotel Villa Rosa" />
      <RowField k="address" label="Indirizzo" value={s.address} maxlength={LIMITS.programAddress} placeholder="Via, numero, città" />
      <div class="row-2">
        <RowField k="link" label="Sito o prenotazioni (facoltativo)" value={s.link} maxlength={300} placeholder="https://…" />
        <RowField k="note" label="Nota (facoltativa)" value={s.note} maxlength={160} placeholder="Es. codice sconto SPOSI10" />
      </div>
      <RowTools />
    </div>
  );
}

function StoryRow({ s }: { s: StoryItem }) {
  return (
    <div class="moment-row" data-row>
      <div class="row-time">
        <RowField k="when" label="Quando" value={s.when} maxlength={40} placeholder="Es. 2016" />
        <RowField k="title" label="Titolo" value={s.title} maxlength={80} placeholder="Es. Il primo incontro" grow />
      </div>
      <RowField k="text" label="Racconto (facoltativo)" value={s.text} maxlength={LIMITS.storyText} textarea />
      <RowTools />
    </div>
  );
}

/** Colours of each theme for the WhatsApp preview image drawn in the browser (paper, names, accent). */
const OG_COLORS = Object.fromEntries(THEMES.map((t) => [t.id, [t.palette.paper, t.palette.names, t.palette.accent]]));

/** Little drawings of the photo styles (40×48). */
const PHOTO_ICONS: Record<PhotoStyle, string> = {
  arco: '<svg viewBox="0 0 40 48"><path d="M9 44V21a11 11 0 0 1 22 0v23Z"/><path d="M6 46V21a14 14 0 0 1 28 0v25" fill="none" stroke="currentColor" stroke-width="1"/></svg>',
  cerchio: '<svg viewBox="0 0 40 48"><circle cx="20" cy="24" r="12"/><circle cx="20" cy="24" r="15.5" fill="none" stroke="currentColor" stroke-width="1"/></svg>',
  cornice: '<svg viewBox="0 0 40 48"><rect x="10" y="10" width="20" height="28"/><rect x="6" y="6" width="28" height="36" fill="none" stroke="currentColor" stroke-width="1"/></svg>',
  polaroid: '<svg viewBox="0 0 40 48"><g transform="rotate(-7 20 24)"><rect x="7" y="7" width="26" height="33" fill="#fff" stroke="currentColor" stroke-width="1"/><rect x="10" y="10" width="20" height="21"/></g></svg>',
  grande: '<svg viewBox="0 0 40 48"><rect x="6" y="3" width="28" height="42" fill="none" stroke="currentColor" stroke-width="1"/><path d="M6 3h28v24H6Z"/><path d="M13 33h14M15 37h10" stroke="currentColor" stroke-width="1.4"/></svg>',
};

export function EditorPage({ inv, isNew, aiTones }: { inv: Invitation; isNew: boolean; aiTones: Record<AiTone, { label: string }> | null }) {
  const d = inv.data;
  const ev = EVENT_BY_ID[inv.event_type];
  const base = `/gestisci/${inv.admin_token}`;
  const coverUrl = inv.cover_key ? `/media/${inv.cover_key}` : '';
  const gallery = parseGallery(inv.gallery);
  const couple = ev.couple || inv.event_type === 'anniversario';
  const whoTitle = inv.event_type === 'matrimonio' ? 'Gli sposi' : ev.couple ? 'La coppia' : inv.event_type === 'festa' ? 'La festa' : 'Chi festeggiamo';
  const wedding = inv.event_type === 'matrimonio';
  return (
    <Layout
      title={`Modifica · ${displayNames(d)} · ${BRAND.name}`}
      noindex
      bodyClass="app editor-body"
      header={<AppHeader inv={inv} active="edit" />}
      hideFooter
      scripts={['/js/site.js', '/js/editor.js']}
    >
      <main class="editor container">
        <div class="editor-form">
          {isNew && (
            <div class="notice notice-info">
              <p>
                <strong>Il tuo invito è pronto da personalizzare.</strong> Abbiamo inserito dei testi di esempio: sostituiscili con i tuoi. Ogni modifica si salva da sola.
              </p>
              <p>
                <strong>Aggiungi questa pagina ai preferiti</strong> o lascia la tua email in fondo: il link è la chiave del tuo invito.
              </p>
            </div>
          )}
          <form
            id="editor"
            data-save={`${base}/salva`}
            data-upload={`${base}/foto`}
            data-unupload={`${base}/foto/rimuovi`}
            data-preview={`${base}/anteprima`}
            data-ai={aiTones ? `${base}/ai` : ''}
            data-og={`${base}/anteprima-link`}
            data-og-colors={JSON.stringify(OG_COLORS)}
            data-has-og={inv.og_key ? '1' : '0'}
            data-event-label={ev.label}
            autocomplete="off"
          >
            <section class="ed-card">
              <h2 class="ed-title">Stile</h2>
              <div class="theme-cats" role="group" aria-label="Filtra gli stili">
                <button type="button" class="chip-btn on" data-theme-cat="consigliati" aria-pressed="true">
                  Consigliati per {ev.label.toLowerCase()}
                </button>
                <button type="button" class="chip-btn" data-theme-cat="tutti" aria-pressed="false">
                  Tutti ({THEMES.length})
                </button>
                {THEME_CATEGORIES.map((c) => (
                  <button type="button" class="chip-btn" data-theme-cat={c.id} aria-pressed="false">
                    {c.label}
                  </button>
                ))}
              </div>
              <div class="theme-picker" id="theme-picker">
                {themesFor(inv.event_type).map(({ theme: t, recommended }) => (
                  <label class="theme-opt" data-cat={t.category} data-rec={recommended ? '1' : '0'} hidden={!recommended && inv.theme !== t.id}>
                    <input type="radio" name="theme" value={t.id} checked={inv.theme === t.id} />
                    <span class="theme-thumb" style={`background:${t.swatches[0]}`}>
                      <img src={`/img/themes/${t.id}-sm.webp`} alt="" loading="lazy" width={120} height={160} />
                    </span>
                    <span class="theme-name">{t.name}</span>
                  </label>
                ))}
              </div>
            </section>

            <section class="ed-card">
              <h2 class="ed-title">{whoTitle}</h2>
              <Field label="Riga sopra il nome" name="eyebrow" value={d.eyebrow} maxlength={LIMITS.eyebrow} placeholder="Es. Il matrimonio di" />
              <div class={ev.couple ? 'row-2' : ''}>
                <Field label={ev.name1Label} name="name1" value={d.name1} maxlength={LIMITS.name} />
                {ev.couple && <Field label={ev.name2Label} name="name2" value={d.name2} maxlength={LIMITS.name} />}
              </div>
              <Field label="Sottotitolo (facoltativo)" name="subtitle" value={d.subtitle} maxlength={LIMITS.subtitle} placeholder="Es. compie 18 anni" />
            </section>

            <section class="ed-card">
              <h2 class="ed-title">Quando</h2>
              <div class="row-2">
                <Field label="Data" name="date" type="date" value={d.date} />
                <Field label="Ora" name="time" type="time" value={d.time} />
              </div>
              <Toggle name="showCountdown" checked={d.showCountdown} label="Mostra il conto alla rovescia" />
              <Toggle name="showWeather" checked={d.showWeather} label="Mostra le previsioni del meteo" hint="Compaiono da sole nei 14 giorni prima dell’evento." />
              <Toggle
                name="saveTheDate"
                checked={d.saveTheDate}
                label="Per ora è solo un «Save the date»"
                hint="Mostra solo nomi e data, senza programma e conferme. Toglilo quando vuoi mandare l’invito completo: il link resta lo stesso."
              />
            </section>

            <section class="ed-card">
              <h2 class="ed-title">Programma</h2>
              <p class="ed-hint">Cerimonia, pranzo, festa: ogni tappa ha il tasto «Indicazioni stradali». Le tappe «solo per chi è invitato a tutto» le vedono solo gli invitati che scegli nella lista.</p>
              <div id="program" class="program-list">
                {d.program.map((p) => (
                  <ProgramRow item={p} />
                ))}
              </div>
              <template id="program-tpl">
                <ProgramRow item={{ time: '', title: '', place: '', address: '' }} />
              </template>
              <button type="button" class="btn btn-ghost btn-sm" id="add-moment" data-max={LIMITS.programItems}>
                + Aggiungi una tappa
              </button>
            </section>

            <section class="ed-card">
              <h2 class="ed-title">Il messaggio</h2>
              <Field label="Testo dell’invito" name="message" value={d.message} textarea rows={5} maxlength={LIMITS.message} />
              {aiTones && (
                <div class="ai-tools" id="ai-tools">
                  <span class="ai-label">{raw(uiIcon('sparkle', 'icon inline-icon'))} Riscrivilo:</span>
                  {(Object.keys(aiTones) as AiTone[])
                    .filter((t) => t !== 'nuovo')
                    .map((t) => (
                      <button type="button" class="chip-btn" data-ai-tone={t}>
                        {aiTones[t].label}
                      </button>
                    ))}
                  <button type="button" class="chip-btn" data-ai-tone="nuovo">
                    Scrivine uno nuovo
                  </button>
                  <button type="button" class="link-btn" id="ai-undo" hidden>
                    Annulla
                  </button>
                </div>
              )}
              <div class="row-between">
                <button type="button" class="btn btn-ghost btn-sm" id="suggest" data-phrases={JSON.stringify(ev.phrases)}>
                  Suggeriscimi una frase
                </button>
                <a class="small" href={`/frasi/${ev.slug}`} target="_blank" rel="noopener">
                  Altre frasi ↗
                </a>
              </div>
              <Field label="Firma in fondo all’invito (facoltativa)" name="signature" value={d.signature} maxlength={LIMITS.signature} placeholder="Es. Con affetto, Anna e Marco" />
            </section>

            <section class="ed-card">
              <h2 class="ed-title">Foto</h2>
              <div class="cover-ed">
                <img id="cover-preview" src={coverUrl || undefined} alt="" hidden={!coverUrl} />
                <div class="cover-actions">
                  <label class="btn btn-secondary btn-sm file-btn">
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" id="cover-input" />
                    {coverUrl ? 'Cambia la foto principale' : 'Carica la foto principale'}
                  </label>
                  <button type="button" class="btn btn-ghost btn-sm" id="cover-remove" hidden={!coverUrl}>
                    Rimuovi
                  </button>
                </div>
              </div>
              <p class="ed-hint">Appare in alto nell’invito e nell’anteprima del link su WhatsApp. Meglio se verticale.</p>
              <fieldset class="ps-field" id="photo-styles" hidden={!coverUrl}>
                <legend>Come mostrarla</legend>
                <div class="ps-picker">
                  {PHOTO_STYLES.map((s) => (
                    <label class="ps-opt">
                      <input type="radio" name="photoStyle" value={s.id} checked={d.photoStyle === s.id} />
                      <span class="ps-icon" aria-hidden="true">
                        {raw(PHOTO_ICONS[s.id])}
                      </span>
                      <span class="ps-name">{s.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <h3 class="ed-subtitle">{couple ? 'Galleria: le vostre foto' : 'Galleria di foto'}</h3>
              <div class="gallery-ed" id="gallery" data-upload={`${base}/galleria`} data-remove={`${base}/galleria/rimuovi`} data-max={LIMITS.gallery}>
                {gallery.map((k) => (
                  <figure data-key={k}>
                    <img src={`/media/${k}`} alt="" loading="lazy" />
                    <button type="button" class="gallery-remove" data-gallery-remove aria-label="Rimuovi la foto">
                      ✕
                    </button>
                  </figure>
                ))}
              </div>
              <label class="btn btn-ghost btn-sm file-btn" id="gallery-add" hidden={gallery.length >= LIMITS.gallery}>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" id="gallery-input" multiple />+ Aggiungi foto alla galleria
              </label>
              <p class="ed-hint gallery-hint">Fino a {LIMITS.gallery} foto: nell’invito si ingrandiscono con un tocco.</p>
            </section>

            <section class="ed-card">
              <h2 class="ed-title">{couple ? 'La vostra storia' : 'La storia'} (facoltativa)</h2>
              <p class="ed-hint">{couple ? 'Le tappe più belle: come vi siete conosciuti, il primo viaggio, la proposta.' : 'Qualche tappa importante da raccontare agli invitati.'}</p>
              <div class="program-list" data-rows="story">
                {d.story.map((s) => (
                  <StoryRow s={s} />
                ))}
              </div>
              <template id="tpl-story">
                <StoryRow s={{ when: '', title: '', text: '' }} />
              </template>
              <button type="button" class="btn btn-ghost btn-sm" data-add-row="story" data-max={LIMITS.story}>
                + Aggiungi un momento
              </button>
            </section>

            <section class="ed-card">
              <h2 class="ed-title">{wedding ? 'Lista nozze' : 'Regali'}</h2>
              <Field
                label="Testo (facoltativo)"
                name="giftText"
                value={d.giftText}
                textarea
                rows={3}
                maxlength={LIMITS.giftText}
                placeholder="Es. La vostra presenza è il regalo più bello…"
              />
              <div class="row-2">
                <Field label="IBAN (facoltativo)" name="iban" value={d.iban} maxlength={42} placeholder="IT60 X054 2811 1010 0000 0123 456" autocomplete="off" />
                <Field label="Intestato a" name="ibanHolder" value={d.ibanHolder} maxlength={LIMITS.ibanHolder} />
              </div>
              <p class="field-hint" id="iban-hint" aria-live="polite"></p>
              <Field label="Link a una lista esterna (facoltativo)" name="giftLink" value={d.giftLink} maxlength={LIMITS.giftLink} placeholder="https://…" inputmode="url" />
              <h3 class="ed-subtitle">Regali da prenotare e collette</h3>
              <p class="ed-hint">Gli invitati prenotano un regalo dall’invito (così nessuno lo sceglie due volte) o mettono una quota in una colletta. Tu vedi tutto nel pannello.</p>
              <div class="program-list" data-rows="gifts">
                {d.gifts.map((g) => (
                  <GiftRow g={g} />
                ))}
              </div>
              <template id="tpl-gifts">
                <GiftRow g={{ id: '', kind: 'item', title: '', note: '', link: '', price: 0 }} />
              </template>
              <button type="button" class="btn btn-ghost btn-sm" data-add-row="gifts" data-max={LIMITS.gifts}>
                + Aggiungi un regalo
              </button>
            </section>

            <section class="ed-card">
              <h2 class="ed-title">Dettagli per gli invitati</h2>
              <Field label="Dress code (facoltativo)" name="dressCode" value={d.dressCode} maxlength={LIMITS.dressCode} placeholder="Es. Elegante, colori pastello" />
              <h3 class="ed-subtitle">Dove dormire</h3>
              <p class="ed-hint">Hotel o B&amp;B consigliati per chi viene da lontano.</p>
              <div class="program-list" data-rows="stays">
                {d.stays.map((s) => (
                  <StayRow s={s} />
                ))}
              </div>
              <template id="tpl-stays">
                <StayRow s={{ name: '', address: '', link: '', note: '' }} />
              </template>
              <button type="button" class="btn btn-ghost btn-sm" data-add-row="stays" data-max={LIMITS.stays}>
                + Aggiungi un alloggio
              </button>
              <h3 class="ed-subtitle">Passaggi in auto</h3>
              <Toggle name="ridesBoard" checked={d.ridesBoard} label="Bacheca dei passaggi" hint="Gli invitati offrono o chiedono un passaggio e si scrivono su WhatsApp." />
            </section>

            <section class="ed-card">
              <h2 class="ed-title">Conferme di presenza</h2>
              <Field label="Chiedi di rispondere entro il" name="rsvpDeadline" type="date" value={d.rsvpDeadline} />
              <Toggle name="askChildren" checked={d.askChildren} label="Chiedi quanti bambini" />
              <Toggle name="askNames" checked={d.askNames} label="Chiedi il nome di ogni persona" hint="Utile per il tableau e per i segnaposto." />
              <Field
                label="Scelta del menu (facoltativa)"
                name="menuOptions"
                value={d.menuOptions.join(', ')}
                maxlength={260}
                placeholder="Es. Carne, Pesce, Vegetariano"
                hint="Scrivi le scelte separate da virgole: ognuno sceglie il suo menu. Lascia vuoto per non chiederlo."
              />
              <Toggle name="askDiet" checked={d.askDiet} label="Chiedi allergie e intolleranze" />
              <Toggle name="askSong" checked={d.askSong} label="Chiedi una canzone per la festa" hint="Le trovi tutte nel pannello, da girare al DJ." />
              <Field label="Una domanda in più (facoltativa)" name="customQuestion" value={d.customQuestion} maxlength={LIMITS.customQuestion} placeholder="Es. Ti serve il bus navetta?" />
              <div class="row-2">
                <Field label="Chi contattare per domande" name="contactName" value={d.contactName} maxlength={LIMITS.contactName} placeholder="Es. Anna" />
                <Field label="Il suo WhatsApp" name="contactPhone" type="tel" value={d.contactPhone} maxlength={LIMITS.contactPhone} placeholder="333 123 4567" inputmode="tel" />
              </div>
            </section>

            <section class="ed-card">
              <h2 class="ed-title">Tavoli</h2>
              <p class="ed-hint">Assegni i tavoli dalla lista invitati nel pannello. Qui scegli quando gli invitati li vedono sul loro link personale.</p>
              <label class="field">
                <span class="field-label">Mostra il tavolo agli invitati</span>
                <select name="tableReveal">
                  <option value="never" selected={d.tableReveal === 'never'}>
                    No, lo tengo per me
                  </option>
                  <option value="day" selected={d.tableReveal === 'day'}>
                    Dal giorno dell’evento
                  </option>
                  <option value="always" selected={d.tableReveal === 'always'}>
                    Da subito
                  </option>
                </select>
                <span class="field-hint">Quando sono visibili, all’ingresso basta un cartello con il QR «Trova il tuo tavolo» (lo stampi dal tableau).</span>
              </label>
            </section>

            <section class="ed-card" id="avviso-ed">
              <h2 class="ed-title">Avviso agli invitati</h2>
              <p class="ed-hint">Un cambio di orario, il parcheggio, la navetta: compare in evidenza in cima all’invito, con la data. Lascia vuoto per toglierlo.</p>
              <Field label="Testo dell’avviso" name="notice" value={d.notice} textarea rows={3} maxlength={LIMITS.notice} placeholder="Es. Il ricevimento inizierà alle 14:30 invece che alle 14:00." />
              <p class="ed-hint">Dopo averlo scritto, dal pannello puoi mandarlo a tutti su WhatsApp.</p>
            </section>
          </form>

          <section class="ed-card" id="email">
            <h2 class="ed-title">La tua email</h2>
            <p class="ed-hint">Ti mandiamo il link per gestire l’invito e, se vuoi, un avviso a ogni nuova risposta. Niente spam.</p>
            <form method="post" action={`${base}/email`} class="email-form">
              <input type="hidden" name="back" value="modifica" />
              <label class="field">
                <span class="field-label">Email</span>
                <input type="email" name="email" value={inv.email ?? ''} placeholder="tu@esempio.it" required autocomplete="email" />
              </label>
              <Toggle name="notify" checked={inv.notify_rsvp === 1} label="Avvisami a ogni nuova risposta" />
              <button class="btn btn-secondary btn-sm" type="submit">
                Salva email
              </button>
            </form>
          </section>
        </div>

        <aside class="editor-preview" id="preview-pane" aria-label="Anteprima">
          <div class="preview-head">
            <span class="save-status" id="save-status" data-state="saved">
              Tutto salvato
            </span>
            <button type="button" class="link-btn" id="replay">
              Rivedi la busta
            </button>
            <button type="button" class="link-btn close-preview" id="close-preview">
              Chiudi
            </button>
          </div>
          <div class="phone">
            <iframe id="preview" src={`${base}/anteprima`} title="Anteprima dell’invito"></iframe>
          </div>
        </aside>
      </main>
      <div class="mobile-bar">
        <button type="button" class="btn btn-secondary" id="open-preview">
          Anteprima
        </button>
        {inv.status === 'draft' ? (
          <a class="btn btn-primary" href={`${base}#pubblica`}>
            Pubblica
          </a>
        ) : (
          <a class="btn btn-primary" href={base}>
            Fatto
          </a>
        )}
      </div>
    </Layout>
  );
}
