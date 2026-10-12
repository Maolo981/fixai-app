/**
 * Watercolor artwork of the nature and travel themes: Sicilian oranges, vineyard, eucalyptus, seaside,
 * tropical leaves, mountains, autumn and winter (paintings shown with multiply blending over the paper).
 */
import { type P, along, blurFilter, brush, cubic, placeAt, r1, rad, rng, smoothClosed, spiral, svgDoc, taper, taperEnd } from './art';
import { type Pair, bentStem, go, paintLeaf, paintSprig, paintStem, petalAt, pick, wcSet } from './paint';

const pt = (p: P) => `${r1(p[0])} ${r1(p[1])}`;
const poly = (pts: P[]) => 'M' + pts.map(pt).join('L') + 'Z';

/** Radial gradient lit from the upper left, for round fruit. */
const ball = (id: string, light: string, mid: string, dark: string) =>
  `<radialGradient id="${id}" cx=".36" cy=".32" r=".78"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></radialGradient>`;

// ---------------------------------------------------------------------------
// Sicily: oranges and orange blossom
// ---------------------------------------------------------------------------

const ORANGE_LEAF: Pair[] = [
  ['#4a7a3e', '#376531'],
  ['#5a8a4a', '#43723a'],
  ['#3f6e37', '#2f5a2c'],
];

function orange(c: P, r: number, rand: () => number): string {
  let s = `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r)}" fill="url(#og)" filter="url(#w4)"/>`;
  // pores of the peel and the little star where the stalk was
  for (let i = 0; i < 9; i++) {
    const p = go(c, rand() * 360, r * (0.2 + rand() * 0.65));
    s += `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r=".7" fill="#d4741f" opacity=".7"/>`;
  }
  s += `<ellipse cx="${r1(c[0] - r * 0.34)}" cy="${r1(c[1] - r * 0.38)}" rx="${r1(r * 0.24)}" ry="${r1(r * 0.13)}" transform="rotate(-38 ${r1(c[0] - r * 0.34)} ${r1(c[1] - r * 0.38)})" fill="#fff4d8" opacity=".55" filter="url(#b)"/>`;
  return s;
}

/** Zagara: five waxy white petals with a green heart and yellow stamens. */
function zagara(c: P, r: number, rand: () => number): string {
  let s = '';
  const rot = rand() * 72;
  for (let i = 0; i < 5; i++) s += petalAt(c, rot + i * 72, r, r * 0.46, i % 2 ? '#f6efe2' : '#f1e8d8', `w${1 + (i % 3)}`);
  s += `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(r * 0.24)}" fill="#c9cf6a" filter="url(#w0)"/>`;
  for (let i = 0; i < 7; i++) {
    const p = go(c, rot + i * 51, r * 0.42);
    s += `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="1" fill="#e2b93b"/>`;
  }
  return s;
}

function orangeBranch(seed: number, flip: boolean): string {
  const rand = rng(seed);
  const stem = cubic([-12, 16], [40, 2], [104, 10], [168, 30], 44);
  let s = paintSprig({ stem, leaves: 12, len: 34, wid: 0.34, spread: [34, 60], colors: ORANGE_LEAF, stemColor: '#6e5a3e', stemWidth: 3, seed, tip: true, belly: 0.32 });
  const fruits: [number, number][] = flip ? [[0.3, 21], [0.62, 16]] : [[0.36, 23], [0.7, 15]];
  for (const [t, r] of fruits) {
    const { p } = along(stem, t);
    s += paintStem([p, [p[0] + 1, p[1] + 10]], 1.6, '#6e5a3e', 'w0') + orange([p[0] + 2, p[1] + 10 + r], r, rand);
  }
  for (const t of flip ? [0.82, 0.93] : [0.5, 0.88]) {
    const { p } = along(stem, t);
    s += zagara([p[0] + 4, p[1] - 8], 9 + rand() * 2, rand);
  }
  return s;
}

const orangeDefs = (seed: number) => wcSet(5, { seed, alpha: 0.84 }) + blurFilter('b', 2) + ball('og', '#ffd27a', '#f59a2c', '#d8641a');

export function orangePainting(): string {
  return svgDoc(360, 130, `<g transform="translate(0 10)">${orangeBranch(111, false)}<g transform="translate(360 0) scale(-1 1)">${orangeBranch(117, true)}</g></g>`, orangeDefs(113));
}

export function orangeSmall(): string {
  const rand = rng(119);
  const stem = cubic([56, 10], [80, 6], [104, 8], [136, 16], 20);
  let s = paintSprig({ stem, leaves: 5, len: 24, wid: 0.34, spread: [40, 60], colors: ORANGE_LEAF, stemColor: '#6e5a3e', stemWidth: 2.2, seed: 5, tip: true, belly: 0.32 });
  s += orange([96, 40], 16, rand) + zagara([128, 30], 8, rand);
  return svgDoc(200, 64, s, orangeDefs(121));
}

// ---------------------------------------------------------------------------
// Vineyard: grapes, vine leaves and tendrils
// ---------------------------------------------------------------------------

const VINE: Pair[] = [
  ['#8fa35a', '#73884a'],
  ['#9caf66', '#7f9350'],
  ['#7f9650', '#677c40'],
];
const GRAPE = ['url(#g1)', 'url(#g2)', 'url(#g3)'];

/** Five-lobed vine leaf around the stalk junction `c`, pointing along `angle`. */
function vineLeaf(c: P, angle: number, size: number, col: Pair, f: string): string {
  const pts: P[] = [];
  for (let i = 0; i <= 80; i++) {
    const th = -172 + (344 * i) / 80;
    const lobes = ((1 + Math.cos(rad(th * 6))) / 2) ** 2;
    const sinus = Math.min(1, (180 - Math.abs(th)) / 34);
    const teeth = 0.04 * Math.abs(Math.sin(rad(th * 15)));
    const r = size * (0.66 + 0.3 * lobes + teeth) * (1 + 0.14 * Math.cos(rad(th))) * sinus;
    pts.push(go(c, angle + th, r));
  }
  let s = `<g filter="url(#${f})"><path d="${poly(pts)}" fill="${col[0]}"/><path d="${poly([c, ...pts.slice(40)])}" fill="${col[1]}" opacity=".55"/></g>`;
  for (const th of [0, -60, 60, -120, 120]) s += `<path d="${brush([c, go(c, angle + th, size * 0.5), go(c, angle + th * 1.04, size * 0.86)], taperEnd(1.4, 0.2))}" fill="${col[1]}" opacity=".8"/>`;
  return s;
}

/** Bunch of grapes hanging from `top`. */
function grapes(top: P, r: number, rows: number, rand: () => number): string {
  let s = paintStem([[top[0], top[1] - 8], top], 1.6, '#7a5c45', 'w0');
  for (let i = 0; i < rows; i++) {
    const n = Math.max(1, Math.round((rows - i) * 0.72));
    for (let j = 0; j < n; j++) {
      const x = top[0] + (j - (n - 1) / 2) * r * 1.62 + (rand() - 0.5) * r * 0.5 + i * 0.6;
      const y = top[1] + r + i * r * 1.42 + (rand() - 0.5) * r * 0.3;
      const k = r * (0.92 + rand() * 0.16);
      s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(k)}" fill="${pick(GRAPE, rand)}" filter="url(#w${2 + ((i + j) % 3)})"/>`;
      s += `<circle cx="${r1(x - k * 0.36)}" cy="${r1(y - k * 0.38)}" r="${r1(k * 0.2)}" fill="#fff" opacity=".4"/>`;
    }
  }
  return s;
}

const tendril = (c: P, r: number, a0: number, turns: number) => `<path d="${brush(spiral(c, r, r * 0.15, a0, turns, 40), (t) => 1.1 - t * 0.7)}" fill="#8a9a52" filter="url(#w0)"/>`;

const vineDefs = (seed: number) =>
  wcSet(5, { seed, alpha: 0.84 }) + ball('g1', '#9a7aa8', '#6b3f78', '#43214f') + ball('g2', '#a688b0', '#78508a', '#4b2a5a') + ball('g3', '#8a6a98', '#5e3569', '#3a1a45');

export function vinePainting(): string {
  const rand = rng(131);
  let s = paintStem(cubic([-10, 12], [100, 30], [240, -2], [370, 16], 40), 3.2, '#7a5c45', 'w0');
  s += vineLeaf([30, 14], 105, 40, VINE[0], 'w1') + vineLeaf([96, 22], 60, 28, VINE[1], 'w2') + vineLeaf([330, 14], 75, 38, VINE[2], 'w1') + vineLeaf([262, 16], 118, 26, VINE[0], 'w3');
  s += grapes([66, 30], 6, 8, rand) + grapes([296, 26], 5.4, 7, rand);
  s += tendril([140, 30], 10, 200, -1.6) + tendril([222, 22], 8, -20, 1.5);
  return svgDoc(360, 150, s, vineDefs(133));
}

export function vineSmall(): string {
  const rand = rng(135);
  const s = paintStem(cubic([40, 10], [80, 16], [120, 6], [164, 12], 20), 2.2, '#7a5c45', 'w0') + vineLeaf([72, 12], 120, 22, VINE[0], 'w1') + grapes([108, 14], 4.4, 6, rand) + tendril([140, 18], 6, 180, -1.5);
  return svgDoc(200, 70, s, vineDefs(137));
}

// ---------------------------------------------------------------------------
// Eucalyptus: round silver-green leaves
// ---------------------------------------------------------------------------

const EUCA: Pair[] = [
  ['#a9bfb4', '#8fa99c'],
  ['#9db6ab', '#83a094'],
  ['#b7cac0', '#9cb4a8'],
  ['#93aea2', '#7a988b'],
];

function eucalyptus(stem: P[], n: number, size: number, seed: number): string {
  const rand = rng(seed);
  let s = paintStem(stem, 1.7, '#8f7a6a', 'w0');
  for (let i = 0; i < n; i++) {
    const t = 0.06 + (0.94 * i) / (n - 1);
    const { p, angle } = along(stem, t);
    const side = i % 2 ? 1 : -1;
    const r = size * (1 - 0.4 * t) * (0.85 + rand() * 0.3);
    const a = angle + side * (70 + rand() * 30);
    const c = pick(EUCA, rand);
    // coin-shaped leaf on a short stalk, one half a little darker
    s += placeAt(p, a, `<g filter="url(#w${1 + (i % 3)})"><ellipse cx="${r1(r * 1.15)}" cy="0" rx="${r1(r)}" ry="${r1(r * 0.9)}" fill="${c[0]}"/><path d="M${r1(r * 0.15)} 0A${r1(r)} ${r1(r * 0.9)} 0 0 0 ${r1(r * 2.15)} 0Z" fill="${c[1]}" opacity=".6"/></g><path d="M0 0L${r1(r * 1.9)} 0" stroke="${c[1]}" stroke-width=".7" opacity=".8"/>`);
  }
  return s;
}

export function eucalyptusPainting(): string {
  const s =
    eucalyptus(cubic([-10, 8], [50, 64], [120, 66], [182, 34], 40), 17, 10, 141) +
    eucalyptus(cubic([370, 6], [312, 60], [244, 64], [184, 36], 40), 17, 10, 143) +
    eucalyptus(cubic([30, -4], [60, 30], [80, 40], [110, 46], 24), 8, 8, 145) +
    eucalyptus(cubic([330, -4], [300, 30], [280, 40], [252, 46], 24), 8, 8, 147);
  return svgDoc(360, 130, s, wcSet(5, { seed: 149, alpha: 0.82 }));
}

export function eucalyptusSmall(): string {
  const s = eucalyptus(cubic([100, 40], [80, 30], [50, 26], [14, 30], 24), 9, 8, 151) + eucalyptus(cubic([100, 40], [120, 30], [150, 26], [186, 30], 24), 9, 8, 153);
  return svgDoc(200, 64, s, wcSet(5, { seed: 155, alpha: 0.82 }));
}

// ---------------------------------------------------------------------------
// Riviera: striped beach awning, shells and starfish
// ---------------------------------------------------------------------------

export function awningPainting(): string {
  const n = 12;
  const w = 360 / n;
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = i * w;
    const blue = i % 2 === 0;
    // each stripe ends in a scallop
    s += `<path d="M${r1(x - 0.4)} 0H${r1(x + w + 0.4)}V38A${r1(w / 2)} ${r1(w * 0.42)} 0 0 1 ${r1(x - 0.4)} 38Z" fill="${blue ? '#3c79b4' : '#f1ebdf'}"${blue ? '' : ' stroke="#b7c8da" stroke-width="1.2"'} filter="url(#w${i % 4})"/>`;
    s += `<path d="M${r1(x + w * 0.5)} 4V${r1(38 + w * 0.36)}" stroke="${blue ? '#2c5f94' : '#e2dbcd'}" stroke-width="${r1(w * 0.18)}" opacity=".35" filter="url(#w4)"/>`;
  }
  // shadow cast under the scallops and the rolled top
  s += `<path d="M0 ${r1(38 + w * 0.42)}Q180 ${r1(48 + w * 0.42)} 360 ${r1(38 + w * 0.42)}" stroke="#9fb6cc" stroke-width="3" fill="none" opacity=".35" filter="url(#w4)"/>`;
  s += `<rect x="-6" y="-2" width="372" height="8" fill="#295b8f" filter="url(#w1)"/>`;
  return svgDoc(360, 70, s, wcSet(5, { seed: 161, alpha: 0.88, rim: 0.7 }));
}

/** Scallop shell standing on its hinge. */
function scallop(c: P, s: number, rot: number): string {
  const ribs = 9;
  const edge: P[] = [];
  for (let i = 0; i <= ribs * 2; i++) {
    const a = -90 - 62 + (124 * i) / (ribs * 2);
    edge.push(go([0, 0], a, s * (i % 2 ? 0.94 : 1)));
  }
  let body = `<path d="M${r1(-s * 0.3)} ${r1(s * 0.06)}L${r1(-s * 0.18)} ${r1(-s * 0.1)}${edge.map((p) => `L${pt(p)}`).join('')}L${r1(s * 0.18)} ${r1(-s * 0.1)}L${r1(s * 0.3)} ${r1(s * 0.06)}Z" fill="#f4c7a6" filter="url(#w1)"/>`;
  for (let i = 0; i <= ribs; i++) {
    const tip = go([0, 0], -152 + (124 * i) / ribs, s * 0.92);
    body += `<path d="${brush([[0, -s * 0.08], tip], taper(1.6, 0.3))}" fill="#dd9a78" opacity=".75"/>`;
  }
  return placeAt(c, rot, body);
}

function starfish(c: P, s: number, rot: number, rand: () => number): string {
  const pts: P[] = [];
  for (let i = 0; i < 10; i++) pts.push(go(c, rot - 90 + i * 36, i % 2 ? s * 0.42 : s * (0.95 + rand() * 0.1)));
  let out = `<path d="${smoothClosed(pts)}" fill="#ec9a62" filter="url(#w2)"/>`;
  for (let i = 0; i < 5; i++)
    for (const k of [0.3, 0.5, 0.7]) {
      const p = go(c, rot - 90 + i * 72, s * k);
      out += `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r1(1.4 - k)}" fill="#fbe1c8"/>`;
    }
  return out;
}

export function shellsSmall(): string {
  const rand = rng(163);
  const s = scallop([72, 46], 24, -14) + starfish([124, 38], 20, 12, rand) + scallop([160, 48], 13, 18);
  return svgDoc(200, 64, s, wcSet(5, { seed: 165, alpha: 0.86 }));
}

// ---------------------------------------------------------------------------
// Tropical: monstera, palm fronds and hibiscus
// ---------------------------------------------------------------------------

const TROPIC: Pair[] = [
  ['#3f7f5a', '#2f6a4a'],
  ['#4e8f62', '#3a7752'],
  ['#5f9e6c', '#47855a'],
];

/** Monstera leaf drawn as segments split by slits, from `base` along `angle`. */
function monstera(base: P, angle: number, len: number, rand: () => number): string {
  const mid = bentStem(base, angle, len, len * 0.08);
  let s = paintStem(mid, 2.4, '#3d6f4c', 'w0');
  for (let k = 0; k < 7; k++) {
    const t = 0.1 + k * 0.13;
    const { p, angle: an } = along(mid, t);
    const reach = len * 0.5 * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.08));
    for (const side of [-1, 1]) {
      const c = pick(TROPIC, rand);
      s += paintLeaf(p, an + side * (64 - k * 6), reach, reach * 0.24, side < 0 ? c : [c[1], c[0]], `w${1 + ((k + (side > 0 ? 1 : 0)) % 3)}`, 0.4, 0.42);
    }
  }
  const tip = along(mid, 1);
  return s + paintLeaf(tip.p, tip.angle, len * 0.16, len * 0.06, TROPIC[0], 'w2', 0.4, 0.4);
}

const palmFrond = (stem: P[], len: number, seed: number) =>
  paintSprig({ stem, leaves: 30, len, wid: 0.13, spread: [52, 72], colors: TROPIC, stemColor: '#5b7a3a', stemWidth: 2, seed, tip: true, belly: 0.3, start: 0.12 });

function hibiscus(c: P, R: number, rot: number, rand: () => number): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += petalAt(c, rot + i * 72, R, R * 0.6, i % 2 ? '#f68f86' : '#f27b7b', `w${1 + (i % 3)}`, false);
  // crimson heart fading into the petals, then fine veins
  for (let i = 0; i < 5; i++) s += `<g filter="url(#b)" opacity=".85">${petalAt(c, rot + i * 72, R * 0.5, R * 0.3, '#c7243f', 'w0')}</g>`;
  for (let i = 0; i < 10; i++) {
    const a = rot + i * 36 + (rand() - 0.5) * 10;
    s += `<path d="${brush([go(c, a, R * 0.2), go(c, a, R * 0.62), go(c, a + 4, R * 0.86)], taper(0.9, 0.2))}" fill="#c7243f" opacity=".45"/>`;
  }
  const end = go(c, rot + 216, R * 1.05);
  s += `<path d="${brush([c, go(c, rot + 212, R * 0.55), end], taperEnd(2.4, 1.2))}" fill="#f5a3a0" filter="url(#w0)"/>`;
  for (let i = 0; i < 9; i++) {
    const p = go(end, rand() * 360, 1.5 + rand() * 3);
    s += `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="1.4" fill="#f2b22d"/>`;
  }
  for (let i = 0; i < 5; i++) {
    const p = go(end, rot + 216 + (i - 2) * 30, 4.5);
    s += `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="1.1" fill="#b3263f"/>`;
  }
  return s;
}

export function tropicalPainting(): string {
  const rand = rng(171);
  let s = palmFrond(cubic([-6, 26], [50, 18], [110, 36], [160, 70], 40), 30, 173) + palmFrond(cubic([366, 18], [310, 10], [250, 26], [214, 56], 40), 28, 175);
  s += monstera([-12, -10], 42, 120, rand) + monstera([372, -8], 128, 104, rand);
  s += hibiscus([70, 44], 24, -20, rand) + hibiscus([296, 40], 20, 10, rand);
  return svgDoc(360, 150, s, wcSet(5, { seed: 177, alpha: 0.84 }) + blurFilter('b', 2.4));
}

export function tropicalSmall(): string {
  const rand = rng(179);
  const s = palmFrond(cubic([100, 40], [70, 32], [40, 30], [10, 36], 24), 16, 181) + palmFrond(cubic([100, 40], [130, 32], [160, 30], [190, 36], 24), 16, 183) + hibiscus([100, 36], 16, 0, rand);
  return svgDoc(200, 70, s, wcSet(5, { seed: 185, alpha: 0.84 }) + blurFilter('b', 2));
}

// ---------------------------------------------------------------------------
// Mountains: layered ridges and pines (along the bottom of the card)
// ---------------------------------------------------------------------------

/** Ridge line through `anchors`, roughened by midpoint displacement. */
function ridge(anchors: P[], rough: number, seed: number): P[] {
  const rand = rng(seed);
  let pts = anchors;
  let k = rough;
  for (let level = 0; level < 5; level++) {
    const next: P[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      next.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (rand() - 0.5) * k]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    k *= 0.55;
  }
  return pts;
}

const yAt = (line: P[], x: number) => {
  for (let i = 0; i < line.length - 1; i++) if (line[i + 1][0] >= x) return line[i][1] + ((x - line[i][0]) / (line[i + 1][0] - line[i][0])) * (line[i + 1][1] - line[i][1]);
  return line[line.length - 1][1];
};

function pine(base: P, h: number, col: string): string {
  const [x, y] = base;
  let d = '';
  for (let i = 0; i < 3; i++) {
    const top = y - h * (0.45 + 0.27 * i) - h * 0.1;
    const w = h * (0.34 - i * 0.08);
    const bottom = y - h * 0.12 - h * 0.25 * i;
    d += `M${r1(x)} ${r1(top)}L${r1(x + w)} ${r1(bottom)}L${r1(x - w)} ${r1(bottom)}Z`;
  }
  return `<path d="${d}M${r1(x - 0.8)} ${r1(y - h * 0.14)}H${r1(x + 0.8)}V${r1(y)}H${r1(x - 0.8)}Z" fill="${col}"/>`;
}

function mountains(w: number, h: number, scale: number, seed: number, pines: number): string {
  const rand = rng(seed);
  const layers: { pts: P[]; grad: string; f: string }[] = [
    { pts: ridge([[-10, h * 0.5], [w * 0.16, h * 0.08], [w * 0.38, h * 0.42], [w * 0.62, h * 0.12], [w * 0.86, h * 0.4], [w + 10, h * 0.2]], 22 * scale, seed + 1), grad: 'm1', f: 'w1' },
    { pts: ridge([[-10, h * 0.42], [w * 0.28, h * 0.62], [w * 0.5, h * 0.3], [w * 0.74, h * 0.6], [w + 10, h * 0.4]], 18 * scale, seed + 2), grad: 'm2', f: 'w2' },
    { pts: ridge([[-10, h * 0.7], [w * 0.2, h * 0.58], [w * 0.45, h * 0.76], [w * 0.7, h * 0.6], [w + 10, h * 0.74]], 10 * scale, seed + 3), grad: 'm3', f: 'w3' },
  ];
  let s = '';
  for (const l of layers) s += `<path d="${poly([...l.pts, [w + 10, h + 4], [-10, h + 4]])}" fill="url(#${l.grad})" filter="url(#${l.f})"/>`;
  const front = ridge([[-10, h * 0.86], [w * 0.3, h * 0.8], [w * 0.62, h * 0.9], [w + 10, h * 0.82]], 5 * scale, seed + 4);
  s += `<path d="${poly([...front, [w + 10, h + 4], [-10, h + 4]])}" fill="#7d977f" filter="url(#w4)"/>`;
  for (let i = 0; i < pines; i++) {
    const x = (w * (i + 0.2 + rand() * 0.6)) / pines;
    if (x > w * 0.36 && x < w * 0.64 && rand() < 0.6) continue;
    const ph = (14 + rand() * 14) * scale;
    s += `<g filter="url(#w${i % 3})">${pine([x, yAt(front, x) + 3], ph, pick(['#3e5f4a', '#4b6d55', '#36543f'], rand))}</g>`;
  }
  return s;
}

const mountainDefs = (seed: number) =>
  wcSet(5, { seed, alpha: 0.8, rim: 0.8 }) +
  `<linearGradient id="m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f6f9"/><stop offset=".35" stop-color="#d3dde8"/><stop offset="1" stop-color="#bfcddc"/></linearGradient>` +
  `<linearGradient id="m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9eff5"/><stop offset=".3" stop-color="#a9bccf"/><stop offset="1" stop-color="#8fa5bc"/></linearGradient>` +
  `<linearGradient id="m3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ea4b8"/><stop offset="1" stop-color="#6e879d"/></linearGradient>`;

export function mountainPainting(): string {
  return svgDoc(360, 140, mountains(360, 140, 1, 191, 16), mountainDefs(193));
}

export function mountainSmall(): string {
  return svgDoc(200, 64, `<g transform="translate(30 0)">${mountains(140, 64, 0.5, 195, 7)}</g>`, mountainDefs(197));
}

// ---------------------------------------------------------------------------
// Autumn: maple leaves and rose hips
// ---------------------------------------------------------------------------

const AUTUMN: Pair[] = [
  ['#d9622b', '#bb4a22'],
  ['#c8452a', '#a5341f'],
  ['#e8a33d', '#cc842c'],
  ['#b8572a', '#94411f'],
  ['#e3b04b', '#c79233'],
];

/** Maple leaf with five pointed, toothed lobes around the stalk junction `c`. */
function maple(c: P, angle: number, size: number, col: Pair, f: string): string {
  const lobes: [number, number][] = [[0, 0.62], [-54, 0.56], [54, 0.56], [-112, 0.36], [112, 0.36]];
  const pts: P[] = [];
  for (let i = 0; i <= 120; i++) {
    const th = -176 + (352 * i) / 120;
    let r = 0.3;
    for (const [at, a] of lobes) r += a * Math.exp(-(((th - at) / 15) ** 2));
    r += 0.035 * Math.abs(Math.sin(rad(th * 14)));
    r *= Math.min(1, (180 - Math.abs(th)) / 26);
    pts.push(go(c, angle + th, size * r));
  }
  let s = `<g filter="url(#${f})"><path d="${poly(pts)}" fill="${col[0]}"/><path d="${poly([c, ...pts.slice(60)])}" fill="${col[1]}" opacity=".5"/></g>`;
  for (const [th, a] of lobes) s += `<path d="${brush([c, go(c, angle + th, size * (0.3 + a) * 0.85)], taperEnd(1.2, 0.2))}" fill="${col[1]}" opacity=".85"/>`;
  return s + paintStem([c, go(c, angle + 180, size * 0.3)], 1.4, col[1], 'w0');
}

function autumnBranch(seed: number): string {
  const rand = rng(seed);
  const stem = cubic([-10, 10], [40, 24], [100, 22], [158, 44], 40);
  let s = paintStem(stem, 2.6, '#6d4a33', 'w0');
  for (const [t, side, size] of [[0.18, 1, 30], [0.38, -1, 24], [0.55, 1, 26], [0.74, -1, 20], [0.95, 1, 22]] as const) {
    const { p, angle } = along(stem, t);
    const at = go(p, angle + side * 60, size * 0.35);
    s += maple(at, angle + side * 60, size, pick(AUTUMN, rand), `w${1 + Math.floor(rand() * 3)}`);
  }
  for (const t of [0.3, 0.64]) {
    const { p } = along(stem, t);
    for (let k = 0; k < 3; k++) s += `<ellipse cx="${r1(p[0] + (k - 1) * 6)}" cy="${r1(p[1] + 8 + (k % 2) * 4)}" rx="3.4" ry="4.2" fill="#b3261e" filter="url(#w${2 + k})"/>`;
  }
  return s;
}

export function autumnPainting(): string {
  const rand = rng(201);
  let s = autumnBranch(203) + `<g transform="translate(360 0) scale(-1 1)">${autumnBranch(207)}</g>`;
  for (const [x, y, a, size] of [[150, 96, 30, 14], [214, 112, -50, 12], [190, 70, 120, 10]] as const) s += maple([x, y], a, size, pick(AUTUMN, rand), 'w2');
  return svgDoc(360, 140, s, wcSet(5, { seed: 209, alpha: 0.84 }));
}

export function autumnSmall(): string {
  const s = maple([100, 50], -90, 24, AUTUMN[0], 'w1') + maple([92, 52], -140, 18, AUTUMN[2], 'w2') + maple([108, 52], -40, 18, AUTUMN[1], 'w3');
  return svgDoc(200, 70, s, wcSet(5, { seed: 211, alpha: 0.84 }));
}

// ---------------------------------------------------------------------------
// Winter: pine sprigs and cones (snowflakes are in foil.ts)
// ---------------------------------------------------------------------------

const PINE = ['#2f5a4a', '#3e6e5a', '#527f6a', '#2a4f43'];

/** Pine sprig: two layers of needles, grouped by filter and colour so the drawing stays light. */
function pineSprig(stem: P[], needle: number, seed: number): string {
  const rand = rng(seed);
  const groups = new Map<string, string>();
  const n = Math.round(stem.length * 1.8);
  for (const [spread, k, light] of [[52, 0.85, true], [30, 1, false]] as const)
    for (let i = 0; i < n; i++) {
      const t = 0.03 + (0.97 * i) / (n - 1);
      const { p, angle } = along(stem, t);
      for (const side of [-1, 1]) {
        const a = angle + side * (spread + (rand() - 0.5) * 16);
        const l = needle * k * (0.8 + rand() * 0.35) * (1 - 0.3 * t);
        const col = light ? pick(['#6a9480', '#5c8a74'], rand) : pick(PINE, rand);
        const key = `${col} w${1 + (i % 3)}`;
        groups.set(key, (groups.get(key) ?? '') + brush([p, go(p, a, l * 0.5), go(p, a + side * 5, l)], taperEnd(1.7, 0.3)));
      }
    }
  let s = paintStem(stem, 2, '#6b5040', 'w0');
  for (const [key, d] of groups) {
    const [col, f] = key.split(' ');
    s += `<path d="${d}" fill="${col}" filter="url(#${f})"/>`;
  }
  return s;
}

function pineCone(c: P, angle: number, s: number): string {
  let body = `<ellipse cx="${r1(s * 0.5)}" cy="0" rx="${r1(s * 0.55)}" ry="${r1(s * 0.32)}" fill="#8a5a3a" filter="url(#w2)"/>`;
  for (let row = 0; row < 5; row++)
    for (let j = -1; j <= 1; j++) {
      const x = s * (0.12 + row * 0.19);
      const y = j * s * 0.17 * (1 - Math.abs(row - 2) * 0.18);
      body += `<path d="M${r1(x)} ${r1(y - s * 0.07)}Q${r1(x + s * 0.12)} ${r1(y)} ${r1(x)} ${r1(y + s * 0.07)}" stroke="#5e3a24" stroke-width="1" fill="none"/>`;
    }
  return placeAt(c, angle, body);
}

export function winterPainting(): string {
  let s = '';
  const sprigs: [P[], number, number][] = [
    [cubic([-10, 30], [40, 10], [100, 14], [150, 36], 26), 17, 221],
    [cubic([-8, 64], [30, 44], [60, 54], [96, 74], 18), 14, 223],
    [cubic([20, -6], [40, 20], [70, 30], [108, 32], 18), 13, 225],
    [cubic([370, 24], [320, 8], [260, 14], [214, 36], 26), 17, 227],
    [cubic([368, 58], [336, 44], [300, 50], [268, 70], 18), 14, 229],
  ];
  for (const [stem, needle, seed] of sprigs) s += pineSprig(stem, needle, seed);
  s += pineCone([96, 42], 70, 26) + pineCone([112, 38], 100, 20) + pineCone([256, 40], 110, 24);
  s += `<g fill="#c3cfd8" filter="url(#w3)"><circle cx="134" cy="42" r="3.4"/><circle cx="141" cy="48" r="3"/><circle cx="133" cy="51" r="2.6"/><circle cx="228" cy="46" r="3.2"/><circle cx="221" cy="52" r="2.8"/></g>`;
  return svgDoc(360, 150, s, wcSet(5, { seed: 231, alpha: 0.86 }));
}

export function winterSmall(): string {
  const s = pineSprig(cubic([100, 34], [76, 26], [46, 26], [14, 34], 20), 10, 233) + pineSprig(cubic([100, 34], [124, 26], [154, 26], [186, 34], 20), 10, 235) + pineCone([100, 40], 90, 20);
  return svgDoc(200, 70, s, wcSet(5, { seed: 237, alpha: 0.86 }));
}

