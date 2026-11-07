/**
 * Pannello sinistro dell'applicazione GIS: strumenti, mappa di base e livelli.
 * Mostra solo dati ricevuti dal backend; stati "non disponibile" sempre espliciti.
 */
import { formattaQuota } from "../lib/formato";
import { MAPPE_BASE, NOMI_LIVELLI, spostaLivello, type IdLivello, type MappaBase } from "../lib/livelli";
import type { RispostaCurve, RispostaMappa, StatoRichiesta, TipoMappa } from "../lib/types";
import type { Vista3D } from "./MappaTerreno";

export type Strumento = "naviga" | "poligono" | "linea" | "quota" | "modifica";

export interface StatoLivelloAnalisi {
  visibile: boolean;
  modo: TipoMappa;
  opacita: number; // 0..1
}

export interface StatoLivelloCurve {
  visibile: boolean;
  intervallo: number | null; // null = consigliato
}

interface Props {
  strumento: Strumento;
  onStrumento: (s: Strumento) => void;
  haTerreno: boolean;
  haLinea: boolean;
  onElimina: () => void;
  mappaBase: MappaBase;
  onMappaBase: (m: MappaBase) => void;
  ordine: IdLivello[];
  onOrdine: (o: IdLivello[]) => void;
  analisi: StatoLivelloAnalisi;
  onAnalisi: (patch: Partial<StatoLivelloAnalisi>) => void;
  mappa: StatoRichiesta<RispostaMappa>;
  curve: StatoLivelloCurve;
  onCurve: (patch: Partial<StatoLivelloCurve>) => void;
  statoCurve: StatoRichiesta<RispostaCurve>;
  confineVisibile: boolean;
  onConfine: (v: boolean) => void;
  vista3d?: Vista3D;
  onVista3d?: (patch: Partial<Vista3D>) => void;
  onRipristinaVista?: () => void;
  /** Motivo per cui il 3D non è disponibile (es. DTM non installato); null = disponibile. */
  motivo3d?: string | null;
}

const STRUMENTI: { id: Strumento; nome: string; aiuto: string }[] = [
  { id: "naviga", nome: "Naviga", aiuto: "Sposta e ingrandisci la mappa" },
  { id: "poligono", nome: "Lotto", aiuto: "Disegna il perimetro del terreno" },
  { id: "linea", nome: "Linea A-B", aiuto: "Profilo altimetrico e distanza" },
  { id: "quota", nome: "Quota", aiuto: "Clicca un punto per leggerne la quota" },
  { id: "modifica", nome: "Modifica", aiuto: "Trascina i vertici di lotto e linea" },
];

const MODI: { id: TipoMappa; nome: string }[] = [
  { id: "quota", nome: "Altimetria" },
  { id: "pendenza", nome: "Pendenza" },
  { id: "esposizione", nome: "Esposizione" },
];

export function PannelloSinistro(p: Props) {
  return (
    <div className="pannello-sx" aria-label="Strumenti e livelli">
      <section className="blocco" aria-labelledby="titolo-strumenti">
        <h2 id="titolo-strumenti" className="blocco__titolo">
          Strumenti
        </h2>
        <div className="griglia-strumenti" role="toolbar" aria-label="Strumenti di disegno e misura">
          {STRUMENTI.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`strumento-sx ${p.strumento === s.id ? "strumento-sx--attivo" : ""}`}
              aria-pressed={p.strumento === s.id}
              title={s.aiuto}
              disabled={s.id === "modifica" && !p.haTerreno && !p.haLinea}
              onClick={() => p.onStrumento(s.id)}
            >
              <IconaStrumento id={s.id} />
              <span>{s.nome}</span>
            </button>
          ))}
          <button
            type="button"
            className="strumento-sx strumento-sx--pericolo"
            title="Elimina lotto e linea"
            disabled={!p.haTerreno && !p.haLinea}
            onClick={p.onElimina}
          >
            <IconaStrumento id="elimina" />
            <span>Elimina</span>
          </button>
        </div>
      </section>

      {p.vista3d && p.onVista3d && <BloccoVista {...p} />}

      <section className="blocco" aria-labelledby="titolo-base">
        <h2 id="titolo-base" className="blocco__titolo">
          Mappa di base
        </h2>
        <div className="selettore selettore--3" role="radiogroup" aria-label="Mappa di base">
          {(Object.keys(MAPPE_BASE) as MappaBase[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={p.mappaBase === m}
              className={`selettore__opzione ${p.mappaBase === m ? "selettore__opzione--attiva" : ""}`}
              onClick={() => p.onMappaBase(m)}
            >
              {MAPPE_BASE[m].nome}
            </button>
          ))}
        </div>
        <p className="testo-secondario">{MAPPE_BASE[p.mappaBase].descrizione}</p>
      </section>

      <section className="blocco" aria-labelledby="titolo-livelli">
        <h2 id="titolo-livelli" className="blocco__titolo">
          Livelli
        </h2>
        <ol className="livelli">
          {p.ordine.map((id, i) => (
            <li key={id} className="livello">
              <div className="livello__testa">
                <label className="livello__interruttore">
                  <input
                    type="checkbox"
                    checked={id === "analisi" ? p.analisi.visibile : id === "curve" ? p.curve.visibile : p.confineVisibile}
                    onChange={(e) =>
                      id === "analisi"
                        ? p.onAnalisi({ visibile: e.target.checked })
                        : id === "curve"
                          ? p.onCurve({ visibile: e.target.checked })
                          : p.onConfine(e.target.checked)
                    }
                  />
                  <span>{NOMI_LIVELLI[id]}</span>
                </label>
                <span className="livello__ordine">
                  <button
                    type="button"
                    aria-label={`Porta "${NOMI_LIVELLI[id]}" più in alto`}
                    disabled={i === 0}
                    onClick={() => p.onOrdine(spostaLivello(p.ordine, id, -1))}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Porta "${NOMI_LIVELLI[id]}" più in basso`}
                    disabled={i === p.ordine.length - 1}
                    onClick={() => p.onOrdine(spostaLivello(p.ordine, id, 1))}
                  >
                    ▼
                  </button>
                </span>
              </div>
              {id === "analisi" && p.analisi.visibile && <CorpoAnalisi {...p} />}
              {id === "curve" && p.curve.visibile && <CorpoCurve {...p} />}
              {id === "confine" && p.confineVisibile && (
                <p className="testo-secondario">Lombardia (ISTAT 2024). Fuori dall'area pilota la mappa è oscurata.</p>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function BloccoVista({ vista3d, onVista3d, onRipristinaVista, motivo3d }: Props) {
  if (!vista3d || !onVista3d) return null;
  const disponibile = !motivo3d;
  return (
    <section className="blocco" aria-labelledby="titolo-vista">
      <h2 id="titolo-vista" className="blocco__titolo">
        Vista
      </h2>
      <div className="selettore selettore--2" role="radiogroup" aria-label="Vista 2D o 3D">
        {[false, true].map((tre) => (
          <button
            key={String(tre)}
            type="button"
            role="radio"
            aria-checked={vista3d.attiva === tre}
            disabled={tre && !disponibile}
            className={`selettore__opzione ${vista3d.attiva === tre ? "selettore__opzione--attiva" : ""}`}
            onClick={() => onVista3d({ attiva: tre })}
          >
            {tre ? "3D" : "2D"}
          </button>
        ))}
      </div>
      {!disponibile && <p className="testo-secondario">Vista 3D non disponibile: {motivo3d}</p>}
      {disponibile && vista3d.attiva && (
        <>
          <label className="cursore">
            <span>Esagerazione</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.5}
              value={vista3d.esagerazione}
              onChange={(e) => onVista3d({ esagerazione: Number(e.target.value) })}
              aria-valuetext={`${vista3d.esagerazione} volte`}
            />
            <output>×{String(vista3d.esagerazione).replace(".", ",")}</output>
          </label>
          <p className="testo-secondario">
            ×1 = scala reale. L'esagerazione è solo visiva: misure e report usano sempre le quote reali.
          </p>
        </>
      )}
      <label className="livello__interruttore">
        <input
          type="checkbox"
          checked={vista3d.ombreggiatura}
          disabled={!disponibile}
          onChange={(e) => onVista3d({ ombreggiatura: e.target.checked })}
        />
        <span>Ombreggiatura del rilievo</span>
      </label>
      <button type="button" className="pulsante-secondario" onClick={onRipristinaVista}>
        Ripristina vista (Nord in alto, dall'alto)
      </button>
      {disponibile && (
        <p className="testo-secondario">
          Rilievo dal DTM 5×5 della Lombardia; fuori regione il terreno appare piatto (nessun dato). Ruota con il tasto
          destro o Ctrl + trascina; su smartphone con due dita.
        </p>
      )}
    </section>
  );
}

function CorpoAnalisi({ analisi, onAnalisi, mappa, haTerreno }: Props) {
  return (
    <div className="livello__corpo">
      <div className="selettore selettore--3" role="radiogroup" aria-label="Tipo di analisi">
        {MODI.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={analisi.modo === m.id}
            className={`selettore__opzione ${analisi.modo === m.id ? "selettore__opzione--attiva" : ""}`}
            onClick={() => onAnalisi({ modo: m.id })}
          >
            {m.nome}
          </button>
        ))}
      </div>
      <label className="cursore">
        <span>Opacità</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(analisi.opacita * 100)}
          onChange={(e) => onAnalisi({ opacita: Number(e.target.value) / 100 })}
          aria-valuetext={`${Math.round(analisi.opacita * 100)} %`}
        />
        <output>{Math.round(analisi.opacita * 100)} %</output>
      </label>
      {!haTerreno && <p className="testo-secondario">Disegna un lotto per vedere l'analisi sulla mappa.</p>}
      {haTerreno && mappa.stato === "in_corso" && <p className="testo-secondario">Calcolo della mappa…</p>}
      {haTerreno && mappa.stato === "errore" && <p className="avviso">{mappa.messaggio}</p>}
      {haTerreno && mappa.stato === "completata" && !mappa.risultato.disponibile && (
        <p className="avviso" data-testid="analisi-non-disponibile">
          Dati altimetrici non disponibili. {mappa.risultato.motivo}
        </p>
      )}
      {haTerreno && mappa.stato === "completata" && mappa.risultato.disponibile && <Legenda mappa={mappa.risultato} />}
    </div>
  );
}

export function Legenda({ mappa }: { mappa: RispostaMappa }) {
  if (mappa.tipo === "quota" && mappa.scala) {
    const gradiente = `linear-gradient(90deg, ${mappa.scala.tappe.map((t) => t.colore).join(", ")})`;
    return (
      <div className="legenda-gradiente" data-testid="legenda-quota">
        <span className="legenda-gradiente__barra" style={{ background: gradiente }} aria-hidden="true" />
        <span className="legenda-gradiente__etichette">
          <span>{formattaQuota(mappa.scala.minima)}</span>
          <span>{formattaQuota(mappa.scala.massima)}</span>
        </span>
        <p className="testo-secondario">{mappa.scala.nota}</p>
      </div>
    );
  }
  return (
    <ul className="legenda" aria-label="Legenda">
      {mappa.legenda.map((v) => (
        <li key={v.etichetta}>
          <span className="legenda__colore" style={{ background: v.colore }} aria-hidden="true" />
          <span>{v.etichetta}</span>
          <span className="legenda__valore">{Math.round(v.percentuale_celle)}%</span>
        </li>
      ))}
    </ul>
  );
}

function CorpoCurve({ curve, onCurve, statoCurve, haTerreno }: Props) {
  const intervalli = statoCurve.stato === "completata" ? statoCurve.risultato.intervalli : [];
  return (
    <div className="livello__corpo">
      <label className="campo-riga">
        <span>Intervallo</span>
        <select
          value={curve.intervallo ?? ""}
          onChange={(e) => onCurve({ intervallo: e.target.value ? Number(e.target.value) : null })}
          disabled={!haTerreno}
        >
          <option value="">Automatico</option>
          {intervalli.map((i) => (
            <option key={i.metri} value={i.metri} disabled={!i.ammesso} title={i.motivo ?? undefined}>
              {i.metri} m{i.ammesso ? ` (${i.livelli} curve)` : " – non disponibile"}
            </option>
          ))}
        </select>
      </label>
      {!haTerreno && <p className="testo-secondario">Disegna un lotto per calcolare le curve.</p>}
      {haTerreno && statoCurve.stato === "in_corso" && <p className="testo-secondario">Calcolo delle curve…</p>}
      {haTerreno && statoCurve.stato === "errore" && <p className="avviso">{statoCurve.messaggio}</p>}
      {haTerreno && statoCurve.stato === "completata" && !statoCurve.risultato.disponibile && (
        <p className="avviso">{statoCurve.risultato.motivo ?? statoCurve.risultato.messaggio}</p>
      )}
      {haTerreno && statoCurve.stato === "completata" && statoCurve.risultato.disponibile && (
        <p className="testo-secondario" data-testid="curve-info">
          {statoCurve.risultato.numero_curve} curve ogni {statoCurve.risultato.intervallo_m} m (le direttrici, più
          marcate, ogni 5). Intervalli sotto i 2 m esclusi: l'accuratezza del DTM arriva a 2 m.
        </p>
      )}
    </div>
  );
}

function IconaStrumento({ id }: { id: Strumento | "elimina" }) {
  const percorsi: Record<string, string> = {
    naviga: "M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3",
    poligono: "M5 18 L8 6 L18 4 L20 15 Z",
    linea: "M3 19 L8 11 L12 14 L17 6 L21 10",
    quota: "M12 21s-6-6.1-6-11a6 6 0 0 1 12 0c0 4.9-6 11-6 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
    modifica: "M4 20h4L19 9l-4-4L4 16z M14 6l4 4",
    elimina: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13",
  };
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d={percorsi[id]} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
