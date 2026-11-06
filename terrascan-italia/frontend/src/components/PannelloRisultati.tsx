/**
 * Pannello laterale con i risultati delle analisi.
 *
 * Mostra soltanto valori ricevuti dal backend. Le funzioni non ancora
 * implementate sono dichiarate esplicitamente come "non disponibili".
 */
import {
  formattaCatastale,
  formattaCoordinate,
  formattaEttari,
  formattaLunghezza,
  formattaMetriQuadri,
  formattaPercentuale,
} from "../lib/formato";
import type { AnalisiGeometria, Capacita } from "../lib/types";

export type StatoAnalisi =
  | { stato: "vuoto" }
  | { stato: "in_corso" }
  | { stato: "errore"; messaggio: string }
  | { stato: "completata"; risultato: AnalisiGeometria };

interface Props {
  analisi: StatoAnalisi;
  capacita: Capacita | null;
}

const ETICHETTA_AREA_PILOTA = {
  interno: "Dentro l'area pilota",
  parziale: "Parzialmente fuori dall'area pilota",
  esterno: "Fuori dall'area pilota",
} as const;

const AVVERTENZA_PREDEFINITA =
  "Le analisi sono preliminari e indicative: non sostituiscono un rilievo topografico o una perizia tecnica eseguiti da un professionista abilitato.";

export function PannelloRisultati({ analisi, capacita }: Props) {
  return (
    <aside className="pannello" aria-label="Risultati dell'analisi">
      <div className="pannello__contenuto">
        {analisi.stato === "vuoto" && <Istruzioni />}
        {analisi.stato === "in_corso" && (
          <div className="stato-caricamento" role="status">
            <span className="spinner" aria-hidden="true" /> Calcolo in corso…
          </div>
        )}
        {analisi.stato === "errore" && (
          <div className="scheda scheda--errore" role="alert">
            <h2>Analisi non eseguita</h2>
            <p>{analisi.messaggio}</p>
            <p className="testo-secondario">Nessun valore viene mostrato finché il calcolo non va a buon fine.</p>
          </div>
        )}
        {analisi.stato === "completata" && <Risultati r={analisi.risultato} />}

        <SezioneAltimetria />
        {capacita && <StatoFunzioni capacita={capacita} />}
      </div>
      <footer className="pannello__avvertenza">
        <strong>Avvertenza.</strong>{" "}
        {analisi.stato === "completata" ? analisi.risultato.nota_legale : (capacita?.nota_legale ?? AVVERTENZA_PREDEFINITA)}
      </footer>
    </aside>
  );
}

function Istruzioni() {
  return (
    <div className="scheda">
      <h2>Analizza un terreno</h2>
      <ol className="passi">
        <li>
          <strong>Cerca</strong> il comune, l'indirizzo o le coordinate del terreno.
        </li>
        <li>
          Premi <strong>Disegna terreno</strong> e clicca sulla mappa i vertici del perimetro.
        </li>
        <li>
          Chiudi il perimetro cliccando sul <strong>primo vertice</strong>: superficie e perimetro vengono calcolati
          subito.
        </li>
      </ol>
    </div>
  );
}

function Risultati({ r }: { r: AnalisiGeometria }) {
  return (
    <>
      <section className="scheda" aria-labelledby="titolo-misure">
        <div className="scheda__intestazione">
          <h2 id="titolo-misure">Misure del terreno</h2>
          <span className="etichetta etichetta--reale">Calcolo reale</span>
        </div>

        <div className="metrica metrica--principale">
          <span className="metrica__nome">Superficie</span>
          <span className="metrica__valore" data-testid="superficie-m2">
            {formattaMetriQuadri(r.superficie.m2)}
          </span>
          <span className="metrica__dettaglio">
            {formattaEttari(r.superficie.ettari)} · {formattaCatastale(r.superficie.m2)}
          </span>
        </div>
        <div className="metrica">
          <span className="metrica__nome">Perimetro</span>
          <span className="metrica__valore" data-testid="perimetro-m">
            {formattaLunghezza(r.perimetro.m)}
          </span>
        </div>

        <dl className="dati">
          <dt>Vertici</dt>
          <dd>{r.numero_vertici}</dd>
          <dt>Centroide</dt>
          <dd>{formattaCoordinate(r.centroide.lat, r.centroide.lon)}</dd>
          <dt>Area pilota</dt>
          <dd>
            <span className={`pallino pallino--${r.area_pilota.stato}`} aria-hidden="true" />
            {ETICHETTA_AREA_PILOTA[r.area_pilota.stato]} ({r.area_pilota.nome})
          </dd>
        </dl>

        {r.avvertenze.map((a) => (
          <p key={a} className="avviso">
            {a}
          </p>
        ))}

        <details className="dettagli-tecnici">
          <summary>Dettagli tecnici del calcolo</summary>
          <p>
            <strong>Metodo superficie:</strong> {r.superficie.metodo}.
          </p>
          <p>
            <strong>Metodo perimetro:</strong> {r.perimetro.metodo}.
          </p>
          <p>
            <strong>Controllo in proiezione</strong> ({r.controllo_utm32.descrizione}, EPSG:{r.controllo_utm32.epsg}):{" "}
            superficie {formattaMetriQuadri(r.controllo_utm32.area_m2)}, perimetro{" "}
            {formattaLunghezza(r.controllo_utm32.perimetro_m)}, scarto{" "}
            {formattaPercentuale(r.controllo_utm32.differenza_area_percentuale)} dovuto al fattore di scala della
            proiezione.
          </p>
          <p>
            La superficie è planimetrica (proiettata sull'ellissoide): non tiene conto della pendenza del terreno.
          </p>
        </details>
      </section>
    </>
  );
}

function SezioneAltimetria() {
  return (
    <section className="scheda scheda--non-disponibile" aria-labelledby="titolo-altimetria">
      <div className="scheda__intestazione">
        <h2 id="titolo-altimetria">Analisi altimetrica</h2>
        <span className="etichetta etichetta--non-disponibile">Fase 2</span>
      </div>
      <p className="non-disponibile" data-testid="altimetria-non-disponibile">
        Dati altimetrici non disponibili
      </p>
      <p className="testo-secondario">
        Quota minima e massima, dislivello e pendenza verranno calcolati con il DTM 5×5 di Regione Lombardia. Nessun
        valore altimetrico è stimato o simulato.
      </p>
    </section>
  );
}

function StatoFunzioni({ capacita }: { capacita: Capacita }) {
  return (
    <section className="scheda scheda--compatta" aria-labelledby="titolo-funzioni">
      <h2 id="titolo-funzioni">Funzioni della piattaforma</h2>
      <ul className="funzioni">
        {capacita.funzioni.map((f) => (
          <li key={f.chiave} title={f.note}>
            <span className={`pallino pallino--${f.stato === "implementata" ? "interno" : "spento"}`} aria-hidden="true" />
            <span>{f.nome}</span>
            <span className="funzioni__stato">{f.stato === "implementata" ? "Attiva" : "Non disponibile"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
