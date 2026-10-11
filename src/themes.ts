/**
 * Invitation themes. Each theme = CSS variables (public/css/invite.css, class "t-<id>")
 * + procedurally drawn SVG ornaments generated here once per isolate.
 */
import type { EventType, ThemeId } from './types';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  desc: string;
  /** background, accent, ink — used for the theme picker swatches */
  swatches: [string, string, string];
  demoEvent: EventType;
  /** font files to preload on the invitation page */
  fonts: string[];
}

export const THEMES: ThemeDef[] = [
  {
    id: 'ulivo',
    name: 'Ulivo',
    desc: 'Rami d’ulivo e verde salvia, elegante e naturale',
    swatches: ['#f4f1e8', '#7b8a58', '#3a3a2c'],
    demoEvent: 'matrimonio',
    fonts: ['cormorant-garamond-latin-400-italic', 'jost-latin-300-normal'],
  },
  {
    id: 'avorio',
    name: 'Avorio & Oro',
    desc: 'Carta avorio, dettagli oro e calligrafia classica',
    swatches: ['#fffaf2', '#b08d4f', '#3b3127'],
    demoEvent: 'anniversario',
    fonts: ['pinyon-script-latin-400-normal', 'cormorant-garamond-latin-400-normal'],
  },
  {
    id: 'limoni',
    name: 'Limoni di Amalfi',
    desc: 'Maioliche blu e limoni, pura estate italiana',
    swatches: ['#ffffff', '#1f4e8c', '#f4c542'],
    demoEvent: 'festa',
    fonts: ['dm-serif-display-latin-400-normal', 'jost-latin-400-normal'],
  },
  {
    id: 'notte',
    name: 'Notte stellata',
    desc: 'Blu notte e oro: per feste serali e diciottesimi',
    swatches: ['#141b34', '#d8b46a', '#f3ecdc'],
    demoEvent: 'diciottesimo',
    fonts: ['italiana-latin-400-normal', 'jost-latin-300-normal'],
  },
  {
    id: 'alloro',
    name: 'Alloro',
    desc: 'Rosso laurea e corona d’alloro',
    swatches: ['#fbf6ee', '#9b1c1c', '#2d2522'],
    demoEvent: 'laurea',
    fonts: ['dm-serif-display-latin-400-normal', 'cormorant-garamond-latin-400-normal'],
  },
  {
    id: 'cielo',
    name: 'Cielo',
    desc: 'Nuvole, stelline e azzurro polvere',
    swatches: ['#eef5fc', '#6f9bd1', '#33475f'],
    demoEvent: 'battesimo',
    fonts: ['fredoka-latin-500-normal', 'jost-latin-400-normal'],
  },
  {
    id: 'cipria',
    name: 'Cipria',
    desc: 'Rosa cipria e fiori delicati',
    swatches: ['#fdf3f3', '#d58e98', '#4a3436'],
    demoEvent: 'babyshower',
    fonts: ['pinyon-script-latin-400-normal', 'cormorant-garamond-latin-400-normal'],
  },
  {
    id: 'spiga',
    name: 'Grano',
    desc: 'Spighe dorate su crema, luminoso e sobrio',
    swatches: ['#fbf7ee', '#b8955a', '#3d3326'],
    demoEvent: 'comunione',
    fonts: ['dm-serif-display-latin-400-italic', 'cormorant-garamond-latin-400-normal'],
  },
  {
    id: 'coriandoli',
    name: 'Coriandoli',
    desc: 'Colori e coriandoli: si fa festa!',
    swatches: ['#fffaf0', '#ff5d73', '#2b2d42'],
    demoEvent: 'compleanno',
    fonts: ['fredoka-latin-600-normal', 'jost-latin-400-normal'],
  },
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<ThemeId, ThemeDef>;
export const isTheme = (v: unknown): v is ThemeId => typeof v === 'string' && v in THEME_BY_ID;

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

type P = [number, number];
const r1 = (n: number) => Math.round(n * 10) / 10;
const deg = (rad: number) => (rad * 180) / Math.PI;

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bez = (a: P, c: P, b: P, t: number): P => [
  (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
  (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
];
const bezTan = (a: P, c: P, b: P, t: number): P => [
  2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]),
  2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1]),
];

/** Pointed leaf from (0,0) to (len,0). */
const leafPath = (len: number, wid: number) =>
  `M0 0C${r1(len * 0.25)} ${r1(-wid)} ${r1(len * 0.7)} ${r1(-wid * 0.9)} ${r1(len)} 0C${r1(len * 0.7)} ${r1(wid * 0.9)} ${r1(len * 0.25)} ${r1(wid)} 0 0Z`;

interface LeafStyle {
  fills: string[];
  stroke?: string;
  strokeWidth?: number;
  vein?: string;
  awn?: { color: string; len: number };
}

function leaf(at: P, angle: number, len: number, wid: number, st: LeafStyle, rand: () => number): string {
  const fill = st.fills.length ? st.fills[Math.floor(rand() * st.fills.length)] : 'none';
  const stroke = st.stroke ? ` stroke="${st.stroke}" stroke-width="${st.strokeWidth ?? 1}"` : '';
  let s = `<g transform="translate(${r1(at[0])} ${r1(at[1])}) rotate(${r1(angle)})"><path d="${leafPath(len, wid)}" fill="${fill}"${stroke}/>`;
  if (st.vein) s += `<path d="M${r1(len * 0.08)} 0L${r1(len * 0.82)} 0" stroke="${st.vein}" stroke-width=".6" stroke-linecap="round"/>`;
  if (st.awn) s += `<path d="M${r1(len)} 0L${r1(len + st.awn.len)} 0" stroke="${st.awn.color}" stroke-width=".55" stroke-linecap="round"/>`;
  return s + '</g>';
}

interface BranchSpec extends LeafStyle {
  from: P;
  ctrl: P;
  to: P;
  count: number;
  len: number;
  wid: number;
  angle: number;
  stem: string;
  stemWidth: number;
  taper?: number;
  seed: number;
  pairs?: boolean;
  start?: number;
  tip?: boolean;
}

function branch(s: BranchSpec): string {
  const rand = rng(s.seed);
  let out = `<path d="M${s.from.join(' ')}Q${s.ctrl.join(' ')} ${s.to.join(' ')}" fill="none" stroke="${s.stem}" stroke-width="${s.stemWidth}" stroke-linecap="round"/>`;
  const start = s.start ?? 0.12;
  for (let i = 0; i < s.count; i++) {
    const t = start + (0.94 - start) * (s.count === 1 ? 0.5 : i / (s.count - 1));
    const at = bez(s.from, s.ctrl, s.to, t);
    const tan = bezTan(s.from, s.ctrl, s.to, t);
    const base = deg(Math.atan2(tan[1], tan[0]));
    const k = 1 - (s.taper ?? 0.4) * t;
    const jitter = () => (rand() - 0.5) * 10;
    if (s.pairs) {
      out += leaf(at, base - s.angle + jitter(), s.len * k, s.wid * k, s, rand);
      out += leaf(at, base + s.angle + jitter(), s.len * k, s.wid * k, s, rand);
    } else {
      const side = i % 2 === 0 ? -1 : 1;
      out += leaf(at, base + side * s.angle + jitter(), s.len * k, s.wid * k, s, rand);
    }
  }
  if (s.tip) {
    const tan = bezTan(s.from, s.ctrl, s.to, 1);
    out += leaf(s.to, deg(Math.atan2(tan[1], tan[0])), s.len * 0.6, s.wid * 0.6, s, rand);
  }
  return out;
}

const mirror = (inner: string, width: number) => `${inner}<g transform="translate(${width} 0) scale(-1 1)">${inner}</g>`;
const svg = (w: number, h: number, body: string, cls = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" class="${cls}" aria-hidden="true" focusable="false">${body}</svg>`;

function star(cx: number, cy: number, outer: number, inner: number, fill: string, rot = -90): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? outer : inner;
    const a = ((rot + i * 36) * Math.PI) / 180;
    d += `${i ? 'L' : 'M'}${r1(cx + rr * Math.cos(a))} ${r1(cy + rr * Math.sin(a))}`;
  }
  return `<path d="${d}Z" fill="${fill}"/>`;
}

const sparkle = (cx: number, cy: number, s: number, fill: string) =>
  `<path d="M${cx} ${r1(cy - s)}Q${cx} ${cy} ${r1(cx + s)} ${cy}Q${cx} ${cy} ${cx} ${r1(cy + s)}Q${cx} ${cy} ${r1(cx - s)} ${cy}Q${cx} ${cy} ${cx} ${r1(cy - s)}Z" fill="${fill}"/>`;

/** Crescent opening to the right: left half-circle minus a flatter arc. */
function crescent(cx: number, cy: number, r: number, fill: string): string {
  const inner = r1(r * 1.25);
  return `<path d="M${cx} ${cy - r}A${r} ${r} 0 0 0 ${cx} ${cy + r}A${inner} ${inner} 0 0 1 ${cx} ${cy - r}Z" fill="${fill}" transform="rotate(-25 ${cx} ${cy})"/>`;
}

function cloud(x: number, y: number, s: number, fill: string, shade: string): string {
  const bumps: [number, number, number][] = [
    [0, 0, 13],
    [15, -9, 16],
    [33, -4, 13],
    [46, 2, 10],
    [24, 5, 12],
    [-11, 4, 9],
  ];
  const draw = (dx: number, dy: number, color: string) =>
    bumps.map(([bx, by, br]) => `<circle cx="${r1(x + (bx + dx) * s)}" cy="${r1(y + (by + dy) * s)}" r="${r1(br * s)}" fill="${color}"/>`).join('');
  return draw(2, 3, shade) + draw(0, 0, fill);
}

function blossom(cx: number, cy: number, r: number, petals: string[], center: string, rand: () => number): string {
  let out = '';
  const rot = rand() * 72;
  for (let i = 0; i < 5; i++) {
    const a = ((rot + i * 72) * Math.PI) / 180;
    out += `<circle cx="${r1(cx + r * Math.cos(a))}" cy="${r1(cy + r * Math.sin(a))}" r="${r1(r * 0.95)}" fill="${petals[i % petals.length]}"/>`;
  }
  return out + `<circle cx="${cx}" cy="${cy}" r="${r1(r * 0.55)}" fill="${center}"/>`;
}

function lemon(cx: number, cy: number, angle: number, s: number): string {
  const body =
    'M-18 0C-17.5-10-8-14 2-13.5C12-13 18-8 19.5-2.5L23 0L19.5 2.5C18 8 12 13 2 13.5C-8 14-17.5 10-18 0Z';
  return `<g transform="translate(${cx} ${cy}) rotate(${angle}) scale(${s})"><path d="${body}" fill="#f4c542" stroke="#dca72c" stroke-width=".8"/><ellipse cx="-3" cy="-6" rx="8" ry="3" fill="#fbe38f" opacity=".85"/><circle cx="-21" cy="0" r="1.6" fill="#7a8a3a"/></g>`;
}

function wreathSide(cx: number, cy: number, radius: number, from: number, to: number, st: LeafStyle, seed: number, n: number) {
  const rand = rng(seed);
  let path = '';
  let out = '';
  for (let i = 0; i <= n; i++) {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    const x = cx + radius * Math.cos(a);
    const y = cy + radius * Math.sin(a);
    path += `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`;
    if (i === 0) continue;
    const dir = deg(Math.atan2(Math.cos(a), -Math.sin(a))) + (to < from ? 180 : 0);
    const k = 1 - 0.35 * (i / n);
    out += leaf([x, y], dir - 38, 20 * k, 6.5 * k, st, rand) + leaf([x, y], dir + 38, 20 * k, 6.5 * k, st, rand);
  }
  return `<path d="${path}" fill="none" stroke="#6d5a3a" stroke-width="1.2"/>` + out;
}

// ---------------------------------------------------------------------------
// Ornaments per theme
// ---------------------------------------------------------------------------

export interface Ornaments {
  top: string;
  divider: string;
  bottom: string;
  /** decorative layer behind the hero (absolute) */
  scatter?: string;
  /** emblem shown above the names (e.g. laurel wreath) */
  emblem?: string;
}

function build(id: ThemeId): Ornaments {
  switch (id) {
    case 'ulivo': {
      const olive: LeafStyle = { fills: ['#8f9d6b', '#a7b384', '#7b8a58'], vein: '#6b7848' };
      const b = branch({ ...olive, from: [178, 84], ctrl: [112, 36], to: [16, 50], count: 13, len: 30, wid: 5, angle: 40, stem: '#7d6c4f', stemWidth: 1.5, taper: 0.45, seed: 7, tip: true });
      const olives = `<ellipse cx="118" cy="66" rx="4.2" ry="6" fill="#55603b" transform="rotate(20 118 66)"/><ellipse cx="74" cy="56" rx="3.8" ry="5.5" fill="#4b5436" transform="rotate(-10 74 56)"/>`;
      const small = branch({ ...olive, from: [12, 14], ctrl: [60, 4], to: [108, 14], count: 7, len: 18, wid: 3.4, angle: 42, stem: '#7d6c4f', stemWidth: 1.1, taper: 0.3, seed: 2, tip: true });
      const top = svg(360, 110, mirror(b + olives, 360) + `<circle cx="180" cy="86" r="3" fill="#55603b"/>`, 'orn orn-top');
      return { top, bottom: top.replace('orn-top', 'orn-bottom'), divider: svg(120, 28, small, 'orn orn-div') };
    }
    case 'avorio': {
      const line: LeafStyle = { fills: [], stroke: '#b08d4f', strokeWidth: 1 };
      const b = branch({ ...line, from: [172, 70], ctrl: [120, 40], to: [40, 44], count: 11, len: 22, wid: 6, angle: 44, stem: '#b08d4f', stemWidth: 1, taper: 0.4, seed: 11, tip: true });
      const dia = `<path d="M180 62l7 8-7 8-7-8z" fill="none" stroke="#b08d4f"/><circle cx="180" cy="70" r="1.6" fill="#b08d4f"/>`;
      const top = svg(360, 100, mirror(b, 360) + dia, 'orn orn-top');
      const divider = svg(160, 20, `<path d="M8 10H66M94 10H152" stroke="#b08d4f" stroke-width=".8"/><path d="M80 3l6 7-6 7-6-7z" fill="none" stroke="#b08d4f"/><circle cx="80" cy="10" r="1.4" fill="#b08d4f"/>`, 'orn orn-div');
      return { top, bottom: top.replace('orn-top', 'orn-bottom'), divider };
    }
    case 'limoni': {
      const lf: LeafStyle = { fills: ['#3f6b35', '#56843f', '#6e9a4f'], vein: '#2f5228' };
      const b = branch({ ...lf, from: [176, 46], ctrl: [120, 6], to: [24, 30], count: 9, len: 30, wid: 10, angle: 46, stem: '#5b4a33', stemWidth: 1.8, taper: 0.35, seed: 5, tip: true });
      const fruits = lemon(128, 50, 100, 1) + lemon(84, 52, 76, 0.9);
      const top = svg(360, 96, mirror(b + fruits, 360), 'orn orn-top');
      const small = branch({ ...lf, from: [30, 22], ctrl: [44, 10], to: [58, 6], count: 3, len: 16, wid: 6, angle: 50, stem: '#5b4a33', stemWidth: 1.2, seed: 9, tip: true });
      const divider = svg(120, 36, mirror(small, 120) + lemon(60, 22, 90, 0.62), 'orn orn-div');
      return { top, bottom: '', divider };
    }
    case 'notte': {
      const rand = rng(21);
      let sky = crescent(180, 46, 22, '#d8b46a');
      const spots: [number, number, number][] = [
        [120, 30, 6], [240, 26, 7], [92, 62, 4], [272, 66, 4.5], [150, 80, 3], [214, 84, 3.5], [60, 34, 3], [304, 38, 3.5], [36, 74, 2.5], [330, 80, 2.5],
      ];
      for (const [x, y, s] of spots) sky += sparkle(x, y, s, '#d8b46a');
      for (let i = 0; i < 16; i++) sky += `<circle cx="${r1(20 + rand() * 320)}" cy="${r1(10 + rand() * 90)}" r="${r1(0.6 + rand() * 0.9)}" fill="#f3ecdc" opacity="${r1(0.35 + rand() * 0.5)}"/>`;
      const divider = svg(120, 24, sparkle(40, 12, 4, '#d8b46a') + sparkle(60, 12, 7, '#d8b46a') + sparkle(80, 12, 4, '#d8b46a'), 'orn orn-div');
      return { top: svg(360, 110, sky, 'orn orn-top'), bottom: '', divider };
    }
    case 'alloro': {
      const laurel: LeafStyle = { fills: ['#5e7d4a', '#6f8f57', '#4f6b3e'], vein: '#3e5530' };
      const wreath =
        wreathSide(100, 100, 66, 100, 262, laurel, 3, 11) +
        `<g transform="translate(200 0) scale(-1 1)">${wreathSide(100, 100, 66, 100, 262, laurel, 4, 11)}</g>` +
        `<path d="M100 164c-10-10-24-10-26-2 0 7 14 8 26 2zm0 0c10-10 24-10 26-2 0 7-14 8-26 2z" fill="#9b1c1c"/><path d="M96 166l-12 22 7-2 4 7 7-25zm8 0l12 22-7-2-4 7-7-25z" fill="#7e1515"/><circle cx="100" cy="165" r="4" fill="#b52a2a"/>` +
        `<g transform="translate(100 96)"><path d="M-34 -6L0 -20 34 -6 0 8Z" fill="#2d2522"/><path d="M-20 0v13c0 6 40 6 40 0V0L0 8z" fill="#2d2522"/><path d="M26 -3v18" stroke="#c9a45c" stroke-width="1.6"/><circle cx="26" cy="17" r="3" fill="#c9a45c"/></g>`;
      const sprig = branch({ ...laurel, from: [20, 14], ctrl: [60, 6], to: [100, 14], count: 6, len: 13, wid: 4.5, angle: 36, stem: '#6d5a3a', stemWidth: 1, pairs: true, seed: 6, taper: 0.3, tip: true });
      return { top: '', emblem: svg(200, 200, wreath, 'orn orn-emblem'), bottom: '', divider: svg(120, 28, sprig, 'orn orn-div') };
    }
    case 'cielo': {
      const rand = rng(8);
      let body = cloud(52, 58, 1.15, '#ffffff', '#d8e7f6') + cloud(250, 40, 0.95, '#ffffff', '#d8e7f6') + cloud(160, 78, 0.7, '#ffffff', '#d8e7f6');
      body += crescent(318, 34, 13, '#f2cf73');
      for (const [x, y, s] of [[140, 26, 6], [202, 18, 4.5], [104, 90, 4], [300, 84, 5], [28, 22, 4]] as const) body += star(x, y, s, s * 0.45, '#f2cf73');
      for (let i = 0; i < 12; i++) body += `<circle cx="${r1(10 + rand() * 340)}" cy="${r1(8 + rand() * 96)}" r="${r1(1 + rand() * 1.4)}" fill="#bcd5ee"/>`;
      const divider = svg(140, 24, `<path d="M10 12H52M88 12H130" stroke="#bcd5ee" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round"/>` + star(70, 12, 8, 3.6, '#f2cf73'), 'orn orn-div');
      return { top: svg(360, 110, body, 'orn orn-top'), bottom: '', divider };
    }
    case 'cipria': {
      const rand = rng(14);
      const lf: LeafStyle = { fills: ['#b7c4a8', '#a3b394', '#c8d3bb'] };
      let b = branch({ ...lf, from: [176, 70], ctrl: [116, 30], to: [26, 46], count: 12, len: 16, wid: 5, angle: 46, stem: '#a3b394', stemWidth: 1.2, taper: 0.3, seed: 15, tip: true });
      const petals = ['#eab3b8', '#f3c9cc', '#e39aa2'];
      for (const [t, r] of [[0.18, 6.5], [0.42, 5.5], [0.66, 6], [0.88, 4.5]] as const) {
        const [x, y] = bez([176, 70], [116, 30], [26, 46], t);
        b += blossom(r1(x), r1(y - 2), r, petals, '#d6a656', rand);
      }
      const top = svg(360, 104, mirror(b, 360) + blossom(180, 70, 7.5, petals, '#d6a656', rand), 'orn orn-top');
      const divider = svg(120, 30, branch({ ...lf, from: [24, 16], ctrl: [60, 6], to: [96, 16], count: 6, len: 11, wid: 3.6, angle: 46, stem: '#a3b394', stemWidth: 1, seed: 3 }) + blossom(60, 13, 4.8, petals, '#d6a656', rand), 'orn orn-div');
      return { top, bottom: top.replace('orn-top', 'orn-bottom'), divider };
    }
    case 'spiga': {
      const grain: LeafStyle = { fills: ['#d4b06a', '#c99e52', '#dcbc7c'], awn: { color: '#cfb07a', len: 9 } };
      const ear = (seed: number) =>
        `<path d="M180 104Q150 70 104 22" fill="none" stroke="#b8955a" stroke-width="1.4" stroke-linecap="round"/>` +
        branch({ ...grain, from: [150, 64], ctrl: [128, 42], to: [104, 22], count: 7, len: 11, wid: 3.8, angle: 24, stem: '#b8955a', stemWidth: 1.2, pairs: true, seed, taper: 0.25, start: 0.05, tip: true }) +
        leaf([170, 92], 205, 34, 4.5, { fills: ['#c7ad74'] }, rng(seed + 1));
      const top = svg(360, 110, mirror(ear(4), 360) + `<circle cx="180" cy="104" r="2.5" fill="#b8955a"/>`, 'orn orn-top');
      const divider = svg(120, 26, branch({ ...grain, from: [18, 13], ctrl: [60, 13], to: [100, 13], count: 6, len: 8, wid: 3, angle: 26, stem: '#b8955a', stemWidth: 1, pairs: true, seed: 2, taper: 0.2, start: 0.35, tip: true, awn: { color: '#cfb07a', len: 6 } }), 'orn orn-div');
      return { top, bottom: '', divider };
    }
    case 'coriandoli': {
      const rand = rng(33);
      const colors = ['#ff5d73', '#ffb627', '#3ec1d3', '#7b61ff', '#2ec4b6', '#ff8c42'];
      let body = '';
      for (let i = 0; i < 46; i++) {
        // keep the middle free: names and eyebrow live there
        let x = 0;
        let y = 0;
        do {
          x = r1(rand() * 360);
          y = r1(rand() * 200);
        } while (y > 46 && x > 58 && x < 302);
        const c = colors[i % colors.length];
        const rot = Math.round(rand() * 180);
        const kind = i % 4;
        if (kind === 0) body += `<rect x="${x}" y="${y}" width="5" height="11" rx="1.5" fill="${c}" transform="rotate(${rot} ${x} ${y})"/>`;
        else if (kind === 1) body += `<circle cx="${x}" cy="${y}" r="${r1(2.5 + rand() * 2)}" fill="${c}"/>`;
        else if (kind === 2) body += `<path d="M${x} ${y}q4-5 8 0t8 0" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" transform="rotate(${rot} ${x} ${y})"/>`;
        else body += `<path d="M${x} ${y}l6 10h-12z" fill="${c}" transform="rotate(${rot} ${x} ${y})"/>`;
      }
      const dots = colors.slice(0, 5).map((c, i) => `<circle cx="${30 + i * 15}" cy="10" r="4" fill="${c}"/>`).join('');
      return { top: '', scatter: svg(360, 200, body, 'orn orn-scatter'), bottom: '', divider: svg(120, 20, dots, 'orn orn-div') };
    }
  }
}

const cache = new Map<ThemeId, Ornaments>();
export function ornaments(id: ThemeId): Ornaments {
  let o = cache.get(id);
  if (!o) {
    o = build(id);
    cache.set(id, o);
  }
  return o;
}

// ---------------------------------------------------------------------------
// Envelope liner patterns (inline CSS, theme specific)
// ---------------------------------------------------------------------------

const dataUri = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;

const LINERS: Record<ThemeId, string> = {
  ulivo: dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" fill="#dfe4cf"/><path d="M8 30q6-12 18-14" fill="none" stroke="#a7b384" stroke-width="1.2"/><path d="M14 22c2-4 6-5 9-4-2 3-5 5-9 4zM20 18c3-3 7-3 9-1-3 2-6 3-9 1z" fill="#8f9d6b"/></svg>`,
  ),
  avorio: dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"><rect width="22" height="22" fill="#efe3cc"/><circle cx="11" cy="11" r="1.3" fill="#c7a86d"/></svg>`,
  ),
  limoni: dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#fff"/><path d="M24 4l20 20-20 20L4 24z" fill="none" stroke="#1f4e8c" stroke-width="2"/><circle cx="24" cy="24" r="6" fill="#1f4e8c"/><circle cx="24" cy="24" r="2.5" fill="#f4c542"/><path d="M0 0h8M40 0h8M0 48h8M40 48h8M0 0v8M48 0v8M0 40v8M48 40v8" stroke="#3d7cc9" stroke-width="3"/></svg>`,
  ),
  notte: dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#1e2747"/><path d="M10 6q0 4 4 4-4 0-4 4 0-4-4-4 4 0 4-4z" fill="#d8b46a"/><circle cx="30" cy="28" r="1.2" fill="#d8b46a"/></svg>`,
  ),
  alloro: dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"><rect width="26" height="26" fill="#8e1b1b"/><circle cx="13" cy="13" r="1.4" fill="#d8b46a"/></svg>`,
  ),
  cielo: dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><rect width="36" height="36" fill="#cfe1f3"/><circle cx="9" cy="9" r="2" fill="#fff"/><path d="M27 21l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z" fill="#f2cf73"/></svg>`,
  ),
  cipria: dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><rect width="36" height="36" fill="#f6dfe1"/><g fill="#eab3b8"><circle cx="18" cy="14" r="3"/><circle cx="22" cy="17" r="3"/><circle cx="20" cy="22" r="3"/><circle cx="15" cy="21" r="3"/><circle cx="14" cy="16" r="3"/></g><circle cx="18" cy="18" r="1.8" fill="#d6a656"/></svg>`,
  ),
  spiga: dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="#efe2c4"/><path d="M15 6c2 2 2 5 0 7-2-2-2-5 0-7zM15 15c2 2 2 5 0 7-2-2-2-5 0-7z" fill="#d4b06a"/></svg>`,
  ),
  coriandoli: dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#fff3d6"/><circle cx="8" cy="8" r="3" fill="#ff5d73"/><rect x="24" y="6" width="4" height="9" rx="1" fill="#3ec1d3" transform="rotate(30 26 10)"/><circle cx="30" cy="30" r="3" fill="#7b61ff"/><rect x="8" y="24" width="4" height="9" rx="1" fill="#ffb627" transform="rotate(-25 10 28)"/></svg>`,
  ),
};

export function themeInlineCss(id: ThemeId): string {
  return `.t-${id}{--liner:${LINERS[id]}}`;
}
