/**
 * Invitation themes in the "luxury stationery" style: cotton paper, hot-foil gold, watercolor and wax.
 * Colours and typography live in public/css/invite.css (class "t-<id>"); the artwork is drawn here,
 * once per isolate, and shipped as inline CSS (data URIs) so every page only carries its own theme.
 */
import { type P, type WaxColors, along, blurFilter, brush, cubic, dataUri, leafHalves, linen, paperGrain, placeAt, r1, rad, rng, spiral, svgDoc, taper, taperEnd, waxSeal, wcFilter } from './art';
import type { EventType, ThemeId } from './types';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  desc: string;
  /** paper, accent, ink: used for the theme picker swatches and the browser bar */
  swatches: [string, string, string];
  demoEvent: EventType;
  /** font files to preload on the invitation page */
  fonts: string[];
}

const FONTS = ['cormorant-garamond-latin-600-normal', 'jost-latin-400-normal', 'jost-latin-500-normal'];

export const THEMES: ThemeDef[] = [
  { id: 'avorio', name: 'Avorio e oro', desc: 'Carta di cotone avorio, stemma d’alloro e calligrafia in oro a caldo', swatches: ['#fbf7ef', '#a8843f', '#2b241d'], demoEvent: 'anniversario', fonts: FONTS },
  { id: 'ulivo', name: 'Ulivo', desc: 'Rami d’ulivo dipinti ad acquerello e nomi in oro', swatches: ['#f9f8f2', '#7d8d5e', '#2f3a2c'], demoEvent: 'matrimonio', fonts: FONTS },
  { id: 'limoni', name: 'Amalfi', desc: 'Limoni ad acquerello e calligrafia blu cobalto, come le maioliche', swatches: ['#fefdf9', '#1f3f78', '#f2c94c'], demoEvent: 'festa', fonts: FONTS },
  { id: 'notte', name: 'Mezzanotte', desc: 'Carta blu notte, luna e stelle in oro: per le feste di sera', swatches: ['#161c33', '#d6b56e', '#efe6d0'], demoEvent: 'diciottesimo', fonts: FONTS },
  { id: 'alloro', name: 'Alloro', desc: 'Corona d’alloro in oro e nastro rosso: il classico della laurea', swatches: ['#fbf6ee', '#8f1d22', '#2d2522'], demoEvent: 'laurea', fonts: FONTS },
  { id: 'cielo', name: 'Cielo', desc: 'Nuvole ad acquerello, luna e stelle color champagne', swatches: ['#fbfcfd', '#7f9cc4', '#263248'], demoEvent: 'battesimo', fonts: FONTS },
  { id: 'cipria', name: 'Cipria', desc: 'Rose ad acquerello e dettagli in oro rosa', swatches: ['#fefaf8', '#c98e8a', '#4a2f2f'], demoEvent: 'babyshower', fonts: FONTS },
  { id: 'spiga', name: 'Grano', desc: 'Corona di spighe in oro su carta crema: sobrio e luminoso', swatches: ['#fcf8ef', '#b08a4a', '#3b3125'], demoEvent: 'comunione', fonts: FONTS },
  { id: 'coriandoli', name: 'Gala', desc: 'Busta nera e coriandoli d’oro: la festa elegante', swatches: ['#fbf8f1', '#b8924a', '#1f1a17'], demoEvent: 'compleanno', fonts: FONTS },
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<ThemeId, ThemeDef>;
export const isTheme = (v: unknown): v is ThemeId => typeof v === 'string' && v in THEME_BY_ID;

// ---------------------------------------------------------------------------
// Painting helpers (watercolor)
// ---------------------------------------------------------------------------

type Pair = [string, string];
const pick = <T>(a: T[], rand: () => number): T => a[Math.floor(rand() * a.length)];

/** A set of watercolor filters w0…w{n-1} with different edges. */
function wcSet(n: number, o: Parameters<typeof wcFilter>[1] = {}) {
  let s = '';
  for (let i = 0; i < n; i++) s += wcFilter(`w${i}`, { ...o, seed: (o.seed ?? 3) + i * 7 });
  return s;
}

/** Soft wash without pigment rims (skies, clouds). */
const softWash = (id: string, seed: number, blur = 1.6) =>
  `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="4" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="${blur}" result="b"/><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="${seed + 3}" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -.7 1.22" result="ga"/><feComposite in="b" in2="ga" operator="in"/></filter>`;

function paintLeaf(at: P, angle: number, len: number, wid: number, c: Pair, f: string, gap = 0.7, belly = 0.34): string {
  const [up, lo] = leafHalves(len, wid, gap, belly);
  return placeAt(at, angle, `<g filter="url(#${f})"><path d="${up}" fill="${c[0]}"/><path d="${lo}" fill="${c[1]}"/></g>`);
}

const paintStem = (pts: P[], width: number, color: string, f: string) => `<path d="${brush(pts, taperEnd(width, width * 0.3))}" fill="${color}" filter="url(#${f})"/>`;

interface SprigSpec {
  stem: P[];
  leaves: number;
  len: number;
  /** leaf width relative to its length */
  wid: number;
  spread: [number, number];
  colors: Pair[];
  stemColor: string;
  stemWidth: number;
  seed: number;
  start?: number;
  tip?: boolean;
  belly?: number;
}

function paintSprig(s: SprigSpec): string {
  const rand = rng(s.seed);
  let out = paintStem(s.stem, s.stemWidth, s.stemColor, 'w0');
  const start = s.start ?? 0.08;
  for (let i = 0; i < s.leaves; i++) {
    const t = start + ((0.97 - start) * i) / Math.max(1, s.leaves - 1);
    const { p, angle } = along(s.stem, t);
    const side = i % 2 ? 1 : -1;
    const len = s.len * (1 - 0.35 * t) * (0.85 + rand() * 0.3);
    const c = pick(s.colors, rand);
    out += paintLeaf(p, angle + side * (s.spread[0] + rand() * (s.spread[1] - s.spread[0])), len, len * s.wid, side < 0 ? c : [c[1], c[0]], `w${1 + (i % 3)}`, 0.7, s.belly);
  }
  if (s.tip) {
    const end = along(s.stem, 1);
    out += paintLeaf(end.p, end.angle, s.len * 0.62, s.len * 0.62 * s.wid, s.colors[0], 'w2', 0.6, s.belly);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Foil helpers (black shapes, used as CSS masks over a metallic gradient)
// ---------------------------------------------------------------------------

function foilLeaf(at: P, angle: number, len: number, wid: number, gap = 0.9, belly = 0.34): string {
  const [up, lo] = leafHalves(len, wid, gap, belly);
  return placeAt(at, angle, `<path d="${up}"/><path d="${lo}"/>`);
}

function sparkle(c: P, s: number, thin = 0.18): string {
  const [x, y] = c;
  const k = s * thin;
  return `<path d="M${r1(x)} ${r1(y - s)}Q${r1(x + k)} ${r1(y - k)} ${r1(x + s)} ${r1(y)}Q${r1(x + k)} ${r1(y + k)} ${r1(x)} ${r1(y + s)}Q${r1(x - k)} ${r1(y + k)} ${r1(x - s)} ${r1(y)}Q${r1(x - k)} ${r1(y - k)} ${r1(x)} ${r1(y - s)}Z"/>`;
}

function star5(c: P, outer: number, inner = outer * 0.42, rot = -90): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = rad(rot + i * 36);
    d += `${i ? 'L' : 'M'}${r1(c[0] + r * Math.cos(a))} ${r1(c[1] + r * Math.sin(a))}`;
  }
  return `<path d="${d}Z"/>`;
}

/** Crescent opening to the right, tilted. */
function crescent(c: P, r: number, tilt = -28): string {
  const [x, y] = c;
  const inner = r1(r * 1.22);
  return `<path transform="rotate(${tilt} ${x} ${y})" d="M${x} ${r1(y - r)}A${r} ${r} 0 1 0 ${x} ${r1(y + r)}A${inner} ${inner} 0 0 1 ${x} ${r1(y - r)}Z"/>`;
}

/** Hairline that swells in the middle, with a dot at the far end. */
const hairline = (a: P, b: P, w = 1.5, dot = 1.3) =>
  `<path d="${brush(cubic(a, [a[0] + (b[0] - a[0]) / 3, a[1]], [a[0] + (2 * (b[0] - a[0])) / 3, b[1]], b, 24), taper(w, 0.15))}"/>` + (dot ? `<circle cx="${r1(b[0])}" cy="${r1(b[1])}" r="${dot}"/>` : '');

/** Calligraphic curl winding into a spiral. */
function curl(c: P, r0: number, a0: number, turns: number, w: number): string {
  const pts = spiral(c, r0, r0 * 0.18, a0, turns, 36);
  return `<path d="${brush(pts, (t) => 0.25 + w * (1 - t) ** 1.2)}"/>`;
}

// ---------------------------------------------------------------------------
// Foil pieces
// ---------------------------------------------------------------------------

/** Classic scroll divider, 260×44, centred on (130,22). */
function filigreeDivider(): string {
  let s = `<path d="M130 13L136.5 22L130 31L123.5 22Z"/>`;
  for (const m of [1, -1]) {
    const X = (x: number) => 130 + m * x;
    const lead = cubic([X(8), 22], [X(14), 22], [X(20), 15], [X(28), 15], 14);
    const coil = spiral([X(28), 21.5], 6.5, 1.2, m > 0 ? -90 : 270, m > 0 ? 1.15 : -1.15, 34);
    s += `<path d="${brush(lead.concat(coil.slice(1)), (t) => 0.3 + 2.1 * Math.sin(Math.PI * Math.min(1, t * 1.6)) * (1 - t * 0.7))}"/>`;
    const tail = cubic([X(13), 24], [X(20), 31], [X(36), 31], [X(44), 25], 18);
    s += `<path d="${brush(tail, taper(1.6, 0.25))}"/>`;
    s += hairline([X(46), 22], [X(124), 22], 1.6, 1.4);
    s += foilLeaf([X(40), 18], m > 0 ? -35 : 215, 9, 2.6, 0.5);
  }
  return svgDoc(260, 44, s);
}

/** Art-deco divider, 260×30. */
function decoDivider(): string {
  let s = `<path fill-rule="evenodd" d="M130 6L139 15L130 24L121 15ZM130 10.5L125.5 15L130 19.5L134.5 15Z"/>`;
  for (const m of [1, -1]) {
    const X = (x: number) => 130 + m * x;
    const [a, b] = m > 0 ? [X(13), X(122)] : [X(122), X(13)];
    const [c, d] = m > 0 ? [X(16), X(70)] : [X(70), X(16)];
    s += `<path d="M${a} 14.4H${b}V15.6H${a}Z"/>`;
    s += `<path d="M${c} 10.6H${d}V11.2H${c}ZM${c} 18.8H${d}V19.4H${c}Z"/>`;
    s += `<circle cx="${X(126)}" cy="15" r="1.5"/>`;
    s += `<path d="M${X(74)} 15L${X(78)} 11L${X(82)} 15L${X(78)} 19Z"/>`;
  }
  return svgDoc(260, 30, s);
}

/** Leafy sprig divider (olive, laurel, generic leaf), 200×36. */
function sprigDivider(kind: 'olive' | 'laurel' | 'leaf'): string {
  let s = `<circle cx="100" cy="18" r="2"/>`;
  for (const m of [1, -1]) {
    const X = (x: number) => 100 + m * x;
    const stem = cubic([X(6), 18], [X(30), 19], [X(55), 17], [X(86), 13], 30);
    s += `<path d="${brush(stem, taperEnd(1.3, 0.3))}"/>`;
    const n = kind === 'laurel' ? 7 : 6;
    for (let i = 0; i < n; i++) {
      const { p, angle } = along(stem, 0.14 + (0.84 * i) / (n - 1));
      const k = 1 - 0.35 * (i / n);
      if (kind === 'laurel') {
        s += foilLeaf(p, angle - 34, 11 * k, 3.6 * k, 0.6) + foilLeaf(p, angle + 34, 11 * k, 3.6 * k, 0.6);
      } else {
        const side = i % 2 ? 1 : -1;
        s += foilLeaf(p, angle + side * 36, (kind === 'olive' ? 15 : 12) * k, (kind === 'olive' ? 2.6 : 3.8) * k, 0.6, 0.4);
      }
    }
    const end = along(stem, 1);
    s += foilLeaf(end.p, end.angle, 8, kind === 'olive' ? 1.8 : 2.8, 0.5);
  }
  return svgDoc(200, 36, s);
}

/** Stars divider (sky themes), 200×30. */
function starDivider(): string {
  let s = sparkle([100, 15], 9, 0.16) + sparkle([82, 15], 4) + sparkle([118, 15], 4);
  for (const m of [1, -1]) s += hairline([100 + m * 26, 15], [100 + m * 92, 15], 1.2, 1.2);
  return svgDoc(200, 30, s);
}

/** Wheat divider, 220×34. */
function wheatDivider(): string {
  let s = `<circle cx="110" cy="17" r="1.8"/>`;
  for (const m of [1, -1]) {
    const X = (x: number) => 110 + m * x;
    const stem = cubic([X(6), 17], [X(30), 17], [X(60), 17], [X(100), 15], 24);
    s += `<path d="${brush(stem, taperEnd(1.2, 0.3))}"/>`;
    for (let i = 0; i < 6; i++) {
      const { p, angle } = along(stem, 0.45 + i * 0.1);
      for (const side of [-1, 1]) {
        const a = angle + side * 26;
        s += foilLeaf(p, a, 7.5, 2.6, 0.5, 0.45);
        const tip: P = [p[0] + Math.cos(rad(a)) * 7.5, p[1] + Math.sin(rad(a)) * 7.5];
        const tip2: P = [tip[0] + Math.cos(rad(a - side * 8)) * 7, tip[1] + Math.sin(rad(a - side * 8)) * 7];
        s += `<path d="${brush([tip, tip2], () => 0.45)}"/>`;
      }
    }
    const end = along(stem, 1);
    s += foilLeaf(end.p, end.angle, 8, 2.6, 0.5, 0.45);
  }
  return svgDoc(220, 34, s);
}

/** Points along the left half of a wreath (bottom → top). */
function wreathArc(c: P, r: number, from: number, sweep: number): P[] {
  const arc: P[] = [];
  for (let i = 0; i <= 40; i++) {
    const a = rad(from + (sweep * i) / 40);
    arc.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return arc;
}

const mirrorHalf = (side: string, w = 200) => side + `<g transform="translate(${w} 0) scale(-1 1)">${side}</g>`;

/** Laurel wreath around a monogram, 200×200 (centre 100,102). */
function laurelWreath(berries = true): string {
  const arc = wreathArc([100, 102], 74, 104, 148);
  let side = `<path d="${brush(arc, (t) => 2.4 - 1.6 * t)}"/>`;
  const n = 11;
  for (let i = 0; i < n; i++) {
    const t = 0.06 + (0.88 * i) / (n - 1);
    const { p, angle } = along(arc, t);
    const k = 1 - 0.42 * t;
    side += foilLeaf(p, angle - 38, 23 * k, 7 * k, 1) + foilLeaf(p, angle + 36, 21 * k, 6.4 * k, 1);
  }
  const end = along(arc, 1);
  side += foilLeaf(end.p, end.angle, 15, 4.6, 0.9);
  if (berries) {
    for (const t of [0.22, 0.47, 0.71]) {
      const { p, angle } = along(arc, t);
      const a = rad(angle + 90);
      side += `<circle cx="${r1(p[0] + Math.cos(a) * 8)}" cy="${r1(p[1] + Math.sin(a) * 8)}" r="2.4"/>`;
    }
  }
  side += `<path d="${brush(cubic([82, 172], [94, 178], [106, 182], [116, 186], 12), taperEnd(2.2, 0.4))}"/>`;
  return svgDoc(200, 200, mirrorHalf(side));
}

/** Wreath of two wheat stalks tied with a bow, 200×200. */
function wheatWreath(): string {
  const arc = wreathArc([100, 102], 72, 102, 150);
  let side = `<path d="${brush(arc, (t) => 2 - 1.2 * t)}"/>`;
  for (const [t, d, l] of [[0.12, 1, 46], [0.2, -1, 38]] as const) {
    const { p, angle } = along(arc, t);
    side += foilLeaf(p, angle + d * 16, l, 3.4, 0.7, 0.2);
  }
  for (let i = 0; i < 9; i++) {
    const t = 0.5 + i * 0.058;
    const { p, angle } = along(arc, t);
    const k = 1 - 0.25 * (i / 9);
    for (const sd of [-1, 1]) {
      const a = angle + sd * 30;
      side += foilLeaf(p, a, 11 * k, 4.2 * k, 0.7, 0.46);
      const tip: P = [p[0] + Math.cos(rad(a)) * 11 * k, p[1] + Math.sin(rad(a)) * 11 * k];
      const tip2: P = [tip[0] + Math.cos(rad(a - sd * 10)) * 11, tip[1] + Math.sin(rad(a - sd * 10)) * 11];
      side += `<path d="${brush([tip, tip2], (q) => 0.7 - 0.4 * q)}"/>`;
    }
  }
  const end = along(arc, 1);
  side += foilLeaf(end.p, end.angle, 12, 4.2, 0.7, 0.46);
  side += `<path d="${brush(cubic([84, 170], [95, 177], [106, 181], [115, 185], 12), taperEnd(2, 0.4))}"/>`;
  const knot =
    `<ellipse cx="100" cy="176" rx="5" ry="4"/><path d="M96 176C88 170 80 170 79 175C78 181 88 182 96 177Z"/><path d="M104 176C112 170 120 170 121 175C122 181 112 182 104 177Z"/>` +
    `<path d="${brush(cubic([98, 179], [94, 186], [90, 192], [85, 197], 10), taper(3.2, 1))}"/><path d="${brush(cubic([102, 179], [106, 186], [110, 192], [115, 197], 10), taper(3.2, 1))}"/>`;
  return svgDoc(200, 200, mirrorHalf(side) + knot);
}

/** Filigree corner (top-left), 100×100. */
function filigreeCorner(): string {
  const edge = (t: number) => 0.2 + 2 * Math.sin(Math.PI * Math.min(1, 0.15 + t)) * (1 - t) ** 0.6;
  let s = curl([21, 21], 11, 225, -1.15, 2.6);
  s += `<path d="${brush(cubic([20, 10], [40, 4], [62, 9], [94, 6], 30), edge)}"/>`;
  s += `<path d="${brush(cubic([10, 20], [4, 40], [9, 62], [6, 94], 30), edge)}"/>`;
  s += `<circle cx="96" cy="6" r="1.3"/><circle cx="6" cy="96" r="1.3"/>`;
  s += foilLeaf([31, 31], 45, 15, 4.6, 0.8);
  s += foilLeaf([33, 30], 10, 10, 3, 0.6) + foilLeaf([30, 33], 80, 10, 3, 0.6);
  s += curl([48, 15], 4.5, 120, 1, 1.4) + curl([15, 48], 4.5, 330, -1, 1.4);
  s += `<path d="${brush(cubic([28, 13], [36, 18], [42, 18], [46, 16], 12), taper(1.3, 0.2))}"/>`;
  s += `<path d="${brush(cubic([13, 28], [18, 36], [18, 42], [16, 46], 12), taper(1.3, 0.2))}"/>`;
  return svgDoc(100, 100, s);
}

/** Art-deco corner (top-left), 100×100. */
function decoCorner(): string {
  let s = `<path d="M3 97V3H97V4.4H4.4V97Z"/><path d="M10 97V10H97V10.7H10.7V97Z"/>`;
  for (let i = 0; i <= 6; i++) {
    const a = rad(i * 15);
    const r0 = 6;
    const rr = i % 2 ? 22 : 30;
    s += `<path d="${brush([[10.4 + r0 * Math.cos(a), 10.4 + r0 * Math.sin(a)], [10.4 + rr * Math.cos(a), 10.4 + rr * Math.sin(a)]], (t) => 1.1 - 0.7 * t)}"/>`;
  }
  s += `<path d="M24 3.5L27 7L24 10.5L21 7Z"/><path d="M3.5 24L7 27L10.5 24L7 21Z"/>`;
  return svgDoc(100, 100, s);
}

/** Night sky above the names (foil), 360×130. */
function nightSky(): string {
  const rand = rng(21);
  let s = crescent([180, 56], 25);
  const big: [number, number, number][] = [
    [128, 40, 7], [236, 30, 8], [98, 74, 4.5], [266, 70, 5], [150, 92, 3.5], [212, 96, 4], [64, 38, 3.5], [300, 44, 4], [40, 80, 3], [324, 92, 3],
  ];
  for (const [x, y, r] of big) s += sparkle([x, y], r);
  for (let i = 0; i < 24; i++) s += `<circle cx="${r1(12 + rand() * 336)}" cy="${r1(8 + rand() * 112)}" r="${r1(0.5 + rand() * 0.8)}"/>`;
  for (const l of [[[64, 38], [98, 74], [128, 40]], [[236, 30], [266, 70], [300, 44]]] as P[][]) for (let i = 1; i < l.length; i++) s += `<path d="${brush([l[i - 1], l[i]], () => 0.45)}"/>`;
  return svgDoc(360, 130, s);
}

/** Crescent and stars over the clouds (foil, champagne), 360×150. */
function cieloFoil(): string {
  let s = crescent([292, 40], 15, -20);
  for (const [x, y, r] of [[96, 26, 6], [150, 18, 4], [224, 30, 5], [60, 84, 3.4], [318, 92, 3.6], [190, 70, 2.6]] as const) s += star5([x, y], r);
  for (const [x, y] of [[120, 52], [256, 64], [36, 40], [340, 28], [170, 100]] as const) s += `<circle cx="${x}" cy="${y}" r="1.2"/>`;
  return svgDoc(360, 150, s);
}

/** Gold confetti scattered around the top of the card, 360×210. */
function confettiFoil(): string {
  const rand = rng(33);
  let s = '';
  for (let i = 0; i < 70; i++) {
    let x = 0;
    let y = 0;
    do {
      x = rand() * 360;
      y = rand() * 210;
    } while (y > 40 && x > 46 && x < 314);
    const rot = Math.round(rand() * 180);
    const kind = i % 5;
    if (kind === 0 || kind === 3) s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(1.4 + rand() * 2.6)}"/>`;
    else if (kind === 1) s += `<rect x="${r1(x)}" y="${r1(y)}" width="3.2" height="9" rx=".6" transform="rotate(${rot} ${r1(x)} ${r1(y)})"/>`;
    else if (kind === 2) s += `<g transform="rotate(${rot} ${r1(x)} ${r1(y)})"><path d="${brush(cubic([x, y], [x + 6, y - 7], [x + 12, y + 7], [x + 18, y], 14), () => 1.6)}"/></g>`;
    else s += sparkle([x, y], 3 + rand() * 2.5);
  }
  return svgDoc(360, 210, s);
}

// ---------------------------------------------------------------------------
// Paintings
// ---------------------------------------------------------------------------

const OLIVE: Pair[] = [
  ['#9aa97b', '#7d8d5e'],
  ['#a9b78c', '#8a9a6b'],
  ['#8c9c6c', '#6f7f52'],
  ['#b4bf98', '#93a278'],
];

function olivePainting(): string {
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

function oliveSmall(): string {
  const defs = wcSet(4, { seed: 5, alpha: 0.78 });
  const half = (seed: number) => {
    const stem = cubic([100, 34], [80, 30], [50, 26], [8, 28], 30);
    return paintSprig({ stem, leaves: 9, len: 24, wid: 0.17, spread: [30, 48], colors: OLIVE, stemColor: '#8a7a58', stemWidth: 2.2, seed, tip: true, belly: 0.36 });
  };
  return svgDoc(200, 56, mirrorHalf(half(2)) + `<ellipse cx="100" cy="38" rx="5" ry="3.6" fill="#59613a" filter="url(#w2)"/>`, defs);
}

const LEMON = 'M-24 0C-24-13-10-18 4-17C16-16 24-9 26-3L30 0L26 3C24 9 16 16 4 17C-10 18-24 13-24 0Z';
const LEMON_SHADE = 'M-23 3C-20 12-8 17 4 16C15 15 22 9 26 2L29 0L26-1C21 6 12 10 2 10C-8 10-17 8-23 3Z';
const LEMON_GLOW = 'M-14-8C-8-13 2-14 10-12';
const LEAF_GREEN: Pair[] = [
  ['#5f8a45', '#46703a'],
  ['#6f9a52', '#557f40'],
  ['#4f7a3a', '#3c6330'],
  ['#7aa35a', '#5d8744'],
];

function lemon(at: P, rot: number, s: number): string {
  return placeAt(
    at,
    rot,
    `<g filter="url(#w4)"><path d="${LEMON}" fill="#f7d65e"/></g><g filter="url(#b)"><path d="${LEMON_SHADE}" fill="#e2a62c" opacity=".62"/></g><path d="${LEMON_GLOW}" stroke="#fff6c8" stroke-width="4" stroke-linecap="round" fill="none" opacity=".55" filter="url(#b)"/><circle cx="-23" cy="0" r="2.2" fill="#7f8a3a" filter="url(#w0)"/>`,
    s,
  );
}

function lemonPainting(): string {
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

function lemonSmall(): string {
  const defs = wcSet(5, { seed: 13, alpha: 0.8 }) + blurFilter('b', 2);
  const stem = cubic([60, 8], [80, 6], [100, 8], [130, 14], 20);
  let s = paintSprig({ stem, leaves: 5, len: 26, wid: 0.3, spread: [40, 60], colors: LEAF_GREEN, stemColor: '#7a6a4a', stemWidth: 2.2, seed: 4, tip: true, belly: 0.3 });
  s += lemon([98, 40], 96, 0.85);
  return svgDoc(200, 74, s, defs);
}

const ROSE = { light: '#f4cbc6', mid: '#e7a5a0', dark: '#c7737b', deep: '#a9555f' };
const SAGE: Pair[] = [
  ['#a7b596', '#8c9c7b'],
  ['#b9c5a9', '#9caf8c'],
  ['#9aab8a', '#7f9170'],
];

function rose(c: P, R: number, rand: () => number): string {
  let s = `<circle cx="${r1(c[0])}" cy="${r1(c[1])}" r="${r1(R)}" fill="${ROSE.light}" filter="url(#w1)"/>`;
  let a = rand() * 360;
  for (let k = 0; k < 9; k++) {
    const rr = R * (0.86 - k * 0.085);
    const arc = spiral(c, rr, rr * 0.9, a, 0.24 + rand() * 0.12, 14);
    const col = k < 3 ? ROSE.mid : k < 6 ? ROSE.dark : ROSE.deep;
    s += `<path d="${brush(arc, taper(R * (0.2 - k * 0.012), R * 0.03))}" fill="${col}" opacity="${r1(0.62 + k * 0.04)}" filter="url(#w${2 + (k % 3)})"/>`;
    a += 137.5;
  }
  return s + `<circle cx="${r1(c[0] + R * 0.06)}" cy="${r1(c[1] - R * 0.04)}" r="${r1(R * 0.12)}" fill="${ROSE.deep}" filter="url(#w3)"/>`;
}

function rosebud(c: P, angle: number, s: number): string {
  return placeAt(
    c,
    angle,
    `<g filter="url(#w2)"><path d="M0 0C-6-4-6-14 0-20C6-14 6-4 0 0Z" fill="${ROSE.mid}"/></g><g filter="url(#w3)"><path d="M0 0C-3-6-2-12 1-18C3-10 3-5 0 0Z" fill="${ROSE.dark}"/></g><g filter="url(#w1)"><path d="M0 0C-7 2-9-6-6-10C-4-5-2-2 0 0ZM0 0C7 2 9-6 6-10C4-5 2-2 0 0Z" fill="#9caf8c"/></g>`,
    s,
  );
}

function roseCluster(seed: number): string {
  const rand = rng(seed);
  let s = '';
  const stems: P[][] = [cubic([-6, 30], [30, 30], [70, 44], [118, 40], 30), cubic([10, -6], [20, 30], [40, 60], [46, 104], 30), cubic([30, 10], [70, 0], [110, 4], [150, 16], 30)];
  stems.forEach((stem, i) => {
    s += paintSprig({ stem, leaves: 7 + i, len: 24, wid: 0.36, spread: [38, 64], colors: SAGE, stemColor: '#8c9c7b', stemWidth: 1.6, seed: seed + i, tip: true, belly: 0.3 });
  });
  s += rose([26, 24], 30, rand) + rose([74, 26], 20, rand) + rose([30, 70], 15, rand);
  s += rosebud([110, 38], 70, 0.9) + rosebud([52, 96], 160, 0.8);
  for (let i = 0; i < 9; i++) s += `<circle cx="${r1(90 + rand() * 50)}" cy="${r1(46 + rand() * 30)}" r="${r1(1.6 + rand() * 1.4)}" fill="${ROSE.mid}" opacity=".7" filter="url(#w2)"/>`;
  return s;
}

function rosePainting(): string {
  const defs = wcSet(5, { seed: 17, alpha: 0.8 });
  return svgDoc(360, 150, roseCluster(3) + `<g transform="translate(360 0) scale(-1 1)">${roseCluster(8)}</g>`, defs);
}

function roseSmall(): string {
  const defs = wcSet(5, { seed: 19, alpha: 0.8 });
  const rand = rng(5);
  let s = '';
  for (const m of [1, -1]) {
    const stem = cubic([100, 34], [80, 30], [60, 32], [30, 26], 20).map(([x, y]) => [m > 0 ? x : 200 - x, y] as P);
    s += paintSprig({ stem, leaves: 6, len: 20, wid: 0.36, spread: [38, 60], colors: SAGE, stemColor: '#8c9c7b', stemWidth: 1.4, seed: 7 + m, tip: true, belly: 0.3 });
  }
  s += rose([100, 32], 15, rand);
  return svgDoc(200, 64, s, defs);
}

function cloud(x: number, y: number, k: number, fill: string, f: string): string {
  const bumps: [number, number, number][] = [[0, 0, 13], [15, -9, 16], [33, -4, 13], [46, 2, 10], [24, 5, 12], [-11, 4, 9], [8, 6, 11]];
  return `<g filter="url(#${f})">${bumps.map(([bx, by, br]) => `<circle cx="${r1(x + bx * k)}" cy="${r1(y + by * k)}" r="${r1(br * k)}" fill="${fill}"/>`).join('')}</g>`;
}

function cloudPainting(): string {
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
function ribbonPainting(): string {
  const defs = wcSet(3, { seed: 23, alpha: 0.86 });
  const red = '#a3252b';
  const dark = '#7c171c';
  const s =
    `<g filter="url(#w0)"><path d="M100 178C88 166 70 164 68 172C66 182 86 186 100 180Z" fill="${red}"/><path d="M100 178C112 166 130 164 132 172C134 182 114 186 100 180Z" fill="${red}"/></g>` +
    `<g filter="url(#w1)"><path d="M97 181L84 199L90 197L93 203L101 183Z" fill="${dark}"/><path d="M103 181L116 199L110 197L107 203L99 183Z" fill="${dark}"/></g>` +
    `<g filter="url(#w2)"><ellipse cx="100" cy="179" rx="5.5" ry="4.6" fill="${dark}"/></g>`;
  return svgDoc(200, 200, s, defs);
}

// ---------------------------------------------------------------------------
// Envelope liners (tiles)
// ---------------------------------------------------------------------------

function liner(id: ThemeId): { img: string; size: number } {
  switch (id) {
    case 'avorio': {
      const g = '#c9a65f';
      return {
        size: 30,
        img: svgDoc(30, 30, `<rect width="30" height="30" fill="#5c1824"/><path d="M0 15L15 0L30 15L15 30Z" fill="none" stroke="${g}" stroke-width=".7" opacity=".75"/><circle cx="15" cy="15" r="2.2" fill="${g}" opacity=".8"/><circle cx="0" cy="0" r="1" fill="${g}"/><circle cx="30" cy="0" r="1" fill="${g}"/><circle cx="0" cy="30" r="1" fill="${g}"/><circle cx="30" cy="30" r="1" fill="${g}"/>`),
      };
    }
    case 'ulivo': {
      const rand = rng(4);
      let s = `<rect width="64" height="64" fill="#cfd6c0"/>`;
      for (const [x, y, a] of [[8, 12, 30], [40, 6, 150], [22, 40, -40], [52, 44, 60], [4, 52, 200]] as const) s += paintLeaf([x, y], a, 18, 3.2, pick(OLIVE, rand), `w${Math.floor(rand() * 3)}`, 0.5, 0.36);
      s += `<circle cx="36" cy="28" r="3" fill="#59613a" opacity=".85"/>`;
      return { size: 64, img: svgDoc(64, 64, s, wcSet(3, { seed: 31, alpha: 0.8, disp: 3 })) };
    }
    case 'limoni': {
      const b = '#1f3f78';
      return {
        size: 56,
        img: svgDoc(
          56,
          56,
          `<rect width="56" height="56" fill="#fbfaf5"/><path d="M28 4L52 28L28 52L4 28Z" fill="none" stroke="${b}" stroke-width="1.6"/><path d="M28 13L43 28L28 43L13 28Z" fill="none" stroke="#5b86c4" stroke-width="1"/><circle cx="28" cy="28" r="6" fill="#f2c94c"/><circle cx="28" cy="28" r="2.4" fill="${b}"/><path d="M0 0h10M46 0h10M0 56h10M46 56h10M0 0v10M56 0v10M0 46v10M56 46v10" stroke="${b}" stroke-width="4"/><path d="M28 0v4M28 52v4M0 28h4M52 28h4" stroke="${b}" stroke-width="1.4"/>`,
        ),
      };
    }
    case 'notte':
      return { size: 64, img: svgDoc(64, 64, `<rect width="64" height="64" fill="#141a35"/><g fill="#d6b56e">${sparkle([16, 18], 4.5)}${sparkle([46, 44], 3)}<circle cx="44" cy="12" r=".9"/><circle cx="10" cy="48" r=".8"/><circle cx="56" cy="26" r=".7"/><circle cx="28" cy="56" r=".9"/></g>`) };
    case 'alloro': {
      const stem = cubic([10, 34], [16, 26], [24, 18], [34, 10], 12);
      let sprig = `<path d="${brush(stem, taperEnd(1, 0.3))}"/>`;
      for (let i = 0; i < 4; i++) {
        const { p, angle } = along(stem, 0.2 + i * 0.25);
        sprig += foilLeaf(p, angle - 40, 7, 2.4, 0.4) + foilLeaf(p, angle + 40, 7, 2.4, 0.4);
      }
      return { size: 44, img: svgDoc(44, 44, `<rect width="44" height="44" fill="#7d1a1f"/><g fill="#d4b06a" opacity=".85">${sprig}</g>`) };
    }
    case 'cielo':
      return {
        size: 72,
        img: svgDoc(72, 72, `<rect width="72" height="72" fill="#d6e2ef"/>${cloud(14, 20, 0.45, '#fff', 's0')}${cloud(44, 54, 0.38, '#f3f7fb', 's0')}<g fill="#cdb98a">${star5([52, 16], 3)}${star5([16, 54], 2.4)}</g>`, softWash('s0', 3, 1)),
      };
    case 'cipria': {
      const bloom = (x: number, y: number, r: number) => {
        let s = '';
        for (let i = 0; i < 5; i++) {
          const a = rad(i * 72 - 90);
          const cx = r1(x + r * Math.cos(a));
          const cy = r1(y + r * Math.sin(a));
          s += `<ellipse cx="${cx}" cy="${cy}" rx="${r1(r * 0.8)}" ry="${r1(r * 0.55)}" transform="rotate(${i * 72} ${cx} ${cy})"/>`;
        }
        return s;
      };
      return { size: 44, img: svgDoc(44, 44, `<rect width="44" height="44" fill="#eed2ce"/><g fill="#c79a8a" opacity=".9">${bloom(12, 12, 3)}${bloom(34, 32, 2.4)}</g><circle cx="12" cy="12" r="1.3" fill="#fbeee9"/><circle cx="34" cy="32" r="1" fill="#fbeee9"/>`) };
    }
    case 'spiga': {
      let s = '';
      for (const [x, y] of [[10, 10], [30, 30]] as const) {
        s += `<path d="M${x} ${y + 9}L${x} ${y - 9}" stroke="#b08a4a" stroke-width=".6"/>`;
        for (let i = 0; i < 3; i++) s += foilLeaf([x, y + 4 - i * 4], -60, 5, 1.8, 0.3) + foilLeaf([x, y + 4 - i * 4], -120, 5, 1.8, 0.3);
      }
      return { size: 40, img: svgDoc(40, 40, `<rect width="40" height="40" fill="#efe3c7"/><g fill="#b08a4a">${s}</g>`) };
    }
    case 'coriandoli':
      return {
        size: 60,
        img: svgDoc(60, 60, `<rect width="60" height="60" fill="#171514"/><g fill="#c9a65f"><circle cx="10" cy="12" r="2.4"/><circle cx="44" cy="40" r="1.6"/><rect x="38" y="8" width="2.6" height="8" rx=".5" transform="rotate(35 39 12)"/><rect x="14" y="40" width="2.6" height="8" rx=".5" transform="rotate(-30 15 44)"/>${sparkle([30, 26], 3)}<circle cx="52" cy="54" r="1"/></g>`),
      };
  }
}

// ---------------------------------------------------------------------------
// Per-theme recipes
// ---------------------------------------------------------------------------

interface Recipe {
  /** watercolor painting at the top of the invitation */
  paintTop?: string;
  /** gold foil at the top of the invitation (same frame as the painting) */
  foilTop?: string;
  /** wreath around the monogram, plus an optional painted detail in the same 200×200 frame */
  crest?: string;
  crestPaint?: string;
  divider: string;
  /** top-left corner flourish, mirrored to the other three corners */
  corner?: string;
  /** small painting closing the details card */
  paintEnd?: string;
  scatter?: string;
  seal: WaxColors;
  grain: { light?: boolean; amount?: number; cloud?: number };
  linen: number;
}

const recipeCache = new Map<ThemeId, Recipe>();
function recipe(id: ThemeId): Recipe {
  let r = recipeCache.get(id);
  if (!r) recipeCache.set(id, (r = drawRecipe(id)));
  return r;
}

function drawRecipe(id: ThemeId): Recipe {
  switch (id) {
    case 'avorio':
      return { crest: laurelWreath(), divider: filigreeDivider(), corner: filigreeCorner(), seal: { base: '#6e1f2b', light: '#a54553', dark: '#3e0c15' }, grain: {}, linen: 0.7 };
    case 'ulivo':
      return { paintTop: olivePainting(), divider: sprigDivider('olive'), paintEnd: oliveSmall(), seal: { base: '#5d6b45', light: '#8a9a69', dark: '#38422a' }, grain: {}, linen: 0.7 };
    case 'limoni':
      return { paintTop: lemonPainting(), divider: sprigDivider('leaf'), paintEnd: lemonSmall(), seal: { base: '#1f3f78', light: '#4a6fb0', dark: '#0f2148' }, grain: { amount: 0.06 }, linen: 0.7 };
    case 'notte':
      return { foilTop: nightSky(), divider: decoDivider(), corner: decoCorner(), seal: { base: '#b8924a', light: '#ecd38c', dark: '#7a5b25' }, grain: { light: true, amount: 0.06 }, linen: 0.7 };
    case 'alloro':
      return { crest: laurelWreath(false), crestPaint: ribbonPainting(), divider: sprigDivider('laurel'), seal: { base: '#8f1d22', light: '#c4454a', dark: '#560d12' }, grain: {}, linen: 0.7 };
    case 'cielo':
      return { paintTop: cloudPainting(), foilTop: cieloFoil(), divider: starDivider(), seal: { base: '#7f9cc4', light: '#b3c8e3', dark: '#4d6890' }, grain: { amount: 0.06 }, linen: 0.7 };
    case 'cipria':
      return { paintTop: rosePainting(), divider: filigreeDivider(), paintEnd: roseSmall(), seal: { base: '#b26c74', light: '#d99aa1', dark: '#7a3f47' }, grain: {}, linen: 0.7 };
    case 'spiga':
      return { crest: wheatWreath(), divider: wheatDivider(), seal: { base: '#a77b3c', light: '#d5a965', dark: '#6b4b1f' }, grain: {}, linen: 0.7 };
    case 'coriandoli':
      return { scatter: confettiFoil(), divider: decoDivider(), corner: decoCorner(), seal: { base: '#b8924a', light: '#ecd38c', dark: '#7a5b25' }, grain: {}, linen: 0.7 };
  }
}

// ---------------------------------------------------------------------------
// Public API: markup hooks + inline CSS
// ---------------------------------------------------------------------------

export interface Ornaments {
  /** artwork above the names */
  top: string;
  /** monogram crest above the names (the view adds the initials) */
  crest: boolean;
  divider: string;
  /** artwork closing the details card */
  bottom: string;
  /** decorative layer behind the hero */
  scatter?: string;
}

const viewBox = (svg: string) => svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!.slice(1, 3).join('/');

/** Mirrors a 100×100 corner drawing horizontally and/or vertically. */
const flipCorner = (c: string, sx: number, sy: number) =>
  c.replace(/(<svg[^>]*>)([\s\S]*)(<\/svg>)/, `$1<g transform="translate(${sx < 0 ? 100 : 0} ${sy < 0 ? 100 : 0}) scale(${sx} ${sy})">$2</g>$3`);

function buildOrnaments(id: ThemeId): Ornaments {
  const r = recipe(id);
  return {
    top: r.paintTop || r.foilTop ? '<div class="art art-top" aria-hidden="true"></div>' : '',
    crest: Boolean(r.crest),
    divider: '<div class="art art-div" aria-hidden="true"></div>',
    bottom: r.paintEnd ? '<div class="art art-end" aria-hidden="true"></div>' : '',
    scatter: r.scatter ? '<div class="scatter" aria-hidden="true"></div>' : undefined,
  };
}

function buildCss(id: ThemeId): string {
  const r = recipe(id);
  const t = `.t-${id}`;
  const ln = liner(id);
  const rules: string[] = [];
  const vars = [
    `--grain:${dataUri(paperGrain({ ...r.grain, seed: 3 }))}`,
    `--linen:${dataUri(linen(200, 9, r.linen))}`,
    `--liner:${dataUri(ln.img)}`,
    `--liner-size:${ln.size}px`,
    `--seal-img:${dataUri(waxSeal(r.seal, id.length * 7 + 3))}`,
    `--m-div:${dataUri(r.divider)}`,
    `--div-ar:${viewBox(r.divider)}`,
  ];
  rules.push(`${t}{${vars.join(';')}}`);
  if (r.paintTop || r.foilTop) {
    rules.push(`${t} .art-top{aspect-ratio:${viewBox((r.paintTop || r.foilTop)!)}${r.paintTop ? `;--paint:${dataUri(r.paintTop)}` : ''}}`);
    if (r.foilTop) rules.push(`${t} .art-top::after{content:"";-webkit-mask-image:${dataUri(r.foilTop)};mask-image:${dataUri(r.foilTop)}}`);
  }
  if (r.crest) {
    rules.push(`${t} .crest::before{-webkit-mask-image:${dataUri(r.crest)};mask-image:${dataUri(r.crest)}}`);
    if (r.crestPaint) rules.push(`${t} .crest{--paint:${dataUri(r.crestPaint)}}`);
  }
  if (r.corner) {
    const [tl, tr, bl, br] = [flipCorner(r.corner, 1, 1), flipCorner(r.corner, -1, 1), flipCorner(r.corner, 1, -1), flipCorner(r.corner, -1, -1)].map(dataUri);
    const layers = `${tl} top left/var(--corner) no-repeat,${tr} top right/var(--corner) no-repeat,${bl} bottom left/var(--corner) no-repeat,${br} bottom right/var(--corner) no-repeat`;
    rules.push(`${t} .sheet-main::after{content:"";-webkit-mask:${layers};mask:${layers}}`);
  }
  if (r.paintEnd) rules.push(`${t} .art-end{aspect-ratio:${viewBox(r.paintEnd)};--paint:${dataUri(r.paintEnd)}}`);
  if (r.scatter) rules.push(`${t} .scatter{-webkit-mask-image:${dataUri(r.scatter)};mask-image:${dataUri(r.scatter)}}`);
  return rules.join('\n');
}

const ornCache = new Map<ThemeId, Ornaments>();
export function ornaments(id: ThemeId): Ornaments {
  let o = ornCache.get(id);
  if (!o) ornCache.set(id, (o = buildOrnaments(id)));
  return o;
}

const cssCache = new Map<ThemeId, string>();
/** Theme artwork as CSS (inlined in the page, so only the chosen theme is downloaded). */
export function themeInlineCss(id: ThemeId): string {
  let c = cssCache.get(id);
  if (!c) cssCache.set(id, (c = buildCss(id)));
  return c;
}
