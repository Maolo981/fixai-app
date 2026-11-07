/**
 * Pannello laterale con i risultati delle analisi.
 *
 * Mostra soltanto valori ricevuti dal backend. Le funzioni non ancora
 * implementate sono dichiarate esplicitamente come "non disponibili".
 */
import {
  etichettaClasse,
  formattaPendenza,
  formattaQuota,
  nomeSettore,
  formattaCatastale,
  formattaCoordinate,
  formattaEttari,
  formattaLunghezza,
  formattaMetriQuadri,
  formattaPercentuale,
} from "../lib/formato";
import type {
  AnalisiGeometria,
  Capacita,
  PuntoProfilo,
  RispostaProfilo,
  RispostaQuota,
  StatoAltimetria,
  StatoRichiesta,
} from "../lib/types";
import type { CampiReport } from "../lib/api";
import { SezioneReport } from "./SezioneReport";
import { SezioneProfilo } from "./SezioniFase3";

export type StatoAnalisi =
  | { stato: "vuoto" }
  | { stato: "in_corso" }
  | { stato: "errore"; messaggio: string }
  | { stato: "completata"; risultato: AnalisiGeometria };

/** Stato e azioni della Fase 3 (mappe tematiche e profilo), forniti dal componente padre. */
export interface DatiFase3 {
  /** Quota del punto cliccato con lo strumento "Quota". */
  quotaPunto?: StatoRichiesta<RispostaQuota>;
  profilo: StatoRichiesta<RispostaProfilo>;
  onPuntoProfilo: (punto: PuntoProfilo | null) => void;
  /** Fase 4: generazione del report PDF. */
  haLinea: boolean;
  onReport: (campi: CampiReport, includiProfilo: boolean) => Promise<string>;
}

export type SchedaDestra = "lotto" | "altimetria" | "profilo" | "report";

interface Props {
  analisi: StatoAnalisi;
  capacita: Capacita | null;
  fase3?: DatiFase3;
  /** Scheda da mostrare; se assente si mostrano tutte le sezioni. */
  scheda?: SchedaDestra;
}

const ETICHETTA_AREA_PILOTA = {
  interno: "Dentro l'area pilota",
  parziale: "Parzialmente fuori dall'area pilota",
  esterno: "Fuori dall'area pilota",
} as const;

const AVVERTENZA_PREDEFINITA =
  "Le analisi sono preliminari e indicative: non sostituiscono un rilievo topografico o una perizia tecnica eseguiti da un professionista abilitato.";

export function PannelloRisultati({ analisi, capacita, fase3, scheda }: Props) {
  const profiloAttivo = capacita?.funzioni.some((f) => f.chiave === "profilo" && f.stato === "implementata") ?? false;
  const mostra = (s: SchedaDestra) => !scheda || scheda === s;
  return (
    <aside className="pannello" aria-label="Risultati dell'analisi">
      <div className="pannello__contenuto">
        {mostra("lotto") && analisi.stato === "vuoto" && <Istruzioni />}
        {analisi.stato === "in_corso" && (mostra("lotto") || mostra("altimetria")) && (
          <div className="stato-caricamento" role="status">
            <span className="spinner" aria-hidden="true" /> Calcolo in corso…
          </div>
        )}
        {mostra("lotto") && analisi.stato === "errore" && (
          <div className="scheda scheda--errore" role="alert">
            <h2>Analisi non eseguita</h2>
            <p>{analisi.messaggio}</p>
            <p className="testo-secondario">Nessun valore viene mostrato finché il calcolo non va a buon fine.</p>
          </div>
        )}
        {mostra("lotto") && analisi.stato === "completata" && <Risultati r={analisi.risultato} />}

        {mostra("report") && analisi.stato === "completata" && fase3 && (
          <SezioneReport haLinea={fase3.haLinea} onGenera={fase3.onReport} />
        )}
        {scheda === "report" && analisi.stato !== "completata" && (
          <p className="testo-secondario">Disegna un lotto per generare il report PDF.</p>
        )}

        {mostra("altimetria") && <SezioneAltimetria analisi={analisi} capacita={capacita} />}
        {mostra("altimetria") && fase3?.quotaPunto && <SezioneQuotaPunto stato={fase3.quotaPunto} />}

        {mostra("profilo") && fase3 && (
          <SezioneProfilo
            stato={fase3.profilo}
            attivo={profiloAttivo || scheda === "profilo"}
            onPuntoEvidenziato={fase3.onPuntoProfilo}
          />
        )}
        {mostra("lotto") && capacita && <StatoFunzioni capacita={capacita} />}
      </div>
      <footer className="pannello__avvertenza">
        <strong>Avvertenza.</strong>{" "}
        {analisi.stato === "completata" ? analisi.risultato.nota_legale : (capacita?.nota_legale ?? AVVERTENZA_PREDEFINITA)}
      </footer>
    </aside>
  );
}

function SezioneQuotaPunto({ stato }: { stato: StatoRichiesta<RispostaQuota> }) {
  return (
    <section className="scheda scheda--compatta" aria-labelledby="titolo-quota-punto" data-testid="quota-punto">
      <h2 id="titolo-quota-punto">Quota di un punto</h2>
      {stato.stato === "vuoto" && (
        <p className="testo-secondario">
          Scegli lo strumento <strong>Quota</strong> e clicca un punto sulla mappa.
        </p>
      )}
      {stato.stato === "in_corso" && <p className="testo-secondario">Lettura del DTM…</p>}
      {stato.stato === "errore" && <p className="avviso">{stato.messaggio}</p>}
      {stato.stato === "completata" && !stato.risultato.disponibile && (
        <>
          <p className="non-disponibile">Dati altimetrici non disponibili</p>
          {stato.risultato.motivo && <p className="testo-secondario">{stato.risultato.motivo}</p>}
        </>
      )}
      {stato.stato === "completata" && stato.risultato.disponibile && (
        <>
          <p className="metrica__valore" data-testid="quota-punto-valore">
            {formattaQuota(stato.risultato.quota_m ?? 0)}
          </p>
          <dl className="dati dati--senza-bordo">
            <dt>Punto</dt>
            <dd>{formattaCoordinate(stato.risultato.lat, stato.risultato.lon)}</dd>
            <dt>Cella DTM</dt>
            <dd>{formattaQuota(stato.risultato.quota_cella_m ?? 0)}</dd>
          </dl>
          <p className="testo-secondario">
            Quota stimata: {stato.risultato.metodo} {stato.risultato.precisione}
          </p>
        </>
      )}
    </section>
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

function SezioneAltimetria({ analisi, capacita }: { analisi: StatoAnalisi; capacita: Capacita | null }) {
  if (analisi.stato === "completata") {
    const alt = analisi.risultato.altimetria;
    return alt.disponibile && alt.quote && alt.pendenza && alt.esposizione ? (
      <RisultatiAltimetria alt={alt} />
    ) : (
      <AltimetriaNonDisponibile motivo={alt.motivo} />
    );
  }
  if (analisi.stato !== "vuoto") return null;
  const attiva = capacita?.funzioni.find((f) => f.chiave === "altimetria");
  if (attiva?.stato === "implementata") {
    return (
      <section className="scheda scheda--compatta" aria-labelledby="titolo-altimetria">
        <h2 id="titolo-altimetria">Analisi altimetrica</h2>
        <p className="testo-secondario">
          Disegna un terreno in Lombardia: quote, dislivello, pendenza ed esposizione vengono calcolati con il DTM 5×5
          di Regione Lombardia.
        </p>
      </section>
    );
  }
  return <AltimetriaNonDisponibile motivo={attiva?.note} />;
}

function AltimetriaNonDisponibile({ motivo }: { motivo?: string | null }) {
  return (
    <section className="scheda scheda--non-disponibile" aria-labelledby="titolo-altimetria">
      <div className="scheda__intestazione">
        <h2 id="titolo-altimetria">Analisi altimetrica</h2>
        <span className="etichetta etichetta--non-disponibile">Non disponibile</span>
      </div>
      <p className="non-disponibile" data-testid="altimetria-non-disponibile">
        Dati altimetrici non disponibili
      </p>
      {motivo && <p className="testo-secondario">{motivo}</p>}
      <p className="testo-secondario">Nessun valore altimetrico è stimato o simulato.</p>
    </section>
  );
}

function RisultatiAltimetria({ alt }: { alt: StatoAltimetria }) {
  const quote = alt.quote!;
  const pendenza = alt.pendenza!;
  const esposizione = alt.esposizione!;
  const maxClasse = Math.max(...pendenza.classi.map((c) => c.percentuale_celle), 1);
  return (
    <section className="scheda" aria-labelledby="titolo-altimetria" data-testid="altimetria">
      <div className="scheda__intestazione">
        <h2 id="titolo-altimetria">Analisi altimetrica</h2>
        <span className="etichetta etichetta--reale">Dati reali DTM</span>
      </div>

      <div className="griglia-metriche">
        <Metrica nome="Quota minima" valore={formattaQuota(quote.minima)} testId="quota-minima" />
        <Metrica nome="Quota massima" valore={formattaQuota(quote.massima)} testId="quota-massima" />
        <Metrica nome="Quota media" valore={formattaQuota(quote.media)} />
        <Metrica nome="Dislivello" valore={formattaQuota(quote.dislivello)} testId="dislivello" />
      </div>

      <h3 className="sottotitolo">Pendenza</h3>
      <dl className="dati dati--senza-bordo">
        <dt>Media</dt>
        <dd data-testid="pendenza-media">{formattaPendenza(pendenza.media_percento, pendenza.media_gradi)}</dd>
        <dt>Massima</dt>
        <dd>{formattaPendenza(pendenza.massima_percento, pendenza.massima_gradi)}</dd>
      </dl>
      <ul className="barre" aria-label="Distribuzione delle pendenze">
        {pendenza.classi.map((c) => (
          <li key={c.da_percento}>
            <span className="barre__etichetta">{etichettaClasse(c.da_percento, c.a_percento)}</span>
            <span className="barre__traccia">
              <span className="barre__valore" style={{ width: `${(c.percentuale_celle / maxClasse) * 100}%` }} />
            </span>
            <span className="barre__numero">{Math.round(c.percentuale_celle)}%</span>
          </li>
        ))}
      </ul>

      <h3 className="sottotitolo">Esposizione</h3>
      <div className="esposizione">
        <RosaEsposizione settori={esposizione.settori} />
        <div>
          <p>
            Prevalente: <strong data-testid="esposizione-prevalente">{nomeSettore(esposizione.prevalente)}</strong>
          </p>
          <p className="testo-secondario">
            Pianeggiante (pendenza &lt; {esposizione.soglia_pianeggiante_percento}%):{" "}
            {Math.round(esposizione.settori.find((s) => s.settore === "Pianeggiante")?.percentuale_celle ?? 0)}%
          </p>
        </div>
      </div>

      {alt.avvertenze?.map((a) => (
        <p key={a} className="avviso">
          {a}
        </p>
      ))}

      <details className="dettagli-tecnici">
        <summary>Fonte e metodo</summary>
        <p>{alt.fonte?.attribuzione}</p>
        <p>{alt.fonte?.precisione_dichiarata}</p>
        <p>
          Celle analizzate: {alt.celle?.valide} su {alt.celle?.interne} (copertura{" "}
          {alt.celle ? Math.round(alt.celle.copertura_percento * 10) / 10 : 0}%), celle di {alt.celle?.dimensione_m} m.
        </p>
        <p>{quote.nota}</p>
        <p>{pendenza.metodo}</p>
        <p>{esposizione.metodo}</p>
      </details>
    </section>
  );
}

function Metrica({ nome, valore, testId }: { nome: string; valore: string; testId?: string }) {
  return (
    <div className="metrica metrica--compatta">
      <span className="metrica__nome">{nome}</span>
      <span className="metrica__valore" data-testid={testId}>
        {valore}
      </span>
    </div>
  );
}

/** Rosa a 8 settori: la lunghezza di ogni spicchio è proporzionale alla quota di celle. */
function RosaEsposizione({ settori }: { settori: { settore: string; percentuale_celle: number }[] }) {
  const ordine = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const max = Math.max(...settori.filter((s) => s.settore !== "Pianeggiante").map((s) => s.percentuale_celle), 1);
  const raggio = 46;
  const spicchio = (i: number, valore: number) => {
    const r = 6 + (valore / max) * (raggio - 6);
    const a1 = ((i * 45 - 22.5) * Math.PI) / 180;
    const a2 = ((i * 45 + 22.5) * Math.PI) / 180;
    const p = (a: number) => `${50 + r * Math.sin(a)},${50 - r * Math.cos(a)}`;
    return `M50,50 L${p(a1)} A${r},${r} 0 0 1 ${p(a2)} Z`;
  };
  return (
    <svg viewBox="-10 -10 120 120" className="rosa" role="img" aria-label="Rosa delle esposizioni">
      <circle cx="50" cy="50" r={raggio} className="rosa__cerchio" />
      {ordine.map((s, i) => {
        const v = settori.find((x) => x.settore === s)?.percentuale_celle ?? 0;
        return v > 0 ? <path key={s} d={spicchio(i, v)} className="rosa__spicchio" /> : null;
      })}
      <text x="50" y="-1" className="rosa__testo">
        N
      </text>
      <text x="104" y="53" className="rosa__testo">
        E
      </text>
      <text x="50" y="108" className="rosa__testo">
        S
      </text>
      <text x="-4" y="53" className="rosa__testo">
        O
      </text>
    </svg>
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
