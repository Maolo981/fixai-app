/**
 * Client HTTP verso il backend FastAPI.
 *
 * Nessun valore viene mai calcolato o "inventato" lato client: se il backend
 * non risponde, viene sollevato un ErroreApi e l'interfaccia mostra l'errore.
 */
import type {
  AnalisiGeometria,
  Capacita,
  GeoJsonLineString,
  GeoJsonPolygon,
  RispostaCurve,
  RispostaMappa,
  RispostaProfilo,
  RispostaQuota,
  RisultatoRicerca,
  TipoMappa,
} from "./types";

const BASE_API: string = import.meta.env.VITE_API_BASE ?? "";
const TIMEOUT_MS = 15_000;

export class ErroreApi extends Error {
  constructor(
    message: string,
    public readonly codice: number | null,
  ) {
    super(message);
    this.name = "ErroreApi";
  }
}

async function richiesta<T>(percorso: string, init: RequestInit = {}, segnale?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signal = segnale ? AbortSignal.any([segnale, timeout]) : timeout;
  let risposta: Response;
  try {
    risposta = await fetch(`${BASE_API}${percorso}`, { ...init, signal });
  } catch (errore) {
    if (segnale?.aborted) throw errore; // richiesta annullata volutamente
    throw new ErroreApi(
      "Servizio di analisi non raggiungibile. Verifica che il backend sia avviato.",
      null,
    );
  }
  if (!risposta.ok) {
    let dettaglio = `Errore del servizio (codice ${risposta.status}).`;
    try {
      const corpo = await risposta.json();
      if (typeof corpo?.detail === "string") dettaglio = corpo.detail;
    } catch {
      /* corpo non JSON: si usa il messaggio generico */
    }
    throw new ErroreApi(dettaglio, risposta.status);
  }
  return (await risposta.json()) as T;
}

export function analizzaGeometria(geometria: GeoJsonPolygon, segnale?: AbortSignal) {
  return richiesta<AnalisiGeometria>(
    "/api/v1/analisi/geometria",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geometria }),
    },
    segnale,
  );
}

export function cercaLocalita(query: string, segnale?: AbortSignal) {
  return richiesta<RisultatoRicerca>(`/api/v1/ricerca?q=${encodeURIComponent(query)}`, {}, segnale);
}

export function caricaCapacita() {
  return richiesta<Capacita>("/api/v1/capacita");
}

export function caricaAreaPilota() {
  return richiesta<GeoJSON.FeatureCollection>("/api/v1/area-pilota");
}

function postJson<T>(percorso: string, corpo: unknown, segnale?: AbortSignal) {
  return richiesta<T>(
    percorso,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) },
    segnale,
  );
}

export function caricaMappaTematica(geometria: GeoJsonPolygon, tipo: TipoMappa, segnale?: AbortSignal) {
  return postJson<RispostaMappa>("/api/v1/analisi/mappa", { geometria, tipo }, segnale);
}

export function calcolaProfilo(geometria: GeoJsonLineString, segnale?: AbortSignal) {
  return postJson<RispostaProfilo>("/api/v1/analisi/profilo", { geometria }, segnale);
}

export function caricaCurve(geometria: GeoJsonPolygon, intervallo_m: number | null, segnale?: AbortSignal) {
  return postJson<RispostaCurve>("/api/v1/analisi/curve", { geometria, intervallo_m }, segnale);
}

export function caricaQuota(lon: number, lat: number, segnale?: AbortSignal) {
  return richiesta<RispostaQuota>(`/api/v1/quota?lon=${lon}&lat=${lat}`, {}, segnale);
}

export interface CampiReport {
  committente: string;
  riferimento: string;
  note: string;
}

/** Chiede al server il report PDF; restituisce il file e il nome suggerito. */
export async function scaricaReport(
  geometria: GeoJsonPolygon,
  linea: GeoJsonLineString | null,
  campi: CampiReport,
  segnale?: AbortSignal,
): Promise<{ file: Blob; nome: string }> {
  let risposta: Response;
  try {
    risposta = await fetch(`${BASE_API}/api/v1/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geometria, linea, campi }),
      signal: segnale ? AbortSignal.any([segnale, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000),
    });
  } catch (errore) {
    if (segnale?.aborted) throw errore;
    throw new ErroreApi("Servizio non raggiungibile: impossibile generare il report.", null);
  }
  if (!risposta.ok) {
    let dettaglio = `Errore nella generazione del report (codice ${risposta.status}).`;
    try {
      const corpo = await risposta.json();
      if (typeof corpo?.detail === "string") dettaglio = corpo.detail;
    } catch {
      /* risposta non JSON */
    }
    throw new ErroreApi(dettaglio, risposta.status);
  }
  const nome =
    /filename="([^"]+)"/.exec(risposta.headers.get("Content-Disposition") ?? "")?.[1] ?? "terrascan-report.pdf";
  return { file: await risposta.blob(), nome };
}

/** Fa scaricare al browser un file generato. */
export function salvaFile(file: Blob, nome: string) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
