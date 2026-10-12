/**
 * Painting kit shared by the themes: watercolor sprigs and leaves, gold-foil shapes (used as CSS masks
 * over a metallic gradient) and small layout helpers. Built on the primitives in art.ts.
 */
import { type P, type WaxColors, along, brush, cubic, leafHalves, placeAt, r1, rad, rng, spiral, taper, taperEnd, wcFilter } from './art';

// ---------------------------------------------------------------------------
// Watercolor
// ---------------------------------------------------------------------------

export type Pair = [string, string];
export const pick = <T>(a: T[], rand: () => number): T => a[Math.floor(rand() * a.length)];

/** A set of watercolor filters w0…w{n-1} with different edges. */
export function wcSet(n: number, o: Parameters<typeof wcFilter>[1] = {}) {
  let s = '';
  for (let i = 0; i < n; i++) s += wcFilter(`w${i}`, { ...o, seed: (o.seed ?? 3) + i * 7 });
  return s;
}

/** Soft wash without pigment rims (skies, clouds). */
export const softWash = (id: string, seed: number, blur = 1.6) =>
  `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="4" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="${blur}" result="b"/><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="${seed + 3}" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -.7 1.22" result="ga"/><feComposite in="b" in2="ga" operator="in"/></filter>`;

export function paintLeaf(at: P, angle: number, len: number, wid: number, c: Pair, f: string, gap = 0.7, belly = 0.34): string {
  const [up, lo] = leafHalves(len, wid, gap, belly);
  return placeAt(at, angle, `<g filter="url(#${f})"><path d="${up}" fill="${c[0]}"/><path d="${lo}" fill="${c[1]}"/></g>`);
}

export const paintStem = (pts: P[], width: number, color: string, f: string) => `<path d="${brush(pts, taperEnd(width, width * 0.3))}" fill="${color}" filter="url(#${f})"/>`;

export interface SprigSpec {
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

export function paintSprig(s: SprigSpec): string {
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
// Flowers: stems, petals, bows
// ---------------------------------------------------------------------------

/** Point at distance d from p along angle a (degrees). */
export const go = (p: P, a: number, d: number): P => [p[0] + Math.cos(rad(a)) * d, p[1] + Math.sin(rad(a)) * d];

/** A gently bent stem from `base`, `len` long, heading `angle` (degrees). */
export function bentStem(base: P, angle: number, len: number, bend: number): P[] {
  const n: P = [-Math.sin(rad(angle)), Math.cos(rad(angle))];
  const c1 = go(base, angle, len * 0.33);
  const c2 = go(base, angle, len * 0.66);
  return cubic(base, [c1[0] + n[0] * bend, c1[1] + n[1] * bend], [c2[0] + n[0] * bend * 1.2, c2[1] + n[1] * bend * 1.2], go(base, angle, len), 30);
}

/** Rounded petal from (0,0) to (len,0) with a small notch at the tip when `notch`. */
export function petalPath(len: number, wid: number, notch = false): string {
  const tip = notch
    ? `L${r1(len * 0.9)} 0L${r1(len)} ${r1(wid * 0.22)}`
    : `Q${r1(len * 1.04)} 0 ${r1(len)} ${r1(wid * 0.3)}`;
  return `M0 0C${r1(len * 0.22)} ${r1(-wid * 0.9)} ${r1(len * 0.78)} ${r1(-wid)} ${r1(len)} ${r1(-wid * 0.3)}${tip}C${r1(len * 0.78)} ${r1(wid)} ${r1(len * 0.22)} ${r1(wid * 0.9)} 0 0Z`;
}

export const petalAt = (at: P, angle: number, len: number, wid: number, fill: string, f: string, notch = false, opacity = 1) =>
  placeAt(at, angle, `<path d="${petalPath(len, wid, notch)}" fill="${fill}" filter="url(#${f})"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`);

/** The same petal as `petalPath`, already placed at `c` and turned by `angle` (absolute path data). */
export function petalD(c: P, angle: number, len: number, wid: number, notch = false): string {
  const a = rad(angle);
  const [cos, sin] = [Math.cos(a), Math.sin(a)];
  const m = (x: number, y: number) => `${r1(c[0] + x * cos - y * sin)} ${r1(c[1] + x * sin + y * cos)}`;
  const tip = notch ? `L${m(len * 0.9, 0)}L${m(len, wid * 0.22)}` : `Q${m(len * 1.04, 0)} ${m(len, wid * 0.3)}`;
  return `M${m(0, 0)}C${m(len * 0.22, -wid * 0.9)} ${m(len * 0.78, -wid)} ${m(len, -wid * 0.3)}${tip}C${m(len * 0.78, wid)} ${m(len * 0.22, wid * 0.9)} ${m(0, 0)}Z`;
}

/** Ellipse as path data (so many of them can share one element). */
export function ellipseD(c: P, rx: number, ry: number, rot = 0): string {
  const a = rad(rot);
  const [dx, dy] = [Math.cos(a) * rx, Math.sin(a) * rx];
  const arc = (sx: number, sy: number) => `a${r1(rx)} ${r1(ry)} ${r1(rot)} 1 0 ${r1(sx)} ${r1(sy)}`;
  return `M${r1(c[0] - dx)} ${r1(c[1] - dy)}${arc(2 * dx, 2 * dy)}${arc(-2 * dx, -2 * dy)}Z`;
}

/**
 * Collects shapes by colour and filter and draws each group as a single path: paintings with
 * hundreds of buds or florets stay small and quick to render.
 */
export class Batch {
  private groups = new Map<string, string>();
  add(fill: string, filter: string, d: string): this {
    const k = `${fill} ${filter}`;
    this.groups.set(k, (this.groups.get(k) ?? '') + d);
    return this;
  }
  toString(): string {
    let s = '';
    for (const [k, d] of this.groups) {
      const [fill, f] = k.split(' ');
      s += `<path d="${d}" fill="${fill}"${f ? ` filter="url(#${f})"` : ''}/>`;
    }
    return s;
  }
}

/** Bow of ribbon or twine tied at `c`. */
export function bow(c: P, w: number, color: string, dark: string): string {
  const [x, y] = c;
  return (
    `<g filter="url(#w1)"><path d="M${x} ${y}C${x - w * 0.5} ${y - w * 0.55} ${x - w * 1.05} ${y - w * 0.35} ${x - w} ${y + w * 0.05}C${x - w * 0.95} ${y + w * 0.4} ${x - w * 0.45} ${y + w * 0.3} ${x} ${y}Z" fill="${color}"/>` +
    `<path d="M${x} ${y}C${x + w * 0.5} ${y - w * 0.55} ${x + w * 1.05} ${y - w * 0.35} ${x + w} ${y + w * 0.05}C${x + w * 0.95} ${y + w * 0.4} ${x + w * 0.45} ${y + w * 0.3} ${x} ${y}Z" fill="${color}"/></g>` +
    `<g filter="url(#w2)"><path d="${brush(cubic([x - 1, y + 1], [x - w * 0.3, y + w * 0.6], [x - w * 0.5, y + w * 1.1], [x - w * 0.75, y + w * 1.5], 12), taper(w * 0.32, w * 0.12))}" fill="${dark}"/>` +
    `<path d="${brush(cubic([x + 1, y + 1], [x + w * 0.3, y + w * 0.6], [x + w * 0.45, y + w * 1.1], [x + w * 0.65, y + w * 1.6], 12), taper(w * 0.32, w * 0.12))}" fill="${dark}"/>` +
    `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(w * 0.22)}" ry="${r1(w * 0.18)}" fill="${dark}"/></g>`
  );
}

// ---------------------------------------------------------------------------
// Gold foil (black shapes)
// ---------------------------------------------------------------------------

export function foilLeaf(at: P, angle: number, len: number, wid: number, gap = 0.9, belly = 0.34): string {
  const [up, lo] = leafHalves(len, wid, gap, belly);
  return placeAt(at, angle, `<path d="${up}"/><path d="${lo}"/>`);
}

export function sparkle(c: P, s: number, thin = 0.18): string {
  const [x, y] = c;
  const k = s * thin;
  return `<path d="M${r1(x)} ${r1(y - s)}Q${r1(x + k)} ${r1(y - k)} ${r1(x + s)} ${r1(y)}Q${r1(x + k)} ${r1(y + k)} ${r1(x)} ${r1(y + s)}Q${r1(x - k)} ${r1(y + k)} ${r1(x - s)} ${r1(y)}Q${r1(x - k)} ${r1(y - k)} ${r1(x)} ${r1(y - s)}Z"/>`;
}

export function star5(c: P, outer: number, inner = outer * 0.42, rot = -90): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = rad(rot + i * 36);
    d += `${i ? 'L' : 'M'}${r1(c[0] + r * Math.cos(a))} ${r1(c[1] + r * Math.sin(a))}`;
  }
  return `<path d="${d}Z"/>`;
}

/** Crescent opening to the right, tilted. */
export function crescent(c: P, r: number, tilt = -28): string {
  const [x, y] = c;
  const inner = r1(r * 1.22);
  return `<path transform="rotate(${tilt} ${x} ${y})" d="M${x} ${r1(y - r)}A${r} ${r} 0 1 0 ${x} ${r1(y + r)}A${inner} ${inner} 0 0 1 ${x} ${r1(y - r)}Z"/>`;
}

/** Hairline that swells in the middle, with a dot at the far end. */
export const hairline = (a: P, b: P, w = 1.5, dot = 1.3) =>
  `<path d="${brush(cubic(a, [a[0] + (b[0] - a[0]) / 3, a[1]], [a[0] + (2 * (b[0] - a[0])) / 3, b[1]], b, 24), taper(w, 0.15))}"/>` + (dot ? `<circle cx="${r1(b[0])}" cy="${r1(b[1])}" r="${dot}"/>` : '');

/** Calligraphic curl winding into a spiral. */
export function curl(c: P, r0: number, a0: number, turns: number, w: number): string {
  const pts = spiral(c, r0, r0 * 0.18, a0, turns, 36);
  return `<path d="${brush(pts, (t) => 0.25 + w * (1 - t) ** 1.2)}"/>`;
}

/** Points along the left half of a wreath (bottom → top). */
export function wreathArc(c: P, r: number, from: number, sweep: number): P[] {
  const arc: P[] = [];
  for (let i = 0; i <= 40; i++) {
    const a = rad(from + (sweep * i) / 40);
    arc.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return arc;
}

export const mirrorHalf = (side: string, w = 200) => side + `<g transform="translate(${w} 0) scale(-1 1)">${side}</g>`;


// ---------------------------------------------------------------------------
// Theme recipe
// ---------------------------------------------------------------------------

/** Everything a theme draws (all SVG strings, turned into CSS by themes.ts). */
export interface Recipe {
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
  /** painting along the bottom edge of the invitation card */
  paintFoot?: string;
  seal: WaxColors;
  grain: { light?: boolean; amount?: number; cloud?: number };
  /** custom paper texture (marble, kraft…) instead of the cotton grain */
  grainSvg?: string;
  linen: number;
  /** envelope liner tile */
  liner?: { img: string; size: number };
}
