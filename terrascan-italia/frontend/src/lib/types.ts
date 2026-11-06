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
  altimetria: { disponibile: boolean; messaggio: string };
  avvertenze: string[];
  nota_legale: string;
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
