/**
 * Configurazione di mappe di base e livelli della mappa.
 * Le fonti sono documentate in docs/piano-piattaforma-saas.md (§4).
 */

export type MappaBase = "satellite" | "stradale" | "topografica";

const BASEMAP_RL = "https://www.cartografia.servizirl.it/arcgis2/rest/services/BaseMap";

export const MAPPE_BASE: Record<
  MappaBase,
  { nome: string; descrizione: string; tiles?: string[]; attribuzione?: string; maxzoom?: number }
> = {
  satellite: {
    nome: "Satellite",
    descrizione: "Ortofoto AGEA 2015 di Regione Lombardia (25 cm). Fuori dalla Lombardia resta la mappa stradale.",
    tiles: [`${BASEMAP_RL}/ortofoto2015_extra_rl_wm/MapServer/tile/{z}/{y}/{x}`],
    attribuzione: "Ortofoto AGEA 2015 © Regione Lombardia",
    maxzoom: 19,
  },
  stradale: {
    nome: "Stradale",
    descrizione: "OpenStreetMap (OpenFreeMap).",
  },
  topografica: {
    nome: "Topografica",
    descrizione: "Carta Tecnica Regionale (DBT) di Regione Lombardia. Disponibile solo in Lombardia.",
    tiles: [
      `${BASEMAP_RL}/CTR_DBT_WM/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png&transparent=false&f=image`,
    ],
    attribuzione: "CTR/DBT © Regione Lombardia",
    maxzoom: 19,
  },
};

/** Livelli sovrapponibili, nell'ordine predefinito (dal più alto al più basso). */
export type IdLivello = "confine" | "curve" | "analisi";

export const NOMI_LIVELLI: Record<IdLivello, string> = {
  confine: "Confine area pilota",
  curve: "Curve di livello",
  analisi: "Analisi del lotto",
};

export const ORDINE_PREDEFINITO: IdLivello[] = ["confine", "curve", "analisi"];

/** Sposta un livello di una posizione (−1 = più in alto, +1 = più in basso). */
export function spostaLivello(ordine: IdLivello[], id: IdLivello, direzione: -1 | 1): IdLivello[] {
  const i = ordine.indexOf(id);
  const j = i + direzione;
  if (i < 0 || j < 0 || j >= ordine.length) return ordine;
  const nuovo = [...ordine];
  [nuovo[i], nuovo[j]] = [nuovo[j], nuovo[i]];
  return nuovo;
}

/** Livelli MapLibre che compongono ciascun livello logico (dal basso verso l'alto). */
export const LAYER_MAPLIBRE: Record<IdLivello, string[]> = {
  analisi: ["mappa-tematica"],
  curve: ["curve-alone", "curve-linee", "curve-etichette"],
  confine: ["maschera", "confine-area-pilota"],
};

/** Ordine di disegno dei layer MapLibre (dal basso verso l'alto) a partire dall'ordine logico. */
export function ordineDiDisegno(ordine: IdLivello[]): string[] {
  return [...ordine].reverse().flatMap((id) => LAYER_MAPLIBRE[id]);
}

const AZIMUT_SETTORI: Record<string, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SO: 225, O: 270, NO: 315 };

/**
 * Direzione della camera 3D (gradi da Nord) per vedere il pendio di profilo:
 * si guarda lungo le curve di livello, con la discesa alla sinistra della vista.
 * Per lotti pianeggianti si usa una vista obliqua standard.
 */
export function bearingDiProfilo(esposizionePrevalente: string | undefined | null): number {
  if (!esposizionePrevalente || !(esposizionePrevalente in AZIMUT_SETTORI)) return -20;
  const b = AZIMUT_SETTORI[esposizionePrevalente] + 90;
  return b > 180 ? b - 360 : b;
}
