/** Formattazione dei numeri secondo le convenzioni italiane. */

function numero(valore: number, decimali: number): string {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
    // In italiano Intl non raggruppa i numeri di 4 cifre ("9115"):
    // nei documenti tecnici si scrive "9.115", quindi forziamo il separatore.
    useGrouping: "always",
  }).format(valore);
}

/** Superficie in metri quadrati, es. "12.345,68 m²". */
export function formattaMetriQuadri(m2: number): string {
  return `${numero(m2, m2 < 1000 ? 2 : 0)} m²`;
}

/** Superficie in ettari, es. "1,2346 ha". */
export function formattaEttari(ettari: number): string {
  return `${numero(ettari, 4)} ha`;
}

/**
 * Superficie nel formato catastale ettari / are / centiare
 * (1 ha = 100 are, 1 are = 100 centiare = 100 m²), es. "1 ha 23 are 46 ca".
 * Le centiare sono arrotondate al metro quadrato.
 */
export function formattaCatastale(m2: number): string {
  const totaleCentiare = Math.round(m2);
  const ettari = Math.floor(totaleCentiare / 10_000);
  const are = Math.floor((totaleCentiare % 10_000) / 100);
  const centiare = totaleCentiare % 100;
  return `${ettari} ha ${are} are ${centiare} ca`;
}

/** Lunghezza: metri sotto i 10 km, altrimenti chilometri. */
export function formattaLunghezza(m: number): string {
  if (m < 10_000) return `${numero(m, m < 100 ? 2 : 1)} m`;
  return `${numero(m / 1000, 3)} km`;
}

export function formattaPercentuale(valore: number, decimali = 3): string {
  const segno = valore > 0 ? "+" : "";
  return `${segno}${numero(valore, decimali)} %`;
}

/** Coordinata geografica in gradi decimali con 6 decimali (~10 cm). */
export function formattaCoordinate(lat: number, lon: number): string {
  return `${numero(lat, 6)} N, ${numero(lon, 6)} E`;
}

/** Quota o dislivello in metri con un decimale, es. "1.234,5 m". */
export function formattaQuota(m: number): string {
  return `${numero(m, 1)} m`;
}

/** Pendenza in percentuale e gradi, es. "12,0 % (6,8°)". */
export function formattaPendenza(percento: number, gradi: number): string {
  return `${numero(percento, 1)} % (${numero(gradi, 1)}°)`;
}

const NOMI_SETTORI: Record<string, string> = {
  N: "Nord",
  NE: "Nord-Est",
  E: "Est",
  SE: "Sud-Est",
  S: "Sud",
  SO: "Sud-Ovest",
  O: "Ovest",
  NO: "Nord-Ovest",
  Pianeggiante: "Pianeggiante",
};

/** Nome esteso di un settore di esposizione ("SO" -> "Sud-Ovest"). */
export function nomeSettore(sigla: string): string {
  return NOMI_SETTORI[sigla] ?? sigla;
}

/** Etichetta di una classe di pendenza, es. "10–15 %" oppure "oltre 50 %". */
export function etichettaClasse(da: number, a: number | null): string {
  return a === null ? `oltre ${numero(da, 0)} %` : `${numero(da, 0)}–${numero(a, 0)} %`;
}
