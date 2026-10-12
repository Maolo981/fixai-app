/**
 * Watercolor artwork of the themes (paintings shown with multiply blending over the paper).
 */
import { type P, along, blurFilter, brush, cubic, placeAt, quad, r1, rng, spiral, svgDoc, taper, taperEnd } from './art';
import { Batch, type Pair, bentStem, bow, ellipseD, go, mirrorHalf, paintLeaf, paintSprig, paintStem, petalAt, petalD, pick, wcSet } from './paint';


export const OLIVE: Pair[] = [
  ['#9aa97b', '#7d8d5e'],
  ['#a9b78c', '#8a9a6b'],
  ['#8c9c6c', '#6f7f52'],
  ['#b4bf98', '#93a278'],
];

export function olivePainting(): string {
  const defs = wcSet(4, { seed: 3, alpha: 0.78 });
  const half = (seed: number) => {
    const stem = cubic([-14, 64], [36, 20], [100, 6], [170, 18], 48);
    let s = paintSprig({ stem, leaves: 17, len: 40, wid: 0.16, spread: [28, 52], colors: OLIVE, stemColor: '#8a7a58', stemWidth: 3.2, seed, tip: true, belly: 0.36 });
    for (const [t, dy] of [[0.42, 10], [0.66, 9], [0.56, 13]] as const) {
      const { p, angle } = along(stem, t);
      s += placeAt([p[0] + 1, p[1] + dy], angle + 74, `<ellipse cx="5" cy="0" rx="6.6" ry="4.4" fill="#59613a" filter="url(#w2)"/><ellipse cx="3.6" cy="-1.4" rx="1.8" ry="1" fill="#fff" opacity=".4"/>`);
    }
    return s;
  };
  return svgDoc(360, 120, half(4) + `<g transform="translate(360 0) scale(-1 1)">${half(9)}</g>`, defs);
}

export function oliveSmall(): string {
  const defs = wcSet(4, { seed: 5, alpha: 0.78 });
  const half = (seed: number) => {
    const stem = cubic([100, 34], [80, 30], [50, 26], [8, 28], 30);
    return paintSprig({ stem, leaves: 9, len: 24, wid: 0.17, spread: [30, 48], colors: OLIVE, stemColor: '#8a7a58', stemWidth: 2.2, seed, tip: true, belly: 0.36 });
  };
  return svgDoc(200, 56, mirrorHalf(half(2)) + `<ellipse cx="100" cy="38" rx="5" ry="3.6" fill="#59613a" filter="url(#w2)"/>`, defs);
}

export const LEMON = 'M-24 0C-24-13-10-18 4-17C16-16 24-9 26-3L30 0L26 3C24 9 16 16 4 17C-10 18-24 13-24 0Z';
export const LEMON_SHADE = 'M-23 3C-20 12-8 17 4 16C15 15 22 9 26 2L29 0L26-1C21 6 12 10 2 10C-8 10-17 8-23 3Z';
export const LEMON_GLOW = 'M-14-8C-8-13 2-14 10-12';
export const LEAF_GREEN: Pair[] = [
  ['#5f8a45', '#46703a'],
  ['#6f9a52', '#557f40'],
  ['#4f7a3a', '#3c6330'],
  ['#7aa35a', '#5d8744'],
];

export function lemon(at: P, rot: number, s: number): string {
  return placeAt(
    at,
    rot,
    `<g filter="url(#w4)"><path d="${LEMON}" fill="#f7d65e"/></g><g filter="url(#b)"><path d="${LEMON_SHADE}" fill="#e2a62c" opacity=".62"/></g><path d="${LEMON_GLOW}" stroke="#fff6c8" stroke-width="4" stroke-linecap="round" fill="none" opacity=".55" filter="url(#b)"/><circle cx="-23" cy="0" r="2.2" fill="#7f8a3a" filter="url(#w0)"/>`,
    s,
  );
}

export function lemonPainting(): string {
  const defs = wcSet(5, { seed: 11, alpha: 0.8 }) + blurFilter('b', 2.2);
  const half = (seed: number, flip: boolean) => {
    const stem = cubic([-12, 18], [40, 4], [100, 10], [168, 30], 44);
    let s = paintSprig({ stem, leaves: 13, len: 36, wid: 0.3, spread: [36, 62], colors: LEAF_GREEN, stemColor: '#7a6a4a', stemWidth: 3, seed, tip: true, belly: 0.3 });
    const fruits: [number, number, number][] = flip ? [[0.3, 100, 1.05], [0.66, 76, 0.86]] : [[0.36, 94, 1], [0.7, 82, 0.8]];
    for (const [t, r, k] of fruits) {
      const { p } = along(stem, t);
      s += lemon([p[0] + 2, p[1] + 30 * k], r, k);
      s += paintLeaf([p[0] - 2, p[1] + 2], 120, 26, 8, LEAF_GREEN[1], 'w3', 0.7, 0.3);
    }
    return s;
  };
  return svgDoc(360, 130, half(2, false) + `<g transform="translate(360 0) scale(-1 1)">${half(7, true)}</g>`, defs);
}

export function lemonSmall(): string {
  const defs = wcSet(5, { seed: 13, alpha: 0.8 }) + blurFilter('b', 2);
  const stem = cubic([60, 8], [80, 6], [100, 8], [130, 14], 20);
  let s = paintSprig({ stem, leaves: 5, len: 26, wid: 0.3, spread: [40, 60], colors: LEAF_GREEN, stemColor: '#7a6a4a', stemWidth: 2.2, seed: 4, tip: true, belly: 0.3 });
  s += lemon([98, 40], 96, 0.85);
  return svgDoc(200, 74, s, defs);
}

export const ROSE = { light: '#f4cbc6', mid: '#e7a5a0', dark: '#c7737b', deep: '#a9555f' };
export const SAGE: Pair[] = [
  ['#a7b596', '#8c9c7b'],
  ['#b9c5a9', '#9caf8c'],
  ['#9aab8a', '#7f9170'],
];

export const BORDEAUX = { light: '#c8646e', mid: '#a5303f', dark: '#7a1426', deep: '#4f0915' };
export const DEEP_GREEN: Pair[] = [
  ['#61795a', '#4b6245'],
  ['#6e8a62', '#55704c'],
  ['#57704f', '#43593d'],
];
export const PEONY = { light: '#fcd3c3', mid: '#f7a58c', dark: '#ea7a6e', deep: '#c94f58' };
export const PEONY_LEAVES: Pair[] = [
  ['#8fa47e', '#73896a'],
  ['#9db28b', '#819775'],
  ['#839a73', '#6a8160'],
];

export interface BloomPalette {
  light: string;
  mid: string;
  dark: string;
  deep: string;
}

/** Watercolor rose: a light disc and petals painted as a spiral of curved strokes. */
export function rose(c: P, R: number, rand: () => number, pal: BloomPalette = ROSE, petals = 9): string {
  let s = `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(R)}" fill="${pal.light}" filter="url(#w1)"/>`;
  let a = rand() * 360;
  for (let k = 0; k < petals; k++) {
    const rr = R * (0.86 - k * (0.765 / petals));
    const arc = spiral(c, rr, rr * 0.9, a, 0.24 + rand() * 0.12, 14);
    const col = k < petals / 3 ? pal.mid : k < (2 * petals) / 3 ? pal.dark : pal.deep;
    s += `<path d="${brush(arc, taper(R * (0.2 - k * (0.108 / petals)), R * 0.03))}" fill="${col}" opacity="${r1(0.62 + k * (0.36 / petals))}" filter="url(#w${2 + (k % 3)})"/>`;
    a += 137.5;
  }
  return s + `<circle cx="${r1(c[0] + R * 0.06)}" cy="${r1(c[1] - R * 0.04)}" r="${r1(R * 0.12)}" fill="${pal.deep}" filter="url(#w3)"/>`;
}

/** Peony: a ruffled ring of cupped outer petals around a rose-like heart. */
export function peony(c: P, R: number, rand: () => number, pal: BloomPalette): string {
  let s = '';
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i * 360) / n + rand() * 18;
    const d = R * (0.5 + rand() * 0.1);
    const x = r1(c[0] + Math.cos((a * Math.PI) / 180) * d);
    const y = r1(c[1] + Math.sin((a * Math.PI) / 180) * d);
    s += `<ellipse cx="${x}" cy="${y}" rx="${r1(R * 0.56)}" ry="${r1(R * 0.4)}" transform="rotate(${r1(a)} ${x} ${y})" fill="${i % 2 ? pal.light : pal.mid}" opacity=".9" filter="url(#w${1 + (i % 3)})"/>`;
  }
  return s + rose(c, R * 0.78, rand, pal, 12);
}

export function rosebud(c: P, angle: number, s: number, pal: BloomPalette = ROSE, leaf = '#9caf8c'): string {
  return placeAt(
    c,
    angle,
    `<g filter="url(#w2)"><path d="M0 0C-6-4-6-14 0-20C6-14 6-4 0 0Z" fill="${pal.mid}"/></g><g filter="url(#w3)"><path d="M0 0C-3-6-2-12 1-18C3-10 3-5 0 0Z" fill="${pal.dark}"/></g><g filter="url(#w1)"><path d="M0 0C-7 2-9-6-6-10C-4-5-2-2 0 0ZM0 0C7 2 9-6 6-10C4-5 2-2 0 0Z" fill="${leaf}"/></g>`,
    s,
  );
}

export interface ClusterStyle {
  pal: BloomPalette;
  leaves: Pair[];
  stemColor: string;
  /** peonies instead of roses */
  peonies?: boolean;
}

const ROSE_STYLE: ClusterStyle = { pal: ROSE, leaves: SAGE, stemColor: '#8c9c7b' };

export function roseCluster(seed: number, st: ClusterStyle = ROSE_STYLE): string {
  const rand = rng(seed);
  let s = '';
  const stems: P[][] = [cubic([-6, 30], [30, 30], [70, 44], [118, 40], 30), cubic([10, -6], [20, 30], [40, 60], [46, 104], 30), cubic([30, 10], [70, 0], [110, 4], [150, 16], 30)];
  stems.forEach((stem, i) => {
    s += paintSprig({ stem, leaves: 7 + i, len: 24, wid: 0.36, spread: [38, 64], colors: st.leaves, stemColor: st.stemColor, stemWidth: 1.6, seed: seed + i, tip: true, belly: 0.3 });
  });
  if (st.peonies) s += peony([30, 28], 44, rand, st.pal) + peony([96, 22], 24, rand, st.pal) + rose([36, 92], 13, rand, st.pal, 10);
  else s += rose([26, 24], 30, rand, st.pal) + rose([74, 26], 20, rand, st.pal) + rose([30, 70], 15, rand, st.pal);
  s += rosebud([110, 38], 70, 0.9, st.pal, st.leaves[0][1]) + rosebud([52, 96], 160, 0.8, st.pal, st.leaves[0][1]);
  for (let i = 0; i < 9; i++) s += `<circle cx="${r1(90 + rand() * 50)}" cy="${r1(46 + rand() * 30)}" r="${r1(1.6 + rand() * 1.4)}" fill="${st.pal.mid}" opacity=".7" filter="url(#w2)"/>`;
  return s;
}

export function rosePainting(st: ClusterStyle = ROSE_STYLE, seeds: [number, number] = [3, 8]): string {
  const defs = wcSet(5, { seed: 17, alpha: 0.8 });
  return svgDoc(360, 150, roseCluster(seeds[0], st) + `<g transform="translate(360 0) scale(-1 1)">${roseCluster(seeds[1], st)}</g>`, defs);
}

export function roseSmall(st: ClusterStyle = ROSE_STYLE): string {
  const defs = wcSet(5, { seed: 19, alpha: 0.8 });
  const rand = rng(5);
  let s = '';
  for (const m of [1, -1]) {
    const stem = cubic([100, 34], [80, 30], [60, 32], [30, 26], 20).map(([x, y]) => [m > 0 ? x : 200 - x, y] as P);
    s += paintSprig({ stem, leaves: 6, len: 20, wid: 0.36, spread: [38, 60], colors: st.leaves, stemColor: st.stemColor, stemWidth: 1.4, seed: 7 + m, tip: true, belly: 0.3 });
  }
  s += st.peonies ? peony([100, 32], 17, rand, st.pal) : rose([100, 32], 15, rand, st.pal);
  return svgDoc(200, 64, s, defs);
}

export function cloud(x: number, y: number, k: number, fill: string, f: string): string {
  const bumps: [number, number, number][] = [[0, 0, 13], [15, -9, 16], [33, -4, 13], [46, 2, 10], [24, 5, 12], [-11, 4, 9], [8, 6, 11]];
  return `<g filter="url(#${f})">${bumps.map(([bx, by, br]) => `<circle cx="${r1(x + bx * k)}" cy="${r1(y + by * k)}" r="${r1(br * k)}" fill="${fill}"/>`).join('')}</g>`;
}

export function cloudPainting(): string {
  const defs = wcSet(3, { seed: 29, alpha: 0.62, rim: 0.9, disp: 7, freq: 0.035 }) + blurFilter('b', 1.2);
  let s = '';
  for (const [x, y, k, c1, c2] of [
    [26, 60, 1.5, '#c9d9eb', '#9fb8d8'],
    [196, 44, 1.2, '#d0dfef', '#a7bfdd'],
    [118, 104, 0.85, '#d8e5f2', '#b2c7e2'],
    [300, 104, 0.9, '#d2e0ef', '#a9c0dd'],
  ] as const) {
    // shadowed underside first, then the lit body slightly higher
    s += cloud(x + 1, y + 5 * k, k, c2, 'w1') + cloud(x, y, k * 0.93, c1, 'w0');
    s += `<g filter="url(#b)" opacity=".55">${cloud(x - 2 * k, y - 4 * k, k * 0.6, '#ffffff', 'w2')}</g>`;
  }
  return svgDoc(360, 150, s, defs);
}

/** Red ribbon tied under the laurel crest, same frame as the wreath. */
export function ribbonPainting(): string {
  const defs = wcSet(3, { seed: 23, alpha: 0.86 });
  const red = '#a3252b';
  const dark = '#7c171c';
  const s =
    `<g filter="url(#w0)"><path d="M100 178C88 166 70 164 68 172C66 182 86 186 100 180Z" fill="${red}"/><path d="M100 178C112 166 130 164 132 172C134 182 114 186 100 180Z" fill="${red}"/></g>` +
    `<g filter="url(#w1)"><path d="M97 181L84 199L90 197L93 203L101 183Z" fill="${dark}"/><path d="M103 181L116 199L110 197L107 203L99 183Z" fill="${dark}"/></g>` +
    `<g filter="url(#w2)"><ellipse cx="100" cy="179" rx="5.5" ry="4.6" fill="${dark}"/></g>`;
  return svgDoc(200, 200, s, defs);
}


/** White lace border with a soft shadow (painted with normal blending), 360×90. */
export function lacePainting(lace: string): string {
  const defs = `<filter id="sh" x="-5%" y="-20%" width="110%" height="160%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.1" flood-color="#7a4048" flood-opacity=".28"/></filter>`;
  // the foil drawing is a plain SVG of black shapes: recolour it white and lift it with a shadow
  const body = lace.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return svgDoc(360, 90, `<g fill="#fffdfc" filter="url(#sh)">${body}</g>`, defs);
}

// ---------------------------------------------------------------------------
// Flowers (second collection)
// ---------------------------------------------------------------------------

/** Two bundles tied in the middle of the top edge, stems fanning towards the corners. */
function tiedGarland(sprig: (base: P, angle: number, len: number, rand: () => number) => string, seed: number, bowColors: [string, string]): string {
  let s = '';
  for (const m of [1, -1]) {
    const k = rng(seed + (m > 0 ? 1 : 7));
    for (let i = 0; i < 6; i++) {
      const angle = m > 0 ? 146 + i * 8 + k() * 4 : 34 - i * 8 - k() * 4;
      s += sprig([180 + m * 8, 34 + i * 1.5], angle, 162 + k() * 26 - i * 7, k);
    }
  }
  return s + bow([180, 36], 15, bowColors[0], bowColors[1]);
}

// ---------- lavender ----------

const LAVENDER = ['#9a86c8', '#8670bb', '#b4a2dc', '#7b64ae', '#a593d2'];
const LAV_LEAF: Pair[] = [
  ['#a6b59b', '#8d9d82'],
  ['#b3c0a8', '#98a78d'],
];

function lavenderSprig(base: P, angle: number, len: number, rand: () => number): string {
  const stem = bentStem(base, angle, len, (rand() - 0.5) * len * 0.1);
  let s = paintStem(stem, 1.7, '#87977a', 'w0');
  for (const [t, side] of [[0.1, 1], [0.18, -1], [0.27, 1]] as const) {
    const { p, angle: an } = along(stem, t);
    s += paintLeaf(p, an + side * 20, len * 0.2, 2.1, pick(LAV_LEAF, rand), 'w1', 0.4, 0.4);
  }
  const buds = new Batch();
  const n = 24;
  for (let i = 0; i < n; i++) {
    const t = 0.48 + 0.52 * (i / (n - 1));
    const { p, angle: an } = along(stem, t);
    const side = i % 2 ? 1 : -1;
    // whorls of buds, tighter and smaller towards the tip
    const k = (1 - 0.45 * (i / n)) * (i % 4 < 2 ? 1 : 0.85);
    buds.add(pick(LAVENDER, rand), `w${2 + (i % 3)}`, ellipseD(go(p, an + 90 * side, 2.1 * k), 4.4 * k, 2.7 * k, an + side * 32));
  }
  return s + buds;
}

export function lavenderPainting(): string {
  return svgDoc(360, 150, tiedGarland(lavenderSprig, 41, ['#b7a6dc', '#8670bb']), wcSet(5, { seed: 43, alpha: 0.82 }));
}

export function lavenderSmall(): string {
  const rand = rng(9);
  let s = '';
  for (const [x, a] of [[100, 200], [100, 340], [100, 190], [100, 350]] as const) s += lavenderSprig([x, 40], a, 80 + rand() * 10, rand);
  return svgDoc(200, 64, s + bow([100, 40], 9, '#b7a6dc', '#8670bb'), wcSet(5, { seed: 47, alpha: 0.82 }));
}

// ---------- sunflowers ----------

function sunflower(c: P, R: number, rand: () => number): string {
  let s = '';
  for (const [n, len, off, cols] of [
    [18, 1.05, 0, ['#eab226', '#de9a18']],
    [18, 0.95, 10, ['#f6cf45', '#efbe30']],
  ] as const) {
    for (let i = 0; i < n; i++) {
      const a = (i * 360) / n + off + (rand() - 0.5) * 6;
      s += petalAt(go(c, a, R * 0.34), a, R * len * 0.72, R * 0.13, pick([...cols], rand), `w${1 + (i % 3)}`);
    }
  }
  s += `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(R * 0.4)}" fill="#6b4720" filter="url(#w0)"/>`;
  s += `<circle cx="${r1(c[0] + R * 0.04)}" cy="${r1(c[1] + R * 0.05)}" r="${r1(R * 0.28)}" fill="#47300f" filter="url(#w4)"/>`;
  for (let i = 0; i < 34; i++) {
    const a = i * 137.5;
    const d = R * 0.37 * Math.sqrt(i / 34);
    const p = go(c, a, d);
    s += `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r1(R * 0.035)}" fill="#a77a35" opacity=".8"/>`;
  }
  return s;
}

const SUN_LEAF: Pair[] = [
  ['#86a457', '#6a8a42'],
  ['#7a9a4c', '#5f7f3a'],
];

function sunflowerCluster(seed: number): string {
  const rand = rng(seed);
  let s = '';
  s += paintStem(cubic([60, 70], [70, 90], [76, 110], [80, 140], 20), 3, '#6a8a42', 'w0');
  for (const [x, y, a, l] of [[58, 70, 120, 44], [86, 54, 30, 40], [20, 92, 100, 36], [118, 36, 10, 30]] as const)
    s += paintLeaf([x, y], a, l, l * 0.42, pick(SUN_LEAF, rand), `w${1 + Math.floor(rand() * 3)}`, 0.8, 0.42);
  s += sunflower([30, 36], 36, rand) + sunflower([102, 16], 20, rand);
  // closed bud
  const b: P = [140, 50];
  for (let i = 0; i < 10; i++) s += petalAt(b, i * 36, 8, 3, i % 2 ? '#86a457' : '#eab226', 'w2');
  return s;
}

export function sunflowerPainting(): string {
  return svgDoc(360, 150, sunflowerCluster(5) + `<g transform="translate(360 0) scale(-1 1)">${sunflowerCluster(11)}</g>`, wcSet(5, { seed: 51, alpha: 0.85 }));
}

export function sunflowerSmall(): string {
  const rand = rng(3);
  let s = '';
  for (const m of [1, -1]) s += paintLeaf([100 - m * 12, 36], m > 0 ? 200 : 340, 34, 13, SUN_LEAF[0], 'w1', 0.8, 0.42);
  s += sunflower([100, 34], 22, rand);
  return svgDoc(200, 70, s, wcSet(5, { seed: 53, alpha: 0.85 }));
}

// ---------- wildflowers (meadow along the bottom) ----------

function daisy(c: P, r: number, rand: () => number): string {
  let s = '';
  for (let i = 0; i < 14; i++) {
    const a = i * (360 / 14) + rand() * 6;
    s += petalAt(go(c, a, r * 0.2), a, r, r * 0.17, i % 3 ? '#f6f2e8' : '#e6e1d2', `w${1 + (i % 3)}`);
  }
  return s + `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r * 0.3)}" fill="#efb92c" filter="url(#w0)"/><circle cx="${r1(c[0] + r * 0.08)}" cy="${r1(c[1] + r * 0.08)}" r="${r1(r * 0.17)}" fill="#d4911a" filter="url(#w4)"/>`;
}

function cornflower(c: P, r: number, rand: () => number): string {
  let s = '';
  for (let i = 0; i < 10; i++) {
    const a = i * 36 + rand() * 10;
    s += petalAt(go(c, a, r * 0.2), a, r, r * 0.34, pick(['#4c6fd1', '#3c5cbb', '#6a8ae0'], rand), `w${1 + (i % 3)}`, true);
  }
  return s + `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r * 0.24)}" fill="#2b3b84" filter="url(#w0)"/>`;
}

function poppy(c: P, r: number, rand: () => number): string {
  let s = '';
  for (let i = 0; i < 4; i++) {
    const a = i * 90 + 20 + rand() * 20;
    const at = go(c, a, r * 0.38);
    s += `<ellipse cx="${r1(at[0])}" cy="${r1(at[1])}" rx="${r1(r * 0.62)}" ry="${r1(r * 0.5)}" transform="rotate(${r1(a)} ${r1(at[0])} ${r1(at[1])})" fill="${i % 2 ? '#e2452e' : '#cf3622'}" filter="url(#w${1 + i % 3})"/>`;
  }
  s += `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r * 0.2)}" fill="#2a2a22" filter="url(#w0)"/>`;
  for (let i = 0; i < 8; i++) {
    const p = go(c, i * 45, r * 0.3);
    s += `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r1(r * 0.05)}" fill="#2a2a22"/>`;
  }
  return s;
}

export function meadowPainting(): string {
  const rand = rng(61);
  let s = '';
  // grass
  for (let i = 0; i < 70; i++) {
    const x = rand() * 370 - 5;
    const h = 22 + rand() * 46;
    const lean = (rand() - 0.5) * 26;
    s += `<path d="${brush(quad([x, 132], [x + lean * 0.3, 132 - h * 0.6], [x + lean, 132 - h], 10), taperEnd(2.4, 0.2))}" fill="${pick(['#7f9a5a', '#93ab6b', '#6b8a4c', '#a3b77e'], rand)}" filter="url(#w${i % 3})"/>`;
  }
  const flowers: [number, number, 'd' | 'c' | 'p', number][] = [
    [18, 62, 'p', 13], [52, 84, 'd', 11], [86, 56, 'c', 9], [118, 92, 'd', 9], [150, 76, 'p', 10], [214, 84, 'c', 8], [246, 60, 'd', 12], [280, 90, 'p', 9], [310, 66, 'c', 10], [342, 82, 'd', 10], [196, 98, 'd', 7], [70, 102, 'c', 7],
  ];
  for (const [x, y, k, r] of flowers) {
    s += paintStem(quad([x + 2, 134], [x + (rand() - 0.5) * 10, (y + 134) / 2], [x, y + r * 0.4], 12), 1.4, '#6b8a4c', 'w0');
    if (rand() > 0.4) s += paintLeaf([x + 1, (y + 134) / 2 + 8], rand() > 0.5 ? -60 : 240, 14, 3, ['#93ab6b', '#7f9a5a'], 'w1', 0.4, 0.4);
    s += k === 'd' ? daisy([x, y], r, rand) : k === 'c' ? cornflower([x, y], r, rand) : poppy([x, y], r, rand);
  }
  return svgDoc(360, 132, s, wcSet(5, { seed: 63, alpha: 0.86 }));
}

export function meadowSmall(): string {
  const rand = rng(65);
  let s = '';
  for (const [x, y, a] of [[100, 60, -90], [100, 60, -120], [100, 60, -62]] as const) {
    const end = go([x, y], a, 36);
    s += paintStem([[x, y], end], 1.3, '#6b8a4c', 'w0');
  }
  s += daisy(go([100, 60], -90, 38), 11, rand) + poppy(go([100, 60], -122, 36), 10, rand) + cornflower(go([100, 60], -60, 36), 9, rand);
  return svgDoc(200, 66, s, wcSet(5, { seed: 67, alpha: 0.86 }));
}

// ---------- hydrangeas ----------

/** Floret colours from light to dark. */
const HYD_BLUE = ['#d3dcf4', '#bccaee', '#a9b8e8', '#97a8e0', '#8794d0', '#7280c2'];
const HYD_LILAC = ['#ddd2f2', '#c8b8ea', '#b7a6e0', '#a996dc', '#9b8bd4', '#8775c4'];

/** A domed head of four-petal florets: lit from the top left, shaded at the bottom right. */
function hydrangea(c: P, R: number, rand: () => number, lilac = 0.35): string {
  let s = `<ellipse cx="${r1(c[0] + R * 0.05)}" cy="${r1(c[1] + R * 0.06)}" rx="${r1(R * 0.8)}" ry="${r1(R * 0.74)}" fill="#b4c0e6" filter="url(#b0)" opacity=".55"/>`;
  const florets: P[] = [];
  for (let i = 0; i < 900 && florets.length < Math.round(R * 1.7); i++) {
    const p = go(c, rand() * 360, R * Math.sqrt(rand()) * 0.9);
    if (florets.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > R * 0.12)) florets.push(p);
  }
  const petals = new Batch();
  const eyes = new Batch();
  for (const [i, f] of florets.entries()) {
    const r = R * (0.13 + rand() * 0.04);
    const rot = rand() * 90;
    const shade = ((f[0] - c[0]) * 0.45 + (f[1] - c[1]) * 0.9) / R; // -1 lit … +1 shaded
    const pal = rand() < lilac ? HYD_LILAC : HYD_BLUE;
    const col = pal[Math.max(0, Math.min(pal.length - 1, Math.round((shade + 1) * 2.2 + (rand() - 0.5) * 1.6)))];
    let d = '';
    for (let k = 0; k < 4; k++) d += petalD(f, rot + k * 90, r, r * 0.66);
    petals.add(col, `w${1 + (i % 3)}`, d);
    eyes.add('#5a62a0', '', ellipseD(f, r * 0.17, r * 0.17));
  }
  return s + petals + eyes;
}

const HYD_LEAF: Pair[] = [
  ['#7fa07e', '#638562'],
  ['#8aab86', '#6f906b'],
  ['#97b48f', '#7a9a73'],
];

/** Leaves tucked under a head, pointing outwards at the given angles. */
const hydLeaves = (c: P, R: number, angles: number[], rand: () => number) =>
  angles.map((a, i) => paintLeaf(go(c, a, R * 0.55), a + (rand() - 0.5) * 16, R * (0.95 + rand() * 0.25) - i * 3, R * 0.36, pick(HYD_LEAF, rand), `w${1 + Math.floor(rand() * 3)}`, 0.8, 0.42)).join('');

export function hydrangeaPainting(): string {
  const rand = rng(71);
  const A: P = [36, 26];
  const B: P = [108, 14];
  const C: P = [328, 24];
  const s =
    hydLeaves(A, 50, [40, 92], rand) +
    hydLeaves(B, 26, [60, 18], rand) +
    hydLeaves(C, 46, [142, 92, 200], rand) +
    hydrangea(A, 50, rand, 0.25) +
    hydrangea(B, 26, rand, 0.7) +
    hydrangea(C, 46, rand, 0.4);
  return svgDoc(360, 150, s, wcSet(5, { seed: 73, alpha: 0.82 }) + blurFilter('b0', 4));
}

export function hydrangeaSmall(): string {
  const rand = rng(75);
  const c: P = [100, 34];
  return svgDoc(200, 70, hydLeaves(c, 24, [160, 20], rand) + hydrangea(c, 24, rand, 0.4), wcSet(5, { seed: 77, alpha: 0.82 }) + blurFilter('b0', 3));
}

// ---------- wisteria ----------

function raceme(top: P, len: number, drift: number, rand: () => number, out: Batch): void {
  const axis = quad(top, [top[0] + drift * 0.3, top[1] + len * 0.5], [top[0] + drift, top[1] + len], 20);
  const n = Math.round(len / 3.8);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const { p } = along(axis, t);
    const size = 6.6 * (1 - 0.66 * t);
    const col = t < 0.3 ? pick(['#7d5fb0', '#8b6dbc'], rand) : t < 0.72 ? pick(['#9f86cc', '#ab94d4', '#9479c4'], rand) : pick(['#c7b6e6', '#d5c8ee', '#b9a6dd'], rand);
    const f = `w${2 + (i % 3)}`;
    for (const side of [-1, 1]) out.add(col, f, ellipseD([p[0] + side * size * (0.6 + rand() * 0.3), p[1] + (rand() - 0.5) * 2], size * 0.62, size * 0.48, side * 25 + (rand() - 0.5) * 30));
    if (t < 0.45 && i % 2) out.add(col, f, ellipseD([p[0], p[1] + 1], size * 0.5, size * 0.42));
    if (t > 0.88) out.add('#a9bf8c', 'w1', ellipseD([p[0], p[1] + 3], 1.6, 1.6));
  }
}

export function wisteriaPainting(): string {
  const rand = rng(81);
  // two twisted vines along the top edge
  let s = paintStem(cubic([-10, 12], [90, 26], [250, -4], [370, 14], 40), 3.4, '#7b6450', 'w0') + paintStem(cubic([-10, 4], [110, 2], [220, 22], [370, 6], 40), 2, '#8d7560', 'w1');
  for (const [x, a] of [[40, 30], [120, 150], [196, 24], [300, 160], [250, 60]] as const)
    s += paintSprig({ stem: cubic([x, 10], go([x, 10], a, 14), go([x, 10], a, 28), go([x, 10], a, 44), 16), leaves: 9, len: 13, wid: 0.32, spread: [40, 60], colors: [['#b4c99a', '#98b07e'], ['#a5bd8a', '#8aa46f']], stemColor: '#8c9a6e', stemWidth: 1.2, seed: x, tip: true, belly: 0.34 });
  // clusters of racemes, long at the sides and short in the middle (room for the names); the back row is paler
  const back = [[30, 118], [76, 92], [118, 60], [246, 62], [290, 96], [334, 124]] as const;
  const front = [[10, 152], [48, 134], [62, 104], [96, 84], [134, 50], [160, 36], [204, 40], [230, 54], [266, 82], [304, 112], [320, 140], [352, 156]] as const;
  const behind = new Batch();
  const ahead = new Batch();
  for (const [x, l] of back) raceme([x + (rand() - 0.5) * 6, 14], l * (0.9 + rand() * 0.2), (rand() - 0.5) * 12, rand, behind);
  for (const [x, l] of front) raceme([x + (rand() - 0.5) * 6, 12], l * (0.9 + rand() * 0.2), (rand() - 0.5) * 12, rand, ahead);
  s += `<g opacity=".62">${behind}</g>${ahead}`;
  return svgDoc(360, 170, s, wcSet(5, { seed: 83, alpha: 0.82 }));
}

export function wisteriaSmall(): string {
  const rand = rng(85);
  let s = paintStem(cubic([40, 8], [80, 14], [120, 2], [160, 8], 20), 2, '#7b6450', 'w0');
  const buds = new Batch();
  for (const [x, l] of [[62, 46], [86, 56], [112, 52], [136, 42]] as const) raceme([x, 8], l, 2, rand, buds);
  s += buds;
  return svgDoc(200, 70, s, wcSet(5, { seed: 87, alpha: 0.82 }));
}

// ---------- cherry blossom ----------

function blossom(c: P, r: number, rand: () => number): string {
  const rot = rand() * 72;
  let petals = '';
  for (let i = 0; i < 5; i++) petals += petalD(c, rot + i * 72, r, r * 0.58, true);
  let stamens = '';
  let anthers = '';
  for (let i = 0; i < 5; i++) {
    const p = go(c, rot + i * 72 + 36, r * 0.5);
    stamens += `M${r1(c[0])} ${r1(c[1])}L${r1(p[0])} ${r1(p[1])}`;
    anthers += `M${r1(p[0])} ${r1(p[1])}h0`;
  }
  return (
    `<path d="${petals}" fill="${pick(['#f7c8d4', '#f4bccb', '#f9d3dc'], rand)}" filter="url(#w${1 + Math.floor(rand() * 3)})"/>` +
    `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r * 0.3)}" fill="#e07b96" opacity=".85"/>` +
    `<path d="${stamens}" stroke="#c4466a" stroke-width=".5"/><path d="${anthers}" stroke="#c4466a" stroke-width="1.8" stroke-linecap="round"/>`
  );
}

/** Branch with forks; returns the painted wood and the points where blossoms go. */
function cherryBranch(start: P, angle: number, len: number, width: number, depth: number, rand: () => number, spots: P[]): string {
  const stem = bentStem(start, angle, len, (rand() - 0.5) * len * 0.25);
  let s = `<path d="${brush(stem, taperEnd(width, width * 0.35))}" fill="${depth > 1 ? '#4e3a33' : '#5d463d'}" filter="url(#w0)"/>`;
  for (const t of [0.35, 0.6, 0.85, 1]) spots.push(along(stem, t).p);
  if (depth > 0)
    for (const t of [0.4, 0.72]) {
      const { p, angle: an } = along(stem, t);
      s += cherryBranch(p, an + (rand() > 0.5 ? 1 : -1) * (28 + rand() * 22), len * 0.48, width * 0.55, depth - 1, rand, spots);
    }
  return s;
}

function cherrySide(seed: number, start: P, angle: number, len: number): string {
  const rand = rng(seed);
  const spots: P[] = [];
  let s = cherryBranch(start, angle, len, 6, 2, rand, spots);
  for (const p of spots) {
    if (rand() < 0.25) s += `<ellipse cx="${r1(p[0])}" cy="${r1(p[1])}" rx="3.4" ry="2.4" fill="#e98aa6" filter="url(#w2)"/>`;
    // one or two blossoms per spot, like the clusters on a real branch
    const n = 1 + (rand() < 0.55 ? 1 : 0);
    for (let k = 0; k < n; k++) s += blossom([p[0] + (rand() - 0.5) * 14, p[1] + (rand() - 0.5) * 12], 6 + rand() * 4, rand);
  }
  return s;
}

export function cherryPainting(): string {
  const rand = rng(91);
  let s = cherrySide(93, [-8, 22], 16, 220) + cherrySide(97, [368, 8], 160, 140);
  for (let i = 0; i < 9; i++) s += petalAt([60 + rand() * 240, 90 + rand() * 56], rand() * 360, 5, 3, '#f4bccb', 'w2', true, 0.85);
  return svgDoc(360, 150, s, wcSet(5, { seed: 95, alpha: 0.85 }));
}

export function cherrySmall(): string {
  return svgDoc(200, 70, cherrySide(99, [16, 30], -4, 150), wcSet(5, { seed: 101, alpha: 0.85 }));
}

// ---------- baby's breath on kraft (painted white, normal blending) ----------

function gypsophilaSprig(base: P, angle: number, len: number, rand: () => number): string {
  const stem = bentStem(base, angle, len, (rand() - 0.5) * len * 0.1);
  let s = paintStem(stem, 1.4, '#7c8566', 'w0');
  const tips: P[] = [];
  for (const t of [0.45, 0.6, 0.75, 0.88]) {
    const { p, angle: an } = along(stem, t);
    for (const side of [-1, 1]) {
      if (rand() < 0.25) continue;
      const end = go(p, an + side * (25 + rand() * 25), len * (0.16 + rand() * 0.1));
      s += `<path d="${brush([p, end], () => 0.7)}" fill="#7c8566" filter="url(#w0)"/>`;
      tips.push(end);
      for (const s2 of [-1, 1]) if (rand() < 0.6) tips.push(go(end, an + side * 20 + s2 * 40, 5 + rand() * 4));
    }
  }
  tips.push(along(stem, 1).p);
  const florets = new Batch();
  for (const t of tips)
    for (let k = 0; k < 5; k++) {
      const r = 1.1 + rand() * 1.1;
      florets.add(rand() > 0.3 ? '#fffdf7' : '#f3ead6', `w${2 + (k % 3)}`, ellipseD(go(t, rand() * 360, rand() * 3.4), r, r));
    }
  return s + florets;
}

export function gypsophilaPainting(): string {
  return svgDoc(360, 150, tiedGarland(gypsophilaSprig, 105, ['#9a7a52', '#7a5c38']), wcSet(5, { seed: 107, alpha: 0.95, rim: 0.6 }));
}

export function gypsophilaSmall(): string {
  const rand = rng(109);
  let s = '';
  for (const a of [196, 344, 184, 356]) s += gypsophilaSprig([100, 40], a, 80, rand);
  return svgDoc(200, 64, s + bow([100, 40], 8, '#9a7a52', '#7a5c38'), wcSet(5, { seed: 111, alpha: 0.95, rim: 0.6 }));
}
