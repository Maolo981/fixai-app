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
  RispostaMappa,
  RispostaProfilo,
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
