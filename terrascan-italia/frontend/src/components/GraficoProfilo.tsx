/**
 * Grafico quota/distanza del profilo altimetrico (SVG, senza librerie esterne).
 * I tratti senza dato DTM non vengono disegnati (interruzioni della linea).
 */
import { useMemo, useState, type PointerEvent } from "react";

import { formattaLunghezza, formattaQuota } from "../lib/formato";
import type { PuntoProfilo } from "../lib/types";

const L = 320; // larghezza logica
const H = 170; // altezza logica
const M = { sx: 44, dx: 10, su: 10, giu: 24 };

interface Props {
  punti: PuntoProfilo[];
  onPuntoEvidenziato?: (punto: PuntoProfilo | null) => void;
}

/** Valori "tondi" per le tacche dell'asse (1, 2, 5 × 10^n). */
export function tacche(min: number, max: number, quante = 4): number[] {
  if (!(max > min)) return [min];
  const grezzo = (max - min) / quante;
  const potenza = 10 ** Math.floor(Math.log10(grezzo));
  const passo = [1, 2, 5, 10].map((k) => k * potenza).find((p) => p >= grezzo) ?? grezzo;
  const inizio = Math.ceil(min / passo) * passo;
  const valori: number[] = [];
  for (let v = inizio; v <= max + 1e-9; v += passo) valori.push(Number(v.toFixed(10)));
  return valori;
}

/** Suddivide i punti in tratti continui (con quota), interrotti dove manca il dato. */
export function tratti(punti: PuntoProfilo[]): PuntoProfilo[][] {
  const risultato: PuntoProfilo[][] = [];
  let corrente: PuntoProfilo[] = [];
  for (const p of punti) {
    if (p.quota_m === null) {
      if (corrente.length) risultato.push(corrente);
      corrente = [];
    } else corrente.push(p);
  }
  if (corrente.length) risultato.push(corrente);
  return risultato;
}

export function GraficoProfilo({ punti, onPuntoEvidenziato }: Props) {
  const [indice, setIndice] = useState<number | null>(null);

  const scala = useMemo(() => {
    const quote = punti.map((p) => p.quota_m).filter((q): q is number => q !== null);
    let qMin = Math.min(...quote);
    let qMax = Math.max(...quote);
    if (qMax - qMin < 2) {
      // Terreno quasi piatto: almeno 2 m di escursione per non esagerare il rumore
      const centro = (qMax + qMin) / 2;
      qMin = centro - 1;
      qMax = centro + 1;
    }
    const margine = (qMax - qMin) * 0.06;
    qMin -= margine;
    qMax += margine;
    const dMax = punti[punti.length - 1]?.distanza_m || 1;
    const x = (d: number) => M.sx + (d / dMax) * (L - M.sx - M.dx);
    const y = (q: number) => M.su + (1 - (q - qMin) / (qMax - qMin)) * (H - M.su - M.giu);
    return { x, y, qMin, qMax, dMax };
  }, [punti]);

  const percorsi = tratti(punti).map((t) =>
    t.map((p, i) => `${i ? "L" : "M"}${scala.x(p.distanza_m).toFixed(1)},${scala.y(p.quota_m!).toFixed(1)}`).join(""),
  );
  const aree = tratti(punti).map(
    (t) =>
      `M${scala.x(t[0].distanza_m).toFixed(1)},${H - M.giu}` +
      t.map((p) => `L${scala.x(p.distanza_m).toFixed(1)},${scala.y(p.quota_m!).toFixed(1)}`).join("") +
      `L${scala.x(t[t.length - 1].distanza_m).toFixed(1)},${H - M.giu}Z`,
  );

  const sposta = (e: PointerEvent<SVGRectElement>) => {
    const rett = e.currentTarget.getBoundingClientRect();
    const frazione = (e.clientX - rett.left) / rett.width;
    const distanza = frazione * scala.dMax;
    let migliore = 0;
    punti.forEach((p, i) => {
      if (Math.abs(p.distanza_m - distanza) < Math.abs(punti[migliore].distanza_m - distanza)) migliore = i;
    });
    setIndice(migliore);
    onPuntoEvidenziato?.(punti[migliore]);
  };
  const esci = () => {
    setIndice(null);
    onPuntoEvidenziato?.(null);
  };

  const attivo = indice !== null ? punti[indice] : null;
  const ticksY = tacche(scala.qMin, scala.qMax, 4);
  const ticksX = tacche(0, scala.dMax, 3);

  return (
    <figure className="grafico-profilo">
      <svg
        viewBox={`0 0 ${L} ${H}`}
        role="img"
        aria-label={`Profilo altimetrico lungo ${formattaLunghezza(scala.dMax)}`}
        data-testid="grafico-profilo"
      >
        {ticksY.map((q) => (
          <g key={`y${q}`}>
            <line x1={M.sx} x2={L - M.dx} y1={scala.y(q)} y2={scala.y(q)} className="grafico-profilo__griglia" />
            <text x={M.sx - 4} y={scala.y(q) + 3} className="grafico-profilo__testo" textAnchor="end">
              {Math.round(q)}
            </text>
          </g>
        ))}
        {ticksX.map((d) => (
          <text key={`x${d}`} x={scala.x(d)} y={H - 8} className="grafico-profilo__testo" textAnchor="middle">
            {d >= 1000 ? `${(d / 1000).toLocaleString("it-IT")} km` : `${Math.round(d)} m`}
          </text>
        ))}
        {aree.map((d, i) => (
          <path key={`a${i}`} d={d} className="grafico-profilo__area" />
        ))}
        {percorsi.map((d, i) => (
          <path key={`p${i}`} d={d} className="grafico-profilo__linea" data-testid="tratto-profilo" />
        ))}
        {attivo && attivo.quota_m !== null && (
          <g>
            <line
              x1={scala.x(attivo.distanza_m)}
              x2={scala.x(attivo.distanza_m)}
              y1={M.su}
              y2={H - M.giu}
              className="grafico-profilo__cursore"
            />
            <circle cx={scala.x(attivo.distanza_m)} cy={scala.y(attivo.quota_m)} r={3.5} className="grafico-profilo__punto" />
          </g>
        )}
        <rect
          x={M.sx}
          y={M.su}
          width={L - M.sx - M.dx}
          height={H - M.su - M.giu}
          fill="transparent"
          onPointerMove={sposta}
          onPointerLeave={esci}
        />
      </svg>
      <figcaption className="grafico-profilo__didascalia" aria-live="polite">
        {attivo
          ? `${formattaLunghezza(attivo.distanza_m)} · ${attivo.quota_m === null ? "nessun dato" : formattaQuota(attivo.quota_m)}`
          : "Passa sul grafico per vedere il punto sulla mappa"}
      </figcaption>
    </figure>
  );
}
