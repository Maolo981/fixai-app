/**
 * Sezioni del pannello per la Fase 3: mappe tematiche e profilo altimetrico.
 * Mostrano solo dati ricevuti dal backend; se non disponibili, lo dichiarano.
 */
import { formattaLunghezza, formattaQuota } from "../lib/formato";
import type { PuntoProfilo, RispostaProfilo, StatoRichiesta } from "../lib/types";
import { GraficoProfilo } from "./GraficoProfilo";

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
          {typeof stato.risultato.lunghezza_m === "number" && (
            <dl className="dati dati--senza-bordo">
              <dt>Distanza (geodetica)</dt>
              <dd data-testid="distanza-linea">{formattaLunghezza(stato.risultato.lunghezza_m)}</dd>
            </dl>
          )}
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
      {p.tratti && p.tratti.length > 1 && (
        <table className="tabella-tratti" aria-label="Tratti del profilo tra i vertici">
          <thead>
            <tr>
              <th scope="col">Tratto</th>
              <th scope="col">Lunghezza</th>
              <th scope="col">Dislivello</th>
              <th scope="col">Pendenza</th>
            </tr>
          </thead>
          <tbody>
            {p.tratti.map((t, i) => (
              <tr key={t.da_m}>
                <td>{i + 1}</td>
                <td>{formattaLunghezza(t.lunghezza_m)}</td>
                <td>{t.dislivello_m === null ? "n.d." : `${t.dislivello_m > 0 ? "+" : ""}${numero(t.dislivello_m, 1)} m`}</td>
                <td>{t.pendenza_percento === null ? "n.d." : `${numero(t.pendenza_percento, 1)} %`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
