/**
 * Gold-foil artwork: black shapes used as CSS masks over the theme's metallic gradient
 * (dividers, wreaths around the monogram, corner flourishes, skies and confetti).
 */
import { type P, along, brush, cubic, r1, rad, rng, spiral, svgDoc, taper, taperEnd } from './art';
import { crescent, curl, foilLeaf, hairline, mirrorHalf, sparkle, star5, wreathArc } from './paint';


/** Classic scroll divider, 260×44, centred on (130,22). */
export function filigreeDivider(): string {
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
export function decoDivider(): string {
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
export function sprigDivider(kind: 'olive' | 'laurel' | 'leaf'): string {
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
export function starDivider(): string {
  let s = sparkle([100, 15], 9, 0.16) + sparkle([82, 15], 4) + sparkle([118, 15], 4);
  for (const m of [1, -1]) s += hairline([100 + m * 26, 15], [100 + m * 92, 15], 1.2, 1.2);
  return svgDoc(200, 30, s);
}

/** Wheat divider, 220×34. */
export function wheatDivider(): string {
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

/** Laurel wreath around a monogram, 200×200 (centre 100,102). */
export function laurelWreath(berries = true): string {
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
export function wheatWreath(): string {
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
export function filigreeCorner(): string {
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
export function decoCorner(): string {
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
export function nightSky(): string {
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
export function cieloFoil(): string {
  let s = crescent([292, 40], 15, -20);
  for (const [x, y, r] of [[96, 26, 6], [150, 18, 4], [224, 30, 5], [60, 84, 3.4], [318, 92, 3.6], [190, 70, 2.6]] as const) s += star5([x, y], r);
  for (const [x, y] of [[120, 52], [256, 64], [36, 40], [340, 28], [170, 100]] as const) s += `<circle cx="${x}" cy="${y}" r="1.2"/>`;
  return svgDoc(360, 150, s);
}

/** Gold confetti scattered around the top of the card, 360×210. */
export function confettiFoil(): string {
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


/** Plain hairline with a small dot (minimal styles), 200×20. */
export function minimalDivider(): string {
  return svgDoc(200, 20, `<path d="M24 9.6H90V10.4H24ZM110 9.6H176V10.4H110Z"/><circle cx="100" cy="10" r="2.4"/>`);
}

/** Ring with a hole (lace eyelets, bubbles). */
export const ring = (c: P, r: number, w: number) =>
  `<path fill-rule="evenodd" d="M${r1(c[0] - r)} ${r1(c[1])}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0ZM${r1(c[0] - r + w)} ${r1(c[1])}a${r1(r - w)} ${r1(r - w)} 0 1 0 ${r1(2 * (r - w))} 0a${r1(r - w)} ${r1(r - w)} 0 1 0 ${r1(-2 * (r - w))} 0Z"/>`;

/** Lace border along the top of the card: eyelet strip, floral net and scallops with picots, 360×90. */
export function laceBand(): string {
  let s = '';
  // top strip with a row of tiny holes
  let strip = 'M0 0H360V9H0Z';
  for (let x = 4; x < 360; x += 7) strip += `M${x - 1.3} 4.5a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0Z`;
  s += `<path fill-rule="evenodd" d="${strip}"/>`;
  // net: thin lattice threads between the strip and the scallops
  for (let x = -30; x < 390; x += 15) {
    s += `<path d="${brush([[x, 9], [x + 30, 50]], () => 0.7)}"/><path d="${brush([[x + 30, 9], [x, 50]], () => 0.7)}"/>`;
  }
  s += '<path d="M0 49H360V51H0Z"/>';
  // little flowers in the net
  for (let x = 15; x < 360; x += 30) {
    const y = 28;
    for (const a of [0, 60, 120]) s += `<ellipse cx="${x}" cy="${y}" rx="6.4" ry="2.4" transform="rotate(${a} ${x} ${y})"/>`;
    s += `<circle cx="${x}" cy="${y}" r="2.6"/>`;
  }
  // scallops with an eyelet and picots
  for (let x = 15; x < 360; x += 30) {
    let d = `M${x - 15} 50A15 15 0 0 0 ${x + 15} 50Z`;
    d += `M${x - 4} 56a4 4 0 1 0 8 0a4 4 0 1 0-8 0Z`;
    s += `<path fill-rule="evenodd" d="${d}"/>`;
    for (let k = 1; k < 6; k++) {
      const a = rad(180 - k * 30);
      s += `<circle cx="${r1(x + Math.cos(a) * 18)}" cy="${r1(50 + Math.sin(a) * 18)}" r="1.5"/>`;
    }
    s += `<circle cx="${x}" cy="71" r="1.8"/>`;
  }
  return svgDoc(360, 90, s);
}

/** Tiny heart (hearts dividers and scatter). */
export const heart = (c: P, s: number) =>
  `<path transform="translate(${r1(c[0])} ${r1(c[1])}) scale(${r1(s * 100) / 100})" d="M0 6C-4 3-8 0-8-3.4C-8-6-6-8-3.6-8C-2-8-.7-7.1 0-5.8C.7-7.1 2-8 3.6-8C6-8 8-6 8-3.4C8 0 4 3 0 6Z"/>`;
