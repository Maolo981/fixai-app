/**
 * Riconosce coordinate geografiche scritte nella barra di ricerca,
 * così l'utente può andare direttamente a un punto (es. letto da un GPS
 * o copiato da un'altra mappa) senza interrogare il servizio di geocodifica.
 *
 * Formati accettati (latitudine, longitudine in gradi decimali WGS84):
 *   "45.6983, 9.6773"   "45.6983 9.6773"   "45,6983; 9,6773"   "45,6983 9,6773"
 */

// Intervalli approssimati del territorio italiano, usati solo per
// riconoscere l'ordine inverso (longitudine, latitudine).
const LAT_ITALIA = [35, 47.5] as const;
const LON_ITALIA = [6, 19] as const;

function dentro(valore: number, [min, max]: readonly [number, number]) {
  return valore >= min && valore <= max;
}

export function interpretaCoordinate(testo: string): { lat: number; lon: number } | null {
  const pulito = testo.trim();
  let parti: string[];
  if (pulito.includes(";")) {
    // "45,6983; 9,6773": la virgola è il separatore decimale
    parti = pulito.split(";").map((p) => p.trim().replace(",", "."));
  } else if (/^-?\d+,\d+\s+-?\d+,\d+$/.test(pulito)) {
    // "45,6983 9,6773"
    parti = pulito.split(/\s+/).map((p) => p.replace(",", "."));
  } else {
    // "45.6983, 9.6773" oppure "45.6983 9.6773"
    parti = pulito.split(/[\s,]+/).filter(Boolean);
  }
  if (parti.length !== 2 || !parti.every((p) => /^-?\d+(\.\d+)?$/.test(p))) return null;

  let [lat, lon] = parti.map(Number);
  if (!dentro(lat, LAT_ITALIA) && dentro(lat, LON_ITALIA) && dentro(lon, LAT_ITALIA)) {
    [lat, lon] = [lon, lat];
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}
