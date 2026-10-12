/**
 * Artwork of the party themes: rainbow, balloons, butterflies, bubbly, fireworks and Christmas
 * (watercolor paintings plus their foil details, drawn as black shapes for the CSS masks).
 */
import { type P, brush, cubic, placeAt, r1, rad, rng, svgDoc, taper, taperEnd } from './art';
import { cloud } from './motifs';
import { go, pick, sparkle, star5, wcSet } from './paint';

const pt = (p: P) => `${r1(p[0])} ${r1(p[1])}`;

// ---------------------------------------------------------------------------
// Rainbow and clouds
// ---------------------------------------------------------------------------

const RAINBOW = ['#f3a3a0', '#f7c39a', '#f4dc94', '#bcdba6', '#a5c9e6', '#c3b2e0'];

/** Band of an arc between radii r1 and r2, from angle a to b (degrees, clockwise on screen). */
function band(c: P, ro: number, ri: number, a: number, b: number): string {
  const p = (r: number, t: number) => pt(go(c, t, r));
  return `M${p(ro, a)}A${ro} ${ro} 0 0 1 ${p(ro, b)}L${p(ri, b)}A${ri} ${ri} 0 0 0 ${p(ri, a)}Z`;
}

/** White cloud with a pale blue underside, so it reads on white paper. */
const puff = (x: number, y: number, k: number) => cloud(x + 1, y + 4 * k, k, '#cfdcea', 'w4') + cloud(x, y, k * 0.95, '#ffffff', 'w4');

export function rainbowPainting(): string {
  const c: P = [180, 172];
  let s = '';
  RAINBOW.forEach((col, i) => {
    const ro = 152 - i * 11;
    s += `<path d="${band(c, ro, ro - 11.5, 198, 342)}" fill="${col}" filter="url(#w${i % 4})"/>`;
  });
  s += puff(10, 116, 1.25) + puff(300, 112, 1.15);
  return svgDoc(360, 150, s, wcSet(5, { seed: 241, alpha: 0.86, rim: 0.8 }));
}

export function rainbowSmall(): string {
  const c: P = [100, 66];
  let s = '';
  RAINBOW.forEach((col, i) => {
    const ro = 52 - i * 5;
    s += `<path d="${band(c, ro, ro - 5.4, 196, 344)}" fill="${col}" filter="url(#w${i % 4})"/>`;
  });
  s += puff(40, 56, 0.55) + puff(146, 56, 0.5);
  return svgDoc(200, 70, s, wcSet(5, { seed: 243, alpha: 0.86, rim: 0.8 }));
}

// ---------------------------------------------------------------------------
// Balloons
// ---------------------------------------------------------------------------

const BALLOONS = ['#f28b82', '#f9bf5b', '#8ecae6', '#a8d89a', '#cdb4db', '#f7a8c4'];

function balloon(c: P, r: number, col: string, tilt: number, f: string): string {
  const h = r * 1.2;
  return placeAt(
    c,
    tilt,
    `<g filter="url(#${f})"><path d="M0 ${r1(-h)}C${r1(r * 1.1)} ${r1(-h)} ${r1(r * 1.05)} ${r1(h * 0.55)} 0 ${r1(h)}C${r1(-r * 1.05)} ${r1(h * 0.55)} ${r1(-r * 1.1)} ${r1(-h)} 0 ${r1(-h)}Z" fill="${col}"/>` +
      `<path d="M-2.6 ${r1(h + 3.4)}L0 ${r1(h - 0.6)}L2.6 ${r1(h + 3.4)}Z" fill="${col}"/></g>` +
      `<ellipse cx="${r1(-r * 0.38)}" cy="${r1(-h * 0.42)}" rx="${r1(r * 0.17)}" ry="${r1(r * 0.3)}" transform="rotate(24 ${r1(-r * 0.38)} ${r1(-h * 0.42)})" fill="#fff" opacity=".5"/>`,
  );
}

/** A bunch of balloons whose strings gather at `knot`. */
function bunch(spots: [number, number, number, number][], knot: P, rand: () => number, colors: string[]): string {
  let strings = '';
  let bodies = '';
  spots.forEach(([x, y, r, tilt], i) => {
    const end = go([x, y], 90 + tilt, r * 1.2 + 3);
    const mid: P = [(end[0] + knot[0]) / 2 + (rand() - 0.5) * 16, (end[1] + knot[1]) / 2];
    strings += `<path d="M${pt(end)}Q${pt(mid)} ${pt(knot)}" stroke="#9a8f88" stroke-width=".8" fill="none"/>`;
    bodies += balloon([x, y], r, colors[i % colors.length], tilt, `w${1 + (i % 4)}`);
  });
  return strings + bodies;
}

export function balloonPainting(): string {
  const rand = rng(251);
  const left = bunch([[30, 40, 19, -16], [64, 28, 21, -4], [44, 76, 17, -10], [92, 58, 16, 8], [12, 92, 14, -20]], [76, 150], rand, BALLOONS);
  const right = bunch([[330, 36, 20, 14], [296, 26, 18, 4], [318, 76, 17, 12], [272, 60, 15, -6], [348, 96, 13, 18]], [286, 150], rand, [BALLOONS[2], BALLOONS[5], BALLOONS[1], BALLOONS[4], BALLOONS[0]]);
  return svgDoc(360, 150, left + right, wcSet(5, { seed: 253, alpha: 0.88, rim: 0.8 }));
}

export function balloonSmall(): string {
  const rand = rng(255);
  return svgDoc(200, 76, bunch([[86, 22, 12, -12], [106, 16, 13, 4], [122, 30, 11, 14]], [104, 76], rand, [BALLOONS[0], BALLOONS[2], BALLOONS[1]]), wcSet(5, { seed: 257, alpha: 0.88, rim: 0.8 }));
}

// ---------------------------------------------------------------------------
// Butterflies
// ---------------------------------------------------------------------------

type Wings = { up: string; low: string; edge: string };
const WINGS: Wings[] = [
  { up: '#86b6e3', low: '#aecdf0', edge: '#3d6fa6' },
  { up: '#f4ae86', low: '#f8cdb0', edge: '#c4643f' },
  { up: '#c2a5e0', low: '#dccbf0', edge: '#7a57a6' },
  { up: '#f2d06b', low: '#f7e3a3', edge: '#b0861c' },
];

/** Butterfly seen from above; `open` < 1 folds the wings (seen at an angle). */
function butterfly(c: P, s: number, angle: number, w: Wings, open: number, rand: () => number): string {
  const k = s / 24;
  const wing = (m: number) =>
    `<g transform="scale(${r1(m * open * 100) / 100} 1)">` +
    `<path d="M0 -2C5 -18 21 -22 24 -12C27 -3 15 3 0 2Z" fill="${w.up}" filter="url(#w1)"/>` +
    `<path d="M0 2C12 3 19 10 15 18C12 24 4 19 0 6Z" fill="${w.low}" filter="url(#w2)"/>` +
    `<path d="M3 -4C9 -14 18 -17 22 -12" stroke="${w.edge}" stroke-width="1.6" fill="none" opacity=".55" filter="url(#w3)"/>` +
    `<circle cx="18" cy="-12" r="1.6" fill="${w.edge}" opacity=".7"/><circle cx="13" cy="15" r="1.3" fill="${w.edge}" opacity=".6"/></g>`;
  const body =
    `<ellipse cx="0" cy="3" rx="1.5" ry="9" fill="#5b4a44"/>` +
    `<path d="M-0.5 -5Q-4 -12 -6 -15M0.5 -5Q4 -12 6 -15" stroke="#5b4a44" stroke-width=".7" fill="none"/><circle cx="-6" cy="-15" r=".9" fill="#5b4a44"/><circle cx="6" cy="-15" r=".9" fill="#5b4a44"/>`;
  return placeAt(c, angle + (rand() - 0.5) * 6, `<g transform="scale(${r1(k * 100) / 100})">${wing(1)}${wing(-1)}${body}</g>`);
}

export function butterflyPainting(): string {
  const rand = rng(261);
  let s = `<path d="M70 104C110 130 150 70 196 92S270 120 300 64" stroke="#d8c6b8" stroke-width="1.1" stroke-dasharray="2 5" stroke-linecap="round" fill="none"/>`;
  for (const [x, y, size, a, i, open] of [
    [40, 46, 30, -18, 0, 1],
    [104, 26, 18, 14, 2, 0.7],
    [70, 104, 14, 30, 3, 1],
    [300, 60, 26, 22, 1, 1],
    [258, 22, 16, -12, 0, 0.6],
    [336, 112, 14, -24, 2, 1],
  ] as const)
    s += butterfly([x, y], size, a, WINGS[i], open, rand);
  return svgDoc(360, 140, s, wcSet(5, { seed: 263, alpha: 0.86 }));
}

export function butterflySmall(): string {
  const rand = rng(265);
  return svgDoc(200, 64, butterfly([84, 34], 20, -12, WINGS[0], 1, rand) + butterfly([122, 26], 13, 18, WINGS[2], 0.7, rand), wcSet(5, { seed: 267, alpha: 0.86 }));
}

// ---------------------------------------------------------------------------
// Bubbly: two flutes clinking (foil)
// ---------------------------------------------------------------------------

/** A champagne flute standing at `base`, `h` tall, tilted by `tilt` degrees: outline and wine as black shapes. */
function flute(base: P, h: number, tilt: number): string {
  const w = h * 0.13;
  const bowlTop = -h;
  const bowlBottom = -h * 0.45;
  const outline =
    `<path d="M${r1(-w)} ${r1(bowlTop)}C${r1(-w)} ${r1(bowlTop + h * 0.3)} ${r1(-w * 0.75)} ${r1(bowlBottom - h * 0.06)} ${r1(-w * 0.12)} ${r1(bowlBottom)}V${r1(-h * 0.06)}C${r1(-w * 0.4)} ${r1(-h * 0.03)} ${r1(-w * 1.1)} ${r1(-h * 0.02)} ${r1(-w * 1.1)} 0H${r1(w * 1.1)}C${r1(w * 1.1)} ${r1(-h * 0.02)} ${r1(w * 0.4)} ${r1(-h * 0.03)} ${r1(w * 0.12)} ${r1(-h * 0.06)}V${r1(bowlBottom)}C${r1(w * 0.75)} ${r1(bowlBottom - h * 0.06)} ${r1(w)} ${r1(bowlTop + h * 0.3)} ${r1(w)} ${r1(bowlTop)}" fill="none" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>`;
  const wine = `<path d="M${r1(-w * 0.9)} ${r1(bowlTop + h * 0.16)}C${r1(-w * 0.88)} ${r1(bowlTop + h * 0.36)} ${r1(-w * 0.66)} ${r1(bowlBottom - h * 0.07)} ${r1(-w * 0.1)} ${r1(bowlBottom - h * 0.02)}H${r1(w * 0.1)}C${r1(w * 0.66)} ${r1(bowlBottom - h * 0.07)} ${r1(w * 0.88)} ${r1(bowlTop + h * 0.36)} ${r1(w * 0.9)} ${r1(bowlTop + h * 0.16)}Z" opacity=".38"/>`;
  const rim = `<path d="M${r1(-w * 0.9)} ${r1(bowlTop + h * 0.16)}H${r1(w * 0.9)}" stroke="#000" stroke-width="1.1"/>`;
  let bubbles = '';
  for (const [x, y, r] of [[-0.3, 0.3, 1.1], [0.25, 0.4, 0.9], [-0.1, 0.52, 0.8], [0.3, 0.24, 0.7]] as const) bubbles += `<circle cx="${r1(w * x * 1.6)}" cy="${r1(bowlTop + h * y)}" r="${r}"/>`;
  return `<g transform="translate(${pt(base)}) rotate(${tilt})">${outline}${wine}${rim}${bubbles}</g>`;
}

export function bubblyFoil(): string {
  const rand = rng(271);
  let s = flute([152, 146], 104, 13) + flute([208, 146], 104, -13);
  // the clink: a starburst where the rims meet
  s += sparkle([180, 38], 10, 0.14);
  for (const a of [-160, -125, -90, -55, -20]) s += `<path d="${brush([go([180, 38], a, 14), go([180, 38], a, 24)], taper(1.6, 0.3))}"/>`;
  // bubbles rising around the glasses
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const x = 180 + side * (40 + rand() * 120);
    const y = 12 + rand() * 120;
    const r = 1.2 + rand() * 3.2;
    s += rand() < 0.55 ? `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="none" stroke="#000" stroke-width=".9"/>` : `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r * 0.55)}"/>`;
  }
  for (const [x, y, k] of [[60, 30, 5], [300, 40, 6], [104, 100, 3.5], [262, 110, 4]] as const) s += sparkle([x, y], k);
  return svgDoc(360, 150, s);
}

export function bubblesDivider(): string {
  let s = '';
  for (const [x, y, r, ring] of [[100, 15, 4.2, true], [88, 12, 2, false], [112, 18, 2.4, false], [76, 16, 1.4, false], [124, 11, 1.3, false]] as const)
    s += ring ? `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#000" stroke-width="1.1"/>` : `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  for (const m of [1, -1]) s += `<path d="${brush(cubic([100 + m * 32, 15], [100 + m * 50, 15], [100 + m * 70, 15], [100 + m * 92, 15], 20), taper(1.2, 0.15))}"/>`;
  return svgDoc(200, 30, s);
}

// ---------------------------------------------------------------------------
// Fireworks: coloured glow (painted, normal blending on dark paper) and gold sparks (foil)
// ---------------------------------------------------------------------------

const BURSTS: [number, number, number, string][] = [
  [70, 52, 44, '#f59ab8'],
  [290, 44, 52, '#8fd3f0'],
  [182, 22, 26, '#f6d27a'],
  [128, 104, 20, '#b9a3f2'],
  [246, 108, 18, '#f59ab8'],
];

function rays(c: P, r: number, n: number, rand: () => number, w: number): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (360 * i) / n + (rand() - 0.5) * 6;
    const len = r * (0.75 + rand() * 0.3);
    // sparks fall a little as they fly out
    const end = go(c, a, len);
    const sag: P = [end[0], end[1] + len * 0.08];
    d += brush([go(c, a, r * 0.22), go(c, a, len * 0.6), sag], taperEnd(w, w * 0.25));
  }
  return d;
}

export function fireworksPainting(): string {
  const rand = rng(281);
  let s = '';
  for (const [x, y, r, col] of BURSTS) {
    s += `<circle cx="${x}" cy="${y}" r="${r1(r * 0.9)}" fill="${col}" opacity=".16" filter="url(#b)"/>`;
    s += `<path d="${rays([x, y], r, 22, rand, 2.6)}" fill="${col}" opacity=".85" filter="url(#w1)"/>`;
  }
  return svgDoc(360, 150, s, wcSet(3, { seed: 283, alpha: 0.9, rim: 0.5 }) + `<filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>`);
}

export function fireworksFoil(): string {
  const rand = rng(285);
  let s = '';
  for (const [x, y, r] of BURSTS) {
    s += `<path d="${rays([x, y], r * 0.62, 14, rand, 1.3)}"/>`;
    for (let i = 0; i < 16; i++) {
      const p = go([x, y], (360 * i) / 16 + 11, r * (0.95 + rand() * 0.2));
      s += `<circle cx="${r1(p[0])}" cy="${r1(p[1] + r * 0.08)}" r="${r1(0.8 + rand() * 0.9)}"/>`;
    }
    s += sparkle([x, y], r * 0.12 + 2);
  }
  for (let i = 0; i < 16; i++) s += `<circle cx="${r1(rand() * 360)}" cy="${r1(rand() * 150)}" r="${r1(0.5 + rand() * 0.8)}"/>`;
  return svgDoc(360, 150, s);
}

// ---------------------------------------------------------------------------
// Christmas: holly, berries and gold stars
// ---------------------------------------------------------------------------

/** Spiky holly leaf from (0,0) to (len,0). */
function hollyHalf(len: number, wid: number, side: 1 | -1): string {
  const spikes = [0.2, 0.42, 0.64, 0.84];
  let d = 'M0 0';
  let prev = 0;
  for (const t of spikes) {
    const x = t * len;
    const y = side * wid * Math.sin(Math.PI * Math.min(1, t * 1.05)) * (t < 0.3 ? 0.8 : 1);
    d += `Q${r1(((prev + t) / 2) * len)} ${r1(y * 0.42)} ${r1(x)} ${r1(y)}`;
    prev = t;
  }
  return d + `Q${r1(len * 0.93)} ${r1(side * wid * 0.12)} ${r1(len)} 0Z`;
}

function holly(at: P, angle: number, len: number, rand: () => number): string {
  const wid = len * 0.36;
  const greens: [string, string][] = [
    ['#2f6b45', '#22573a'],
    ['#3b7a50', '#2a6341'],
  ];
  const [a, b] = pick(greens, rand);
  return placeAt(at, angle, `<g filter="url(#w${1 + Math.floor(rand() * 3)})"><path d="${hollyHalf(len, wid, -1)}" fill="${a}"/><path d="${hollyHalf(len, wid, 1)}" fill="${b}"/></g><path d="M2 0L${r1(len * 0.9)} 0" stroke="#7ea383" stroke-width=".9" opacity=".7"/>`);
}

function berries(c: P, rand: () => number): string {
  let s = '';
  for (const [dx, dy, r] of [[0, 0, 5], [7, 3, 4.4], [2, 7, 4.2]] as const) {
    const x = c[0] + dx;
    const y = c[1] + dy;
    s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${rand() > 0.5 ? '#c8202f' : '#b3192a'}" filter="url(#w4)"/><circle cx="${r1(x - r * 0.35)}" cy="${r1(y - r * 0.35)}" r="${r1(r * 0.24)}" fill="#fff" opacity=".55"/><circle cx="${r1(x + r * 0.3)}" cy="${r1(y + r * 0.35)}" r=".7" fill="#5a1015"/>`;
  }
  return s;
}

function hollySprig(c: P, angles: number[], len: number, rand: () => number): string {
  return angles.map((a, i) => holly(go(c, a, 4), a, len * (1 - i * 0.08), rand)).join('') + berries([c[0] - 3, c[1] - 3], rand);
}

export function hollyPainting(): string {
  const rand = rng(291);
  const s = hollySprig([40, 28], [10, 70, 130, -40], 44, rand) + hollySprig([322, 26], [170, 110, 50, 220], 42, rand) + hollySprig([180, 8], [20, 160, 90], 26, rand);
  return svgDoc(360, 130, s, wcSet(5, { seed: 293, alpha: 0.88 }));
}

export function hollySmall(): string {
  const rand = rng(295);
  return svgDoc(200, 64, hollySprig([100, 30], [200, 340, 260, 110], 30, rand), wcSet(5, { seed: 297, alpha: 0.88 }));
}

export function christmasStars(): string {
  const rand = rng(299);
  let s = '';
  for (const [x, y, r] of [[110, 60, 7], [250, 56, 8], [84, 104, 4.5], [282, 100, 5], [148, 30, 4], [212, 34, 4.5], [20, 120, 3.4], [342, 116, 3.4]] as const) s += star5([x, y], r, r * 0.45, -90 + (rand() - 0.5) * 20);
  for (let i = 0; i < 12; i++) s += `<circle cx="${r1(30 + rand() * 300)}" cy="${r1(20 + rand() * 100)}" r="${r1(0.6 + rand() * 0.8)}"/>`;
  return svgDoc(360, 130, s);
}

// ---------------------------------------------------------------------------
// Winter foil: snowflakes
// ---------------------------------------------------------------------------

export function snowflake(c: P, r: number, rot = 0): string {
  let d = '';
  for (let k = 0; k < 6; k++) {
    const a = rot + k * 60;
    d += `M${pt(c)}L${pt(go(c, a, r))}`;
    for (const t of [0.42, 0.68]) {
      const p = go(c, a, r * t);
      for (const s of [-1, 1]) d += `M${pt(p)}L${pt(go(p, a + s * 48, r * 0.3 * (1.25 - t)))}`;
    }
  }
  return `<path d="${d}" stroke="#000" stroke-width="${r1(Math.max(0.8, r * 0.1))}" stroke-linecap="round" fill="none"/>`;
}

export function snowFoil(): string {
  const rand = rng(301);
  let s = '';
  for (const [x, y, r] of [[176, 32, 12], [128, 72, 8], [228, 76, 8.5], [40, 110, 6.5], [324, 104, 7], [84, 134, 5], [282, 136, 5], [180, 106, 5.5]] as const) s += snowflake([x, y], r, rand() * 30);
  for (let i = 0; i < 14; i++) s += `<circle cx="${r1(20 + rand() * 320)}" cy="${r1(20 + rand() * 120)}" r="${r1(0.8 + rand() * 1)}"/>`;
  return svgDoc(360, 150, s);
}

export function snowDivider(): string {
  let s = snowflake([100, 15], 8.5, 0) + snowflake([78, 15], 3.6, 10) + snowflake([122, 15], 3.6, 10);
  for (const m of [1, -1]) s += `<path d="${brush(cubic([100 + m * 30, 15], [100 + m * 50, 15], [100 + m * 70, 15], [100 + m * 92, 15], 20), taper(1.2, 0.15))}"/>`;
  return svgDoc(200, 30, s);
}

/** Gentle wave with dots (seaside), 200×24. */
export function waveDivider(): string {
  const pts: P[] = [];
  for (let i = 0; i <= 60; i++) {
    const x = 22 + (156 * i) / 60;
    pts.push([x, 12 + 3.2 * Math.sin(rad((x - 22) * 6.9))]);
  }
  return svgDoc(200, 24, `<path d="${brush(pts, taper(1.7, 0.4))}"/><circle cx="14" cy="12" r="2"/><circle cx="186" cy="12" r="2"/>`);
}

