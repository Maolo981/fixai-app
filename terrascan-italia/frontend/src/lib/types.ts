/** Tipi condivisi con l'API del backend (vedi backend/app/api/schemi.py). */

export interface GeoJsonPolygon {
  type: "Polygon";
  /** Anelli di coordinate [longitudine, latitudine] WGS84; il primo è il bordo esterno. */
  coordinates: number[][][];
}

export interface AnalisiGeometria {
  superficie: { m2: number; ettari: number; metodo: string };
  perimetro: { m: number; metodo: string };
  controllo_utm32: {
    epsg: number;
    descrizione: string;
    area_m2: number;
    perimetro_m: number;
    differenza_area_percentuale: number;
  };
  centroide: { lon: number; lat: number };
  bbox: [number, number, number, number];
  numero_vertici: number;
  area_pilota: { nome: string; stato: "interno" | "parziale" | "esterno" };
  altimetria: StatoAltimetria;
  avvertenze: string[];
  nota_legale: string;
}

export interface PuntoQuota {
  lon: number;
  lat: number;
  quota: number;
}

export interface StatoAltimetria {
  disponibile: boolean;
  messaggio: string;
  motivo?: string | null;
  quote?: {
    minima: number;
    massima: number;
    media: number;
    dislivello: number;
    punto_minimo: PuntoQuota;
    punto_massimo: PuntoQuota;
    nota: string;
  } | null;
  pendenza?: {
    media_percento: number;
    media_gradi: number;
    massima_percento: number;
    massima_gradi: number;
    classi: { da_percento: number; a_percento: number | null; percentuale_celle: number }[];
    metodo: string;
  } | null;
  esposizione?: {
    prevalente: string;
    settori: { settore: string; percentuale_celle: number }[];
    soglia_pianeggiante_percento: number;
    metodo: string;
  } | null;
  celle?: {
    interne: number;
    valide: number;
    con_pendenza: number;
    copertura_percento: number;
    dimensione_m: number;
  } | null;
  fonte?: {
    nome: string;
    edizione: string;
    proprietario: string;
    licenza: string;
    attribuzione: string;
    precisione_dichiarata: string;
  } | null;
  avvertenze?: string[];
}

export interface StatoFunzione {
  chiave: string;
  nome: string;
  stato: "implementata" | "non_disponibile";
  note: string;
}

export interface Capacita {
  fase: number;
  funzioni: StatoFunzione[];
  nota_legale: string;
}

export interface Localita {
  nome: string;
  lon: number;
  lat: number;
  bbox: [number, number, number, number] | null;
  tipo: string;
}

export interface RisultatoRicerca {
  query: string;
  risultati: Localita[];
  attribuzione: string;
}

/** Destinazione verso cui spostare la mappa. */
export type Destinazione =
  | { tipo: "punto"; lon: number; lat: number; zoom?: number }
  | { tipo: "riquadro"; bbox: [number, number, number, number] };

// ------------------------------------------------------------------ Fase 3

export interface GeoJsonLineString {
  type: "LineString";
  coordinates: number[][];
}

export type TipoMappa = "pendenza" | "esposizione";

export interface RispostaMappa {
  disponibile: boolean;
  messaggio: string;
  motivo?: string | null;
  tipo: TipoMappa;
  immagine_png_base64?: string | null;
  /** Angoli [lon, lat]: alto-sinistra, alto-destra, basso-destra, basso-sinistra */
  coordinate?: [number, number][] | null;
  larghezza?: number | null;
  altezza?: number | null;
  legenda: { etichetta: string; colore: string; percentuale_celle: number }[];
  celle_colorate: number;
  nota?: string | null;
  attribuzione?: string | null;
}

export interface PuntoProfilo {
  distanza_m: number;
  quota_m: number | null;
  lon: number;
  lat: number;
}

export interface RispostaProfilo {
  disponibile: boolean;
  messaggio: string;
  motivo?: string | null;
  punti: PuntoProfilo[];
  lunghezza_m?: number | null;
  lunghezza_inclinata_m?: number | null;
  quota_minima?: number | null;
  quota_massima?: number | null;
  quota_iniziale?: number | null;
  quota_finale?: number | null;
  salita_m?: number | null;
  discesa_m?: number | null;
  pendenza_media_percento?: number | null;
  pendenza_massima_percento?: number | null;
  copertura_percento?: number | null;
  passo_m?: number | null;
  metodo?: string | null;
  avvertenze: string[];
  attribuzione?: string | null;
  nota_legale: string;
}

/** Stato generico di una richiesta al backend. */
export type StatoRichiesta<T> =
  | { stato: "vuoto" }
  | { stato: "in_corso" }
  | { stato: "errore"; messaggio: string }
  | { stato: "completata"; risultato: T };
