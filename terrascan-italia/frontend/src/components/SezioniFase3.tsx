/**
 * Sezioni del pannello per la Fase 3: mappe tematiche e profilo altimetrico.
 * Mostrano solo dati ricevuti dal backend; se non disponibili, lo dichiarano.
 */
import { formattaLunghezza, formattaQuota } from "../lib/formato";
import type { PuntoProfilo, RispostaMappa, RispostaProfilo, StatoRichiesta, TipoMappa } from "../lib/types";
import { GraficoProfilo } from "./GraficoProfilo";

export type SceltaMappa = TipoMappa | "nessuna";

const NOMI_MAPPE: Record<SceltaMappa, string> = {
  nessuna: "Nessuna",
  pendenza: "Pendenze",
  esposizione: "Esposizioni",
};

function numero(valore: number, decimali: number) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
    useGrouping: "always",
  }).format(valore);
}

/** "+12,3 m" / "−4,5 m", oppure "0,0 m" se il valore è nullo (mai "−0,0"). */
function conSegno(valore: number | null | undefined, segno: string) {
  const v = Math.abs(valore ?? 0);
  return Math.round(v * 10) === 0 ? "0,0 m" : `${segno}${numero(v, 1)} m`;
}

export function SezioneMappe({
  scelta,
  stato,
  onScelta,
}: {
  scelta: SceltaMappa;
  stato: StatoRichiesta<RispostaMappa>;
  onScelta: (scelta: SceltaMappa) => void;
}) {
  return (
    <section className="scheda" aria-labelledby="titolo-mappe">
      <div className="scheda__intestazione">
        <h2 id="titolo-mappe">Mappa sul terreno</h2>
        {stato.stato === "completata" && stato.risultato.disponibile && (
          <span className="etichetta etichetta--reale">Dati reali DTM</span>
        )}
      </div>
      <div className="selettore" role="radiogroup" aria-label="Mappa da sovrapporre al terreno">
        {(Object.keys(NOMI_MAPPE) as SceltaMappa[]).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={scelta === s}
            className={`selettore__opzione ${scelta === s ? "selettore__opzione--attiva" : ""}`}
            onClick={() => onScelta(s)}
          >
            {NOMI_MAPPE[s]}
          </button>
        ))}
      </div>
      {scelta !== "nessuna" && stato.stato === "in_corso" && (
        <p className="testo-secondario" role="status">
          Preparazione della mappa…
        </p>
      )}
      {scelta !== "nessuna" && stato.stato === "errore" && (
        <p className="avviso" role="alert">
          {stato.messaggio}
        </p>
      )}
      {scelta !== "nessuna" && stato.stato === "completata" && !stato.risultato.disponibile && (
        <p className="avviso">Dati altimetrici non disponibili. {stato.risultato.motivo}</p>
      )}
      {scelta !== "nessuna" && stato.stato === "completata" && stato.risultato.disponibile && (
        <>
          <ul className="legenda" aria-label={`Legenda della mappa delle ${NOMI_MAPPE[scelta].toLowerCase()}`}>
            {stato.risultato.legenda.map((v) => (
              <li key={v.etichetta}>
                <span className="legenda__colore" style={{ background: v.colore }} aria-hidden="true" />
                <span>{v.etichetta}</span>
                <span className="legenda__valore">{Math.round(v.percentuale_celle)}%</span>
              </li>
            ))}
          </ul>
          <p className="testo-secondario">{stato.risultato.nota}</p>
        </>
      )}
      {scelta === "nessuna" && (
        <p className="testo-secondario">
          Colora le celle del DTM (5 × 5 m) dentro il terreno per classe di pendenza o per esposizione.
        </p>
      )}
    </section>
  );
}

export function SezioneProfilo({
  stato,
  attivo,
  onPuntoEvidenziato,
}: {
  stato: StatoRichiesta<RispostaProfilo>;
  attivo: boolean;
  onPuntoEvidenziato: (punto: PuntoProfilo | null) => void;
}) {
  if (!attivo && stato.stato === "vuoto") return null;
  return (
    <section className="scheda" aria-labelledby="titolo-profilo" data-testid="sezione-profilo">
      <div className="scheda__intestazione">
        <h2 id="titolo-profilo">Profilo altimetrico</h2>
        {stato.stato === "completata" && stato.risultato.disponibile && (
          <span className="etichetta etichetta--reale">Dati reali DTM</span>
        )}
      </div>
      {stato.stato === "vuoto" && (
        <p className="testo-secondario">
          Premi <strong>Profilo</strong> e traccia una linea sulla mappa (per esempio lungo la massima pendenza o una
          strada di accesso) per vedere come cambia la quota.
        </p>
      )}
      {stato.stato === "in_corso" && (
        <p className="testo-secondario" role="status">
          Calcolo del profilo…
        </p>
      )}
      {stato.stato === "errore" && (
        <p className="avviso" role="alert">
          {stato.messaggio}
        </p>
      )}
      {stato.stato === "completata" && !stato.risultato.disponibile && (
        <>
          <p className="non-disponibile" data-testid="profilo-non-disponibile">
            Dati altimetrici non disponibili
          </p>
          {stato.risultato.motivo && <p className="testo-secondario">{stato.risultato.motivo}</p>}
        </>
      )}
      {stato.stato === "completata" && stato.risultato.disponibile && (
        <RisultatoProfiloVista p={stato.risultato} onPuntoEvidenziato={onPuntoEvidenziato} />
      )}
    </section>
  );
}

function RisultatoProfiloVista({
  p,
  onPuntoEvidenziato,
}: {
  p: RispostaProfilo;
  onPuntoEvidenziato: (punto: PuntoProfilo | null) => void;
}) {
  const quota = (v: number | null | undefined) => (v === null || v === undefined ? "—" : formattaQuota(v));
  return (
    <>
      <GraficoProfilo punti={p.punti} onPuntoEvidenziato={onPuntoEvidenziato} />
      <dl className="dati dati--senza-bordo dati--due-colonne">
        <dt>Lunghezza</dt>
        <dd data-testid="profilo-lunghezza">{formattaLunghezza(p.lunghezza_m ?? 0)}</dd>
        <dt>Lungo il terreno</dt>
        <dd>{formattaLunghezza(p.lunghezza_inclinata_m ?? 0)}</dd>
        <dt>Quota inizio → fine</dt>
        <dd>
          {quota(p.quota_iniziale)} → {quota(p.quota_finale)}
        </dd>
        <dt>Minima / massima</dt>
        <dd>
          {quota(p.quota_minima)} / {quota(p.quota_massima)}
        </dd>
        <dt>Salita / discesa</dt>
        <dd data-testid="profilo-salita">
          {conSegno(p.salita_m, "+")} / {conSegno(p.discesa_m, "−")}
        </dd>
        <dt>Pendenza media</dt>
        <dd>{numero(p.pendenza_media_percento ?? 0, 1)} %</dd>
      </dl>
      {p.avvertenze.map((a) => (
        <p key={a} className="avviso">
          {a}
        </p>
      ))}
      <details className="dettagli-tecnici">
        <summary>Fonte e metodo</summary>
        <p>{p.metodo}</p>
        <p>
          Pendenza massima tra due campioni consecutivi ({p.passo_m} m): {numero(p.pendenza_massima_percento ?? 0, 1)} %.
          Copertura del DTM lungo la linea: {numero(p.copertura_percento ?? 0, 1)} %.
        </p>
        <p>{p.attribuzione}</p>
      </details>
    </>
  );
}
