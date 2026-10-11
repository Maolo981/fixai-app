import { BRAND, EVENT_BY_ID } from '../config';
import { LIMITS, displayNames } from '../model';
import { THEMES } from '../themes';
import type { Invitation, ProgramItem } from '../types';
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

function Toggle({ name, checked, label }: { name: string; checked: boolean; label: string }) {
  return (
    <label class="toggle">
      <input type="checkbox" name={name} checked={checked} />
      <span class="toggle-ui" aria-hidden="true"></span>
      <span>{label}</span>
    </label>
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
    </div>
  );
}

export function EditorPage({ inv, isNew }: { inv: Invitation; isNew: boolean }) {
  const d = inv.data;
  const ev = EVENT_BY_ID[inv.event_type];
  const base = `/gestisci/${inv.admin_token}`;
  const coverUrl = inv.cover_key ? `/media/${inv.cover_key}` : '';
  const whoTitle = inv.event_type === 'matrimonio' ? 'Gli sposi' : ev.couple ? 'La coppia' : inv.event_type === 'festa' ? 'La festa' : 'Chi festeggiamo';
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
                <strong>✨ Il tuo invito è pronto da personalizzare.</strong> Abbiamo inserito dei testi di esempio: sostituiscili con i tuoi. Ogni modifica si salva da sola.
              </p>
              <p>
                🔑 <strong>Aggiungi questa pagina ai preferiti</strong> o lascia la tua email in fondo: il link è la chiave del tuo invito.
              </p>
            </div>
          )}
          <form id="editor" data-save={`${base}/salva`} data-upload={`${base}/foto`} data-unupload={`${base}/foto/rimuovi`} data-preview={`${base}/anteprima`} autocomplete="off">
            <section class="ed-card">
              <h2 class="ed-title">Stile</h2>
              <div class="theme-picker">
                {THEMES.map((t) => (
                  <label class="theme-opt">
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
            </section>

            <section class="ed-card">
              <h2 class="ed-title">Programma</h2>
              <p class="ed-hint">Cerimonia, pranzo, festa: ogni tappa avrà il tasto «Come arrivare» con la mappa.</p>
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
              <div class="row-between">
                <button type="button" class="btn btn-ghost btn-sm" id="suggest" data-phrases={JSON.stringify(ev.phrases)}>
                  ✨ Suggeriscimi una frase
                </button>
                <a class="small" href={`/frasi/${ev.slug}`} target="_blank" rel="noopener">
                  Altre frasi ↗
                </a>
              </div>
              <Field label="Firma in fondo all’invito (facoltativa)" name="signature" value={d.signature} maxlength={LIMITS.signature} placeholder="Es. Con affetto, Anna e Marco" />
            </section>

            <section class="ed-card">
              <h2 class="ed-title">Foto (facoltativa)</h2>
              <div class="cover-ed">
                <img id="cover-preview" src={coverUrl || undefined} alt="" hidden={!coverUrl} />
                <div class="cover-actions">
                  <label class="btn btn-secondary btn-sm file-btn">
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" id="cover-input" />
                    {coverUrl ? 'Cambia foto' : 'Carica una foto'}
                  </label>
                  <button type="button" class="btn btn-ghost btn-sm" id="cover-remove" hidden={!coverUrl}>
                    Rimuovi
                  </button>
                </div>
              </div>
              <p class="ed-hint">Appare in alto nell’invito e nell’anteprima del link su WhatsApp. Meglio se verticale.</p>
            </section>

            <section class="ed-card">
              <h2 class="ed-title">Dettagli</h2>
              <Field label="Dress code (facoltativo)" name="dressCode" value={d.dressCode} maxlength={LIMITS.dressCode} placeholder="Es. Elegante, colori pastello" />
              <Field
                label={inv.event_type === 'matrimonio' ? 'Lista nozze: testo (facoltativo)' : 'Regali: testo (facoltativo)'}
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
              <Field label="Link alla lista regali (facoltativo)" name="giftLink" value={d.giftLink} maxlength={LIMITS.giftLink} placeholder="https://…" inputmode="url" />
            </section>

            <section class="ed-card">
              <h2 class="ed-title">Conferme di presenza</h2>
              <Field label="Chiedi di rispondere entro il" name="rsvpDeadline" type="date" value={d.rsvpDeadline} />
              <Toggle name="askChildren" checked={d.askChildren} label="Chiedi quanti bambini" />
              <Toggle name="askDiet" checked={d.askDiet} label="Chiedi allergie, intolleranze e menu" />
              <Field label="Una domanda in più (facoltativa)" name="customQuestion" value={d.customQuestion} maxlength={LIMITS.customQuestion} placeholder="Es. Ti serve il bus navetta?" />
              <div class="row-2">
                <Field label="Chi contattare per domande" name="contactName" value={d.contactName} maxlength={LIMITS.contactName} placeholder="Es. Anna" />
                <Field label="Il suo WhatsApp" name="contactPhone" type="tel" value={d.contactPhone} maxlength={LIMITS.contactPhone} placeholder="333 123 4567" inputmode="tel" />
              </div>
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
              ↺ Rivedi la busta
            </button>
            <button type="button" class="link-btn close-preview" id="close-preview">
              Chiudi ✕
            </button>
          </div>
          <div class="phone">
            <iframe id="preview" src={`${base}/anteprima`} title="Anteprima dell’invito"></iframe>
          </div>
        </aside>
      </main>
      <div class="mobile-bar">
        <button type="button" class="btn btn-secondary" id="open-preview">
          👁 Anteprima
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
