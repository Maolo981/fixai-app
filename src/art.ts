/**
 * Procedural artwork for the invitation themes: brush strokes, leaves, watercolor washes, paper and wax.
 * Everything is plain SVG built from strings, so it runs on Workers and in the browser demo alike.
 */

export type P = [number, number];

export const r1 = (n: number) => Math.round(n * 10) / 10;
export const rad = (d: number) => (d * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
const pt = (p: P) => `${r1(p[0])} ${r1(p[1])}`;

/** Small deterministic PRNG (mulberry32), so the art is identical on every render. */
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const svgDoc = (w: number, h: number, body: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;

/** Compact data URI for CSS (single quotes inside, only the characters that must be escaped). */
export const dataUri = (svg: string) =>
  `url("data:image/svg+xml,${svg
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')}")`;

// ---------------------------------------------------------------------------
// Curves
// ---------------------------------------------------------------------------

export function cubic(a: P, b: P, c: P, d: P, n = 28): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
    ]);
  }
  return out;
}

export function quad(a: P, c: P, b: P, n = 24): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]);
  }
  return out;
}

/** Spiral from angle a0 (degrees), radius rStart to rEnd, over `turns` turns (negative = counter-clockwise). */
export function spiral(c: P, rStart: number, rEnd: number, a0: number, turns: number, n = 40): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = rad(a0 + 360 * turns * t);
    const r = rStart + (rEnd - rStart) * t;
    out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return out;
}

/** Points at regular arc length along a polyline. */
export function along(pts: P[], t: number): { p: P; angle: number } {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const target = Math.min(Math.max(t, 0), 1) * lens[lens.length - 1];
  let i = 1;
  while (i < pts.length - 1 && lens[i] < target) i++;
  const seg = lens[i] - lens[i - 1] || 1;
  const k = (target - lens[i - 1]) / seg;
  const a = pts[i - 1];
  const b = pts[i];
  return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], angle: deg(Math.atan2(b[1] - a[1], b[0] - a[0])) };
}

/** Smooth closed path through points (Catmull-Rom converted to cubic Béziers). */
export function smoothClosed(pts: P[]): string {
  const n = pts.length;
  let d = `M${pt(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + 'Z';
}

/**
 * Filled outline of a calligraphic stroke along `pts`; `w(t)` gives the width at t ∈ [0,1].
 * Returns path data (a closed polygon dense enough to look smooth).
 */
export function brush(pts: P[], w: (t: number) => number): string {
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const hw = w(i / (pts.length - 1)) / 2;
    left.push([pts[i][0] + nx * hw, pts[i][1] + ny * hw]);
    right.push([pts[i][0] - nx * hw, pts[i][1] - ny * hw]);
  }
  return 'M' + left.concat(right.reverse()).map(pt).join('L') + 'Z';
}

/** Width profiles. */
export const taper = (max: number, min = 0) => (t: number) => min + (max - min) * Math.sin(Math.PI * t);
export const taperEnd = (max: number, min = 0) => (t: number) => min + (max - min) * (1 - t) ** 0.8;
export const swell = (max: number, peak = 0.35) => (t: number) => max * (t < peak ? Math.sin((Math.PI / 2) * (t / peak)) : Math.cos((Math.PI / 2) * ((t - peak) / (1 - peak))) ** 0.7);

export const transform = (pts: P[], f: (p: P) => P) => pts.map(f);
export const mirrorX = (pts: P[], cx: number): P[] => pts.map(([x, y]) => [2 * cx - x, y]);

// ---------------------------------------------------------------------------
// Leaves
// ---------------------------------------------------------------------------

/** The two halves of a pointed leaf from (0,0) to (len,0), split by `gap` along the midrib. */
export function leafHalves(len: number, wid: number, gap = 0, belly = 0.32): [string, string] {
  const g = gap / 2;
  const half = (s: number) =>
    `M${r1(len * 0.04)} ${r1(s * g)}C${r1(len * belly)} ${r1(s * wid * 1.08)} ${r1(len * 0.72)} ${r1(s * wid * 0.92)} ${r1(len)} 0L${r1(len * 0.9)} ${r1(s * g)}Z`;
  return [half(-1), half(1)];
}

export const placeAt = (at: P, angle: number, body: string, scale = 1) =>
  `<g transform="translate(${pt(at)}) rotate(${r1(angle)})${scale !== 1 ? ` scale(${r1(scale * 100) / 100})` : ''}">${body}</g>`;

// ---------------------------------------------------------------------------
// Watercolor
// ---------------------------------------------------------------------------

/**
 * Watercolor look: wobbly edges (displacement), pigment granulation (noise in the alpha)
 * and darker rims where the pigment pools (eroded shape subtracted from itself).
 */
export function wcFilter(id: string, o: { seed?: number; disp?: number; freq?: number; rim?: number; grain?: number; alpha?: number } = {}): string {
  const { seed = 1, disp = 5, freq = 0.045, rim = 1.1, grain = 0.32, alpha = 0.74 } = o;
  return (
    `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="4" seed="${seed}" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="${disp}" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feMorphology in="d" operator="erode" radius="${rim}" result="e"/>` +
    `<feComposite in="d" in2="e" operator="out" result="r"/>` +
    `<feGaussianBlur in="r" stdDeviation="${r1(rim * 0.45)}" result="rb"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="${seed + 11}" result="g"/>` +
    `<feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${-grain * 2} ${1 + grain * 0.62}" result="ga"/>` +
    `<feComposite in="d" in2="ga" operator="in" result="gr"/>` +
    `<feComponentTransfer in="gr" result="f"><feFuncA type="linear" slope="${alpha}"/></feComponentTransfer>` +
    `<feMerge><feMergeNode in="f"/><feMergeNode in="rb"/></feMerge></filter>`
  );
}

/** Soft blur for paint blooms and highlights. */
export const blurFilter = (id: string, sd: number) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;

// ---------------------------------------------------------------------------
// Paper, linen, wax
// ---------------------------------------------------------------------------

/** Cotton paper: fine grain plus a faint cloudy formation. `light` for dark papers. */
export function paperGrain(o: { size?: number; amount?: number; cloud?: number; light?: boolean; seed?: number } = {}): string {
  const { size = 240, amount = 0.09, cloud = 0, light = false, seed = 3 } = o;
  const c = light ? '1 1 1' : '.18 .14 .08';
  const [r, g, b] = c.split(' ');
  return svgDoc(
    size,
    size,
    `${cloud ? `<rect width="${size}" height="${size}" filter="url(#c)"/>` : ''}<rect width="${size}" height="${size}" filter="url(#g)"/>`,
    `<filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="${seed}" stitchTiles="stitch"/>` +
      `<feColorMatrix values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${r1(amount * 30) / 10} 0 0 0 ${r1(-amount * 14) / 10}"/></filter>` +
      `<filter id="c" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="${seed + 5}" stitchTiles="stitch"/>` +
      `<feColorMatrix values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${r1(cloud * 40) / 10} 0 0 0 ${r1(-cloud * 18) / 10}"/></filter>`,
  );
}

/** Kraft paper: dark specks, short light and dark fibres and a faint mottle (for brown papers). */
export function kraftGrain(o: { size?: number; seed?: number } = {}): string {
  const { size = 240, seed = 5 } = o;
  // alpha = gain * noise + offset: only the peaks of the noise survive, as specks or (stretched) fibres
  const layer = (id: string, freq: string, oct: number, rgb: string, gain: number, offset: number, s: number) =>
    `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${s}" stitchTiles="stitch"/>` +
    `<feColorMatrix values="0 0 0 0 ${rgb.split(' ')[0]} 0 0 0 0 ${rgb.split(' ')[1]} 0 0 0 0 ${rgb.split(' ')[2]} ${gain} 0 0 0 ${offset}"/></filter>`;
  const rect = (id: string) => `<rect width="${size}" height="${size}" filter="url(#${id})"/>`;
  return svgDoc(
    size,
    size,
    rect('m') + rect('d') + rect('f') + rect('l') + rect('k'),
    layer('m', '.02', 3, '.25 .15 .05', 0.6, -0.26, seed) +
      layer('d', '.9', 2, '.2 .12 .04', 0.7, -0.3, seed + 1) +
      layer('f', '.07 .9', 2, '.3 .2 .08', 2, -1.16, seed + 2) +
      layer('l', '.9 .07', 2, '1 .97 .9', 2, -1.19, seed + 3) +
      layer('k', '.5', 1, '.12 .08 .03', 7, -4.6, seed + 4),
  );
}

/** Woven linen for the table the cards lie on (neutral, works on light and dark colours). */
export function linen(size = 200, seed = 9, strength = 1): string {
  const a = (n: number) => r1(n * strength * 100) / 100;
  const layer = (id: string, freq: string, rgb: string, alpha: number, s: number) =>
    `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${s}" stitchTiles="stitch"/>` +
    `<feColorMatrix values="0 0 0 0 ${rgb[0]} 0 0 0 0 ${rgb[1]} 0 0 0 0 ${rgb[2]} 0 0 0 ${a(alpha)} ${a(-alpha * 0.45)}"/></filter>`;
  return svgDoc(
    size,
    size,
    `<rect width="${size}" height="${size}" filter="url(#h)"/><rect width="${size}" height="${size}" filter="url(#v)"/><rect width="${size}" height="${size}" filter="url(#s)"/>`,
    layer('h', '.12 1.6', '000', 0.45, seed) + layer('v', '1.6 .12', '111', 0.35, seed + 1) + layer('s', '.8', '000', 0.2, seed + 2),
  );
}

/**
 * Marble: white stone with soft grey veins (contours of a stretched fractal noise) and fine grain.
 * Seamless tile, used as the paper texture of the marble theme.
 */
export function marble(o: { size?: number; seed?: number; vein?: string } = {}): string {
  const { size = 420, seed = 7, vein = '.38 .37 .36' } = o;
  const [r, g, b] = vein.split(' ');
  const veins = (id: string, freq: string, oct: number, table: string, blur: number, s: number) =>
    `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${s}" stitchTiles="stitch"/>` +
    `<feColorMatrix values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 1 0 0 0 0"/><feComponentTransfer><feFuncA type="table" tableValues="${table}"/></feComponentTransfer>` +
    `<feGaussianBlur stdDeviation="${blur}"/></filter>`;
  return svgDoc(
    size,
    size,
    `<rect width="${size}" height="${size}" filter="url(#a)"/><rect width="${size}" height="${size}" filter="url(#b)"/><rect width="${size}" height="${size}" filter="url(#g)"/>`,
    veins('a', '.004 .009', 5, '0 0 0 0 0 0 0 .05 .1 .05 0 0 0 0 0 0 0', 3, seed) +
      veins('b', '.005 .012', 6, '0 0 0 0 0 0 0 0 0 0 .32 0 0 0 0 0 0 0 0 0 0 0', 0.3, seed + 4) +
      `<filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="${seed + 9}" stitchTiles="stitch"/>` +
      `<feColorMatrix values="0 0 0 0 .2 0 0 0 0 .2 0 0 0 0 .2 .16 0 0 0 -.06"/></filter>`,
  );
}

export interface WaxColors {
  base: string;
  light: string;
  dark: string;
}

/** Wax seal: irregular poured blob, pressed disc with a bevelled rim and a beaded border. */
export function waxSeal(c: WaxColors, seed: number): string {
  const rand = rng(seed);
  const S = 120;
  const C: P = [60, 60];
  const R = 50;
  const ph = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  const drips = [0, 1, 2].map(() => ({ a: rand() * 6.28, w: 0.25 + rand() * 0.2, h: 0.05 + rand() * 0.06 }));
  const pts: P[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    let r = 1 + 0.03 * Math.sin(3 * a + ph[0]) + 0.022 * Math.sin(5 * a + ph[1]) + 0.014 * Math.sin(9 * a + ph[2]) + (rand() - 0.5) * 0.012;
    for (const d of drips) {
      const da = Math.atan2(Math.sin(a - d.a), Math.cos(a - d.a));
      r += d.h * Math.exp(-(da * da) / (2 * d.w * d.w * 0.25));
    }
    pts.push([C[0] + R * r * Math.cos(a), C[1] + R * r * Math.sin(a)]);
  }
  let beads = '';
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const x = C[0] + 36.5 * Math.cos(a);
    const y = C[1] + 36.5 * Math.sin(a);
    beads += `<circle cx="${r1(x + 0.5)}" cy="${r1(y + 0.6)}" r="1.25" fill="${c.dark}" opacity=".55"/><circle cx="${r1(x - 0.3)}" cy="${r1(y - 0.4)}" r="1.05" fill="${c.light}" opacity=".5"/>`;
  }
  const defs =
    `<radialGradient id="w" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="${c.light}"/><stop offset=".5" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>` +
    `<radialGradient id="d" cx="58%" cy="64%" r="70%"><stop offset="0" stop-color="${c.base}"/><stop offset=".7" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>` +
    blurFilter('b', 1.6) +
    blurFilter('b2', 0.7);
  const body =
    `<path d="${smoothClosed(pts)}" fill="url(#w)"/>` +
    `<circle cx="60" cy="60" r="40" fill="${c.dark}" opacity=".5" filter="url(#b2)" transform="translate(1.2 1.6)"/>` +
    `<circle cx="60" cy="60" r="40" fill="${c.light}" opacity=".45" filter="url(#b2)" transform="translate(-1 -1.2)"/>` +
    `<circle cx="60" cy="60" r="39.5" fill="url(#d)"/>` +
    `<circle cx="60" cy="60" r="33" fill="none" stroke="${c.dark}" stroke-opacity=".35" stroke-width="1"/>` +
    beads +
    `<ellipse cx="38" cy="30" rx="13" ry="6" fill="#fff" opacity=".22" filter="url(#b)" transform="rotate(-38 38 30)"/>` +
    `<ellipse cx="86" cy="94" rx="10" ry="4" fill="#fff" opacity=".08" filter="url(#b)" transform="rotate(-40 86 94)"/>`;
  return svgDoc(S, S, body, defs);
}
