/**
 * Invitation themes in the "luxury stationery" style: cotton paper, hot-foil gold, watercolor and wax.
 * Colours and typography live in public/css/invite.css (class "t-<id>"); the artwork is drawn here,
 * once per isolate, and shipped as inline CSS (data URIs) so every page only carries its own theme.
 */
import { along, brush, cubic, dataUri, kraftGrain, linen, marble, paperGrain, r1, rad, rng, svgDoc, taperEnd, waxSeal } from './art';
import { cieloFoil, confettiFoil, decoCorner, decoDivider, filigreeCorner, filigreeDivider, laceBand, laurelWreath, minimalDivider, nightSky, sprigDivider, starDivider, wheatDivider, wheatWreath } from './foil';
import {
  BORDEAUX,
  DEEP_GREEN,
  OLIVE,
  PEONY,
  PEONY_LEAVES,
  cherryPainting,
  cherrySmall,
  cloud,
  cloudPainting,
  gypsophilaPainting,
  gypsophilaSmall,
  hydrangeaPainting,
  hydrangeaSmall,
  lacePainting,
  lavenderPainting,
  lavenderSmall,
  lemonPainting,
  lemonSmall,
  meadowPainting,
  meadowSmall,
  olivePainting,
  oliveSmall,
  ribbonPainting,
  rosePainting,
  roseSmall,
  sunflowerPainting,
  sunflowerSmall,
  wisteriaPainting,
  wisteriaSmall,
} from './motifs';
import {
  autumnPainting,
  autumnSmall,
  awningPainting,
  eucalyptusPainting,
  eucalyptusSmall,
  mountainPainting,
  mountainSmall,
  orangePainting,
  orangeSmall,
  shellsSmall,
  tropicalPainting,
  tropicalSmall,
  vinePainting,
  vineSmall,
  winterPainting,
  winterSmall,
} from './nature';
import {
  balloonPainting,
  balloonSmall,
  bubblesDivider,
  bubblyFoil,
  butterflyPainting,
  butterflySmall,
  christmasStars,
  fireworksFoil,
  fireworksPainting,
  hollyPainting,
  hollySmall,
  rainbowPainting,
  rainbowSmall,
  snowDivider,
  snowFoil,
  waveDivider,
} from './party';
import { type Recipe, foilLeaf, paintLeaf, pick, softWash, sparkle, star5, wcSet } from './paint';
import type { EventType, ThemeId } from './types';

export type ThemeCategory = 'classici' | 'fiori' | 'natura' | 'feste';

export const THEME_CATEGORIES: { id: ThemeCategory; label: string }[] = [
  { id: 'classici', label: 'Classici ed eleganti' },
  { id: 'fiori', label: 'Fiori' },
  { id: 'natura', label: 'Natura e viaggi' },
  { id: 'feste', label: 'Feste e bambini' },
];

/** Colours of a theme (CSS variables on the invitation). Text colours keep a contrast of at least 4.5:1. */
export interface Palette {
  /** the table the cards lie on, its lit centre and the text written on it */
  table: string;
  table2: string;
  onTable: string;
  paper: string;
  /** the reply card */
  paper2: string;
  ink: string;
  muted: string;
  /** labels, times, links */
  accent: string;
  names: string;
  /** hairlines */
  rule: string;
  /** input borders */
  field: string;
  btnBg: string;
  btnInk: string;
  /** envelope outside and inside */
  env: string;
  env2: string;
  /** initials pressed in the wax seal */
  sealInk: string;
  confetti: string[];
}

export type Foil = 'gold' | 'bright' | 'rose' | 'champagne' | 'cobalt' | 'silver' | 'copper' | 'pearl' | 'ink';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  desc: string;
  category: ThemeCategory;
  /** occasions this style suits best (shown first in the picker) */
  events: EventType[];
  palette: Palette;
  foil?: Foil;
  /** names size on the invitation, px (default 58) */
  namesSize?: number;
  /** 'table': dark table, light cards; 'paper': dark cards too */
  dark?: 'table' | 'paper';
  /** hairline frame inside the invitation card */
  frame?: 'line' | 'double';
  /** paint with normal blending instead of multiply (light paint on dark or kraft paper) */
  blendNormal?: boolean;
  /** paper, accent, names: theme picker swatch and browser bar */
  swatches: [string, string, string];
  demoEvent: EventType;
  /** names shown on the example invitation of this style */
  demo?: { name1?: string; name2?: string; eyebrow?: string; subtitle?: string; /** which of the occasion's sample messages to use */ phrase?: number };
  /** font files to preload on the invitation page */
  fonts: string[];
}

const FONTS = ['cormorant-garamond-latin-600-normal', 'jost-latin-400-normal', 'jost-latin-500-normal'];

type ThemeSpec = Omit<ThemeDef, 'swatches' | 'fonts'>;

/** Palette builder for light papers: only the colours that change from theme to theme. */
function light(o: { table: string; table2: string; onTable: string; paper: string; paper2?: string; ink: string; muted: string; accent: string; names?: string; rule: string; field: string; btnBg: string; btnInk?: string; env: string; env2: string; sealInk: string; confetti: string[] }): Palette {
  return { ...o, paper2: o.paper2 ?? o.paper, names: o.names ?? o.ink, btnInk: o.btnInk ?? '#fffaf0' };
}

const SPECS: ThemeSpec[] = [
  {
    id: 'avorio',
    name: 'Avorio e oro',
    desc: 'Carta di cotone avorio, stemma d’alloro e decori in oro a caldo',
    category: 'classici',
    events: ['matrimonio', 'anniversario', 'cresima', 'comunione', 'pensione', 'aziendale'],
    palette: light({ table: '#e2d9cb', table2: '#f1ebe1', onTable: '#4f4337', paper: '#fbf7ef', paper2: '#f8f2e7', ink: '#2b241d', muted: '#5e5144', accent: '#7a5a1e', rule: 'rgba(148,113,47,.45)', field: '#cdbb9a', btnBg: '#2b241d', btnInk: '#fbf6ec', env: '#f2eadb', env2: '#e4d8c4', sealInk: '#3a0a12', confetti: ['#c9a65f', '#ead9a0', '#fbf7ef', '#8a6a2f', '#6e1f2b'] }),
    demoEvent: 'anniversario',
  },
  {
    id: 'ulivo',
    name: 'Ulivo',
    desc: 'Rami d’ulivo dipinti ad acquerello e nomi in oro',
    category: 'natura',
    events: ['matrimonio', 'anniversario', 'battesimo', 'cena', 'pensione', 'inaugurazione'],
    palette: light({ table: '#dcdfd2', table2: '#eef0e7', onTable: '#434b3c', paper: '#fafaf4', paper2: '#f6f6ee', ink: '#25301f', muted: '#545d48', accent: '#56653a', rule: 'rgba(125,141,94,.42)', field: '#bcc4ab', btnBg: '#3b4732', btnInk: '#f8f7ef', env: '#eef0e3', env2: '#dcdfcc', sealInk: '#262d1b', confetti: ['#c9a65f', '#a9b78c', '#fafaf4', '#7d8d5e', '#ead9a0'] }),
    demoEvent: 'matrimonio',
  },
  {
    id: 'limoni',
    name: 'Amalfi',
    desc: 'Limoni ad acquerello e decori blu cobalto, come le maioliche',
    category: 'natura',
    events: ['festa', 'matrimonio', 'compleanno', 'cena', 'addio'],
    palette: light({ table: '#d9e3ee', table2: '#ecf2f8', onTable: '#2e4166', paper: '#fffefa', paper2: '#fbfaf4', ink: '#1a2f5c', muted: '#45557a', accent: '#1f4e8c', names: '#1d3463', rule: 'rgba(31,63,120,.3)', field: '#b5c3da', btnBg: '#1f3f78', btnInk: '#fffdf5', env: '#fbfaf5', env2: '#e5e8ee', sealInk: '#091634', confetti: ['#f2c94c', '#1f3f78', '#ffffff', '#5f8a45', '#f7d65e'] }),
    foil: 'cobalt',
    frame: 'line',
    demoEvent: 'festa',
  },
  {
    id: 'notte',
    name: 'Mezzanotte',
    desc: 'Carta blu notte, luna e stelle in oro: per le feste di sera',
    category: 'feste',
    events: ['diciottesimo', 'compleanno', 'festa', 'addio', 'aziendale'],
    palette: { table: '#0b1023', table2: '#1c2550', onTable: '#d6ccb4', paper: '#161c33', paper2: '#19203a', ink: '#f3ead6', muted: '#cfc6b0', accent: '#e4c98b', names: '#f6e8c4', rule: 'rgba(214,181,110,.4)', field: '#4a5272', btnBg: '#e0c27f', btnInk: '#141a30', env: '#1d2546', env2: '#121833', sealInk: '#5e4519', confetti: ['#d6b56e', '#fbf0c8', '#efe6d0', '#a07a38'] },
    foil: 'bright',
    namesSize: 46,
    dark: 'paper',
    demoEvent: 'diciottesimo',
  },
  {
    id: 'alloro',
    name: 'Alloro',
    desc: 'Corona d’alloro in oro e nastro rosso: il classico della laurea',
    category: 'classici',
    events: ['laurea', 'pensione', 'aziendale', 'anniversario'],
    palette: light({ table: '#e4dace', table2: '#f2ebe1', onTable: '#4f3f39', paper: '#fbf6ee', paper2: '#f8f1e6', ink: '#2d2522', muted: '#5f514a', accent: '#8f1d22', rule: 'rgba(148,113,47,.42)', field: '#d4c2a8', btnBg: '#8f1d22', btnInk: '#fff8ef', env: '#f3ebdf', env2: '#e5d9c8', sealInk: '#3a0508', confetti: ['#c9a65f', '#ead9a0', '#8f1d22', '#fbf6ee'] }),
    frame: 'double',
    demoEvent: 'laurea',
  },
  {
    id: 'cielo',
    name: 'Cielo',
    desc: 'Nuvole ad acquerello, luna e stelle color champagne',
    category: 'feste',
    events: ['battesimo', 'babyshower', 'compleanno', 'genderreveal', 'comunione'],
    palette: light({ table: '#dde6f0', table2: '#eef3f9', onTable: '#3d4c64', paper: '#fcfdfe', paper2: '#f8fafc', ink: '#22304a', muted: '#4f5e76', accent: '#36608f', rule: 'rgba(127,156,196,.45)', field: '#bfcde0', btnBg: '#263248', btnInk: '#f6f9fc', env: '#eef3f9', env2: '#dbe4ef', sealInk: '#2a3d5e', confetti: ['#cdb98a', '#f1e8cd', '#b3c8e3', '#ffffff'] }),
    foil: 'champagne',
    frame: 'line',
    demoEvent: 'battesimo',
  },
  {
    id: 'cipria',
    name: 'Cipria',
    desc: 'Rose ad acquerello e dettagli in oro rosa',
    category: 'fiori',
    events: ['babyshower', 'matrimonio', 'comunione', 'battesimo', 'compleanno', 'genderreveal'],
    palette: light({ table: '#ecdcd8', table2: '#f7eeeb', onTable: '#5c403e', paper: '#fffaf8', paper2: '#fdf6f3', ink: '#45292a', muted: '#6c5250', accent: '#93514a', rule: 'rgba(178,108,116,.36)', field: '#e2c4bf', btnBg: '#6b4446', btnInk: '#fff7f5', env: '#f7e9e5', env2: '#ead5d0', sealInk: '#4a1f26', confetti: ['#e6b8aa', '#f2d0c4', '#fffaf8', '#b47a6e', '#f4cbc6'] }),
    foil: 'rose',
    demoEvent: 'babyshower',
  },
  {
    id: 'spiga',
    name: 'Grano',
    desc: 'Corona di spighe in oro su carta crema: sobrio e luminoso',
    category: 'classici',
    events: ['comunione', 'cresima', 'battesimo', 'anniversario', 'pensione'],
    palette: light({ table: '#e6dccb', table2: '#f3ece0', onTable: '#4f4333', paper: '#fcf8ef', paper2: '#f9f3e6', ink: '#352b20', muted: '#625542', accent: '#7a5a1e', rule: 'rgba(148,113,47,.42)', field: '#d5c3a1', btnBg: '#3b3125', btnInk: '#fbf5e8', env: '#f3e9d4', env2: '#e4d6bb', sealInk: '#3d2a0d', confetti: ['#c9a65f', '#ead9a0', '#fcf8ef', '#8a6a2f'] }),
    frame: 'double',
    demoEvent: 'comunione',
  },
  {
    id: 'coriandoli',
    name: 'Gala',
    desc: 'Busta nera e coriandoli d’oro: la festa elegante',
    category: 'feste',
    events: ['compleanno', 'diciottesimo', 'festa', 'aziendale', 'inaugurazione', 'pensione'],
    palette: light({ table: '#191716', table2: '#2f2a27', onTable: '#d8cdb8', paper: '#fbf8f1', paper2: '#f7f3ea', ink: '#1f1a17', muted: '#575047', accent: '#7a5a1e', rule: 'rgba(148,113,47,.45)', field: '#d3c6ac', btnBg: '#1f1a17', btnInk: '#f6ead0', env: '#1c1a19', env2: '#0f0e0d', sealInk: '#5e4519', confetti: ['#c9a65f', '#ead9a0', '#fbf0c8', '#8a6a2f', '#1f1a17'] }),
    dark: 'table',
    demoEvent: 'compleanno',
  },
  {
    id: 'smeraldo',
    name: 'Smeraldo',
    desc: 'Carta verde smeraldo, corona d’alloro e cornici in oro',
    category: 'classici',
    events: ['matrimonio', 'anniversario', 'aziendale', 'natale', 'pensione', 'cena'],
    palette: { table: '#0b2019', table2: '#1b4235', onTable: '#d8ccb0', paper: '#123a2f', paper2: '#143f33', ink: '#f1eadb', muted: '#cfc6b0', accent: '#e2c98d', names: '#f4e6c2', rule: 'rgba(214,181,110,.42)', field: '#43695c', btnBg: '#e0c27f', btnInk: '#10261f', env: '#17473a', env2: '#0f3328', sealInk: '#5e4519', confetti: ['#d6b56e', '#fbf0c8', '#f1eadb', '#a07a38'] },
    foil: 'bright',
    dark: 'paper',
    demoEvent: 'matrimonio',
    demo: { name1: 'Elena', name2: 'Tommaso' },
  },
  {
    id: 'bordeaux',
    name: 'Bordeaux',
    desc: 'Rose rosso vino dipinte ad acquerello e filigrana d’oro',
    category: 'classici',
    events: ['matrimonio', 'anniversario', 'natale', 'cena', 'pensione', 'laurea'],
    palette: light({ table: '#e7dcd6', table2: '#f4ece8', onTable: '#4f3236', paper: '#fdf9f4', paper2: '#faf4ee', ink: '#34191d', muted: '#634649', accent: '#8a1f2e', names: '#3a1a1f', rule: 'rgba(138,31,46,.32)', field: '#dcc3c0', btnBg: '#7a1b29', btnInk: '#fff6f0', env: '#f5ebe4', env2: '#e7d6cd', sealInk: '#3a0710', confetti: ['#8a1f2e', '#c9a65f', '#f4ece8', '#d9757a'] }),
    demoEvent: 'matrimonio',
    demo: { name1: 'Giulia', name2: 'Andrea' },
  },
  {
    id: 'marmo',
    name: 'Marmo',
    desc: 'Carta effetto marmo bianco e geometrie déco in oro',
    category: 'classici',
    events: ['matrimonio', 'aziendale', 'inaugurazione', 'laurea', 'anniversario', 'pensione'],
    palette: light({ table: '#e4e2de', table2: '#f2f1ee', onTable: '#3f3d3a', paper: '#fbfbf9', paper2: '#f8f8f6', ink: '#232323', muted: '#555350', accent: '#7a5a1e', names: '#1f1f1f', rule: 'rgba(122,90,30,.38)', field: '#cfcac0', btnBg: '#1f1f1f', btnInk: '#f8f5ee', env: '#f4f3f0', env2: '#e2e0dc', sealInk: '#d8bd7a', confetti: ['#c9a65f', '#ead9a0', '#ffffff', '#2b2b2b'] }),
    demoEvent: 'matrimonio',
    demo: { name1: 'Marta', name2: 'Pietro' },
  },
  {
    id: 'essenziale',
    name: 'Essenziale',
    desc: 'Bianco e nero, nessun decoro: solo i nomi, belli grandi',
    category: 'classici',
    events: ['matrimonio', 'laurea', 'aziendale', 'compleanno', 'inaugurazione', 'cena', 'festa', 'altro'],
    palette: light({ table: '#e9e8e5', table2: '#f5f5f3', onTable: '#3a3a3a', paper: '#ffffff', paper2: '#fbfbfb', ink: '#1d1d1d', muted: '#575757', accent: '#1d1d1d', names: '#111111', rule: 'rgba(0,0,0,.22)', field: '#c9c9c9', btnBg: '#111111', btnInk: '#ffffff', env: '#f7f7f7', env2: '#e6e6e6', sealInk: '#e9e9e9', confetti: ['#111111', '#bdbdbd', '#ffffff'] }),
    foil: 'ink',
    frame: 'line',
    demoEvent: 'matrimonio',
    demo: { name1: 'Sofia', name2: 'Matteo' },
  },
  {
    id: 'pizzo',
    name: 'Pizzo',
    desc: 'Carta rosa cipria e un bordo di pizzo bianco',
    category: 'classici',
    events: ['comunione', 'battesimo', 'cresima', 'matrimonio', 'babyshower', 'anniversario'],
    palette: light({ table: '#e8d9d5', table2: '#f5eceb', onTable: '#5a4043', paper: '#f5e1dd', paper2: '#f4dfdb', ink: '#46292e', muted: '#6a4b50', accent: '#8e4f5a', names: '#46292e', rule: 'rgba(142,79,90,.3)', field: '#dfbfbe', btnBg: '#6e3e47', btnInk: '#fff7f6', env: '#f3e2df', env2: '#e7d0cc', sealInk: '#5a2a33', confetti: ['#ffffff', '#f3d5d6', '#e7b8bb', '#c98a94'] }),
    foil: 'rose',
    blendNormal: true,
    demoEvent: 'battesimo',
    demo: { name1: 'Aurora', phrase: 3 },
  },
  {
    id: 'peonie',
    name: 'Peonie',
    desc: 'Grandi peonie corallo e rosa dipinte ad acquerello',
    category: 'fiori',
    events: ['matrimonio', 'babyshower', 'compleanno', 'anniversario', 'comunione', 'addio'],
    palette: light({ table: '#efdfda', table2: '#f8efec', onTable: '#5e3f3d', paper: '#fffaf7', paper2: '#fdf5f1', ink: '#43262c', muted: '#6b4c50', accent: '#a8475a', rule: 'rgba(168,71,90,.3)', field: '#e6c6c2', btnBg: '#7d3a47', btnInk: '#fff7f4', env: '#f9ece7', env2: '#efd8d1', sealInk: '#4f1a24', confetti: ['#f3aa9f', '#fbd9d2', '#e07f86', '#ffffff', '#c9a65f'] }),
    foil: 'rose',
    demoEvent: 'matrimonio',
    demo: { name1: 'Alice', name2: 'Giorgio' },
  },
  {
    id: 'lavanda',
    name: 'Lavanda',
    desc: 'Mazzi di lavanda legati con un nastro e dettagli in argento',
    category: 'fiori',
    events: ['matrimonio', 'battesimo', 'comunione', 'anniversario', 'babyshower', 'compleanno'],
    palette: light({ table: '#e3dfea', table2: '#f1eff5', onTable: '#4a4560', paper: '#fcfbfd', paper2: '#f8f6fb', ink: '#2f2a40', muted: '#5d5772', accent: '#6a568f', names: '#3b3352', rule: 'rgba(106,86,143,.3)', field: '#cfc6df', btnBg: '#4b3f6b', btnInk: '#fbf9ff', env: '#f1edf6', env2: '#e1dbeb', sealInk: '#2a2140', confetti: ['#b4a2dc', '#d9cff0', '#ffffff', '#8670bb', '#c9c9d4'] }),
    foil: 'silver',
    demoEvent: 'matrimonio',
    demo: { name1: 'Chiara', name2: 'Luca' },
  },
  {
    id: 'girasoli',
    name: 'Girasoli',
    desc: 'Girasoli dipinti ad acquerello: l’allegria dell’estate',
    category: 'fiori',
    events: ['compleanno', 'festa', 'matrimonio', 'battesimo', 'cena', 'pensione'],
    palette: light({ table: '#ece2cc', table2: '#f7f1e2', onTable: '#4f4128', paper: '#fffcf3', paper2: '#fdf8ea', ink: '#33281a', muted: '#5f5240', accent: '#8a5a10', names: '#3b2d16', rule: 'rgba(176,120,30,.32)', field: '#e0cfa6', btnBg: '#3b2d16', btnInk: '#fff8e6', env: '#f7eed8', env2: '#eadcb8', sealInk: '#3d2706', confetti: ['#f2c230', '#f7dc7a', '#fffcf3', '#7a5a1e', '#8fa05a'] }),
    demoEvent: 'compleanno',
    demo: { name1: 'Margherita', subtitle: 'compie 6 anni!' },
  },
  {
    id: 'prato',
    name: 'Prato fiorito',
    desc: 'Margherite, fiordalisi e papaveri lungo il bordo dell’invito',
    category: 'fiori',
    events: ['battesimo', 'compleanno', 'comunione', 'babyshower', 'festa', 'matrimonio'],
    palette: light({ table: '#dfe6d6', table2: '#eff3ea', onTable: '#3e4a36', paper: '#fdfdf8', paper2: '#f9f9f1', ink: '#26301f', muted: '#535e48', accent: '#2f5f8f', names: '#2a3424', rule: 'rgba(74,107,44,.3)', field: '#c6d1b8', btnBg: '#2f4a2a', btnInk: '#fbfdf5', env: '#eef2e6', env2: '#dde4d2', sealInk: '#1d2b17', confetti: ['#e8503a', '#5b8fd1', '#ffffff', '#f4d34a', '#8fb46a'] }),
    foil: 'champagne',
    demoEvent: 'battesimo',
    demo: { name1: 'Viola', phrase: 4 },
  },
  {
    id: 'ortensie',
    name: 'Ortensie',
    desc: 'Ortensie azzurre e lilla ad acquerello, decori in argento',
    category: 'fiori',
    events: ['matrimonio', 'battesimo', 'comunione', 'anniversario', 'cresima', 'babyshower'],
    palette: light({ table: '#dde3ec', table2: '#eef1f6', onTable: '#3d4660', paper: '#fcfdfe', paper2: '#f7f9fc', ink: '#25304a', muted: '#535d75', accent: '#4a5f99', names: '#2b3557', rule: 'rgba(90,110,170,.3)', field: '#c4cde0', btnBg: '#34406a', btnInk: '#f7f9ff', env: '#eef2f8', env2: '#dce3ee', sealInk: '#1d2442', confetti: ['#9fb6e0', '#c9b8e6', '#ffffff', '#6b85c4', '#dfe7f5'] }),
    foil: 'silver',
    demoEvent: 'matrimonio',
    demo: { name1: 'Giada', name2: 'Simone' },
  },
  {
    id: 'glicine',
    name: 'Glicine',
    desc: 'Grappoli di glicine che scendono dall’alto, lilla e champagne',
    category: 'fiori',
    events: ['matrimonio', 'anniversario', 'comunione', 'cresima', 'compleanno', 'babyshower'],
    palette: light({ table: '#e6e0ec', table2: '#f3f0f6', onTable: '#4a4258', paper: '#fdfcfe', paper2: '#f9f7fb', ink: '#33293f', muted: '#5f566c', accent: '#74559a', names: '#3d2f52', rule: 'rgba(116,85,154,.28)', field: '#d3c8e0', btnBg: '#4f3a6b', btnInk: '#fcfaff', env: '#f3eff7', env2: '#e3dcec', sealInk: '#2d1f42', confetti: ['#c6b0e6', '#e8ddf6', '#ffffff', '#9a7cc8', '#cdb98a'] }),
    foil: 'champagne',
    demoEvent: 'matrimonio',
    demo: { name1: 'Irene', name2: 'Paolo' },
  },
  {
    id: 'ciliegio',
    name: 'Fiori di ciliegio',
    desc: 'Rami di ciliegio in fiore, rosa tenue e oro rosa',
    category: 'fiori',
    events: ['babyshower', 'battesimo', 'matrimonio', 'compleanno', 'comunione', 'genderreveal'],
    palette: light({ table: '#eedfe0', table2: '#f8eff0', onTable: '#5b4144', paper: '#fffbfb', paper2: '#fdf6f6', ink: '#3f2a2e', muted: '#6a5155', accent: '#9c4a5c', names: '#46282f', rule: 'rgba(156,74,92,.28)', field: '#e6c9cc', btnBg: '#6b3a46', btnInk: '#fff7f8', env: '#f8ecec', env2: '#ecd9da', sealInk: '#4a1f28', confetti: ['#f6c1cc', '#fbe1e6', '#ffffff', '#e08ea0', '#6b4a3f'] }),
    foil: 'rose',
    demoEvent: 'babyshower',
    demo: { name1: 'Emma' },
  },
  {
    id: 'rustico',
    name: 'Rustico',
    desc: 'Carta kraft, gypsophila bianca e spago: country chic',
    category: 'natura',
    events: ['matrimonio', 'battesimo', 'comunione', 'cena', 'festa', 'compleanno', 'inaugurazione'],
    palette: light({ table: '#e7e0d5', table2: '#f3efe8', onTable: '#4b3d2c', paper: '#dcc39c', paper2: '#d9bf97', ink: '#2b1f13', muted: '#47372a', accent: '#4f3216', names: '#2b1f13', rule: 'rgba(70,45,20,.38)', field: '#a88c66', btnBg: '#3a2a1a', btnInk: '#f6ecd9', env: '#cfb48a', env2: '#bd9f74', sealInk: '#8a7a62', confetti: ['#ffffff', '#efe6d6', '#b89a6c', '#7a5c38'] }),
    foil: 'pearl',
    blendNormal: true,
    demoEvent: 'matrimonio',
    demo: { name1: 'Francesca', name2: 'Nicola' },
  },
  {
    id: 'sicilia',
    name: 'Sicilia',
    desc: 'Arance e fiori di zagara dipinti ad acquerello: i colori del Sud',
    category: 'natura',
    events: ['matrimonio', 'festa', 'cena', 'compleanno', 'battesimo', 'addio'],
    palette: light({ table: '#efe2d0', table2: '#f8f0e4', onTable: '#55402c', paper: '#fffcf5', paper2: '#fdf7ec', ink: '#3a2414', muted: '#5f4836', accent: '#a3471a', rule: 'rgba(163,71,26,.28)', field: '#e6cdb4', btnBg: '#3a2414', btnInk: '#fff6ea', env: '#f8ecdb', env2: '#ecd9c0', sealInk: '#3a1405', confetti: ['#f59a2c', '#ffd27a', '#fffcf5', '#4a7a3e', '#ffffff'] }),
    demoEvent: 'matrimonio',
    demo: { name1: 'Rosalia', name2: 'Salvo' },
  },
  {
    id: 'vigneto',
    name: 'Vigneto',
    desc: 'Grappoli d’uva e foglie di vite: per le nozze in cantina',
    category: 'natura',
    events: ['matrimonio', 'anniversario', 'cena', 'pensione', 'laurea', 'inaugurazione', 'aziendale'],
    palette: light({ table: '#e5ded3', table2: '#f2ede5', onTable: '#4c3d38', paper: '#fbf9f3', paper2: '#f7f4ec', ink: '#2e2026', muted: '#5a4a50', accent: '#6b2440', names: '#3a1f2b', rule: 'rgba(107,36,64,.28)', field: '#d9cbc8', btnBg: '#4f1a30', btnInk: '#fbf3f0', env: '#f2ece0', env2: '#e3d9c8', sealInk: '#2a0716', confetti: ['#6b3f78', '#9caf66', '#c9a65f', '#fbf9f3'] }),
    demoEvent: 'matrimonio',
    demo: { name1: 'Beatrice', name2: 'Lorenzo' },
  },
  {
    id: 'eucalipto',
    name: 'Eucalipto',
    desc: 'Ghirlanda di eucalipto verde salvia e dettagli in argento',
    category: 'natura',
    events: ['matrimonio', 'battesimo', 'comunione', 'cresima', 'laurea', 'aziendale', 'babyshower'],
    palette: light({ table: '#dfe5e0', table2: '#eef2ee', onTable: '#3d4a43', paper: '#fbfcfa', paper2: '#f6f8f4', ink: '#24302b', muted: '#4f5d56', accent: '#3f6656', names: '#24372f', rule: 'rgba(63,102,86,.28)', field: '#c5d2ca', btnBg: '#2f4a3f', btnInk: '#f6faf7', env: '#eef2ee', env2: '#dbe3dd', sealInk: '#1a2a22', confetti: ['#a9bfb4', '#d7e2db', '#ffffff', '#c9ccd1'] }),
    foil: 'silver',
    demoEvent: 'matrimonio',
    demo: { name1: 'Martina', name2: 'Federico' },
  },
  {
    id: 'riviera',
    name: 'Riviera',
    desc: 'Tenda a righe, conchiglie e stelle marine: l’estate al mare',
    category: 'natura',
    events: ['festa', 'compleanno', 'matrimonio', 'addio', 'cena', 'diciottesimo', 'babyshower'],
    palette: light({ table: '#dfe7ee', table2: '#eff4f8', onTable: '#2f4560', paper: '#fffdf8', paper2: '#fbf8f1', ink: '#16304d', muted: '#435a73', accent: '#1f5a8c', names: '#173556', rule: 'rgba(31,90,140,.28)', field: '#bccbdb', btnBg: '#1f4a78', btnInk: '#fffdf6', env: '#f7f4ec', env2: '#e5e1d5', sealInk: '#0c1d33', confetti: ['#3c79b4', '#f4c7a6', '#ffffff', '#ec9a62', '#a5c9e6'] }),
    demoEvent: 'festa',
  },
  {
    id: 'tropicale',
    name: 'Tropicale',
    desc: 'Foglie di palma, monstera e fiori di ibisco',
    category: 'natura',
    events: ['festa', 'compleanno', 'diciottesimo', 'addio', 'matrimonio', 'cena'],
    palette: light({ table: '#e2e9e0', table2: '#f1f5ef', onTable: '#34493f', paper: '#fffcf6', paper2: '#fcf8ef', ink: '#173328', muted: '#44594f', accent: '#1e6a52', names: '#173d33', rule: 'rgba(30,106,82,.28)', field: '#bfd3c6', btnBg: '#1d4a3c', btnInk: '#fffaf0', env: '#f3f6ee', env2: '#dfe7da', sealInk: '#0d241b', confetti: ['#f27b7b', '#f2b22d', '#4e8f62', '#ffffff'] }),
    demoEvent: 'addio',
  },
  {
    id: 'montagna',
    name: 'Montagna',
    desc: 'Vette, boschi e cieli tersi dipinti ad acquerello',
    category: 'natura',
    events: ['matrimonio', 'compleanno', 'pensione', 'laurea', 'festa', 'addio', 'aziendale', 'natale'],
    palette: light({ table: '#dde3e8', table2: '#eef1f4', onTable: '#38475a', paper: '#fbfcfd', paper2: '#f6f8fa', ink: '#1f2c3a', muted: '#4c5a69', accent: '#3a5a78', names: '#1f3347', rule: 'rgba(58,90,120,.28)', field: '#c4cfdb', btnBg: '#24384d', btnInk: '#f6f9fc', env: '#eef2f5', env2: '#dbe2e8', sealInk: '#101c29', confetti: ['#a9bccf', '#d3dde8', '#ffffff', '#4b6d55'] }),
    foil: 'silver',
    demoEvent: 'matrimonio',
    demo: { name1: 'Silvia', name2: 'Davide' },
  },
  {
    id: 'autunno',
    name: 'Autunno',
    desc: 'Foglie d’acero rosse e oro, bacche e rami',
    category: 'natura',
    events: ['matrimonio', 'compleanno', 'cena', 'festa', 'laurea', 'anniversario', 'pensione'],
    palette: light({ table: '#ece0d0', table2: '#f6efe4', onTable: '#55402f', paper: '#fffaf2', paper2: '#fcf5ea', ink: '#3d2414', muted: '#634a3a', accent: '#9a3f12', rule: 'rgba(154,63,18,.28)', field: '#e3c9b0', btnBg: '#5a2a12', btnInk: '#fff6ea', env: '#f7ecdc', env2: '#ead8c0', sealInk: '#2e1004', confetti: ['#d9622b', '#e8a33d', '#c8452a', '#fffaf2', '#e3b04b'] }),
    foil: 'copper',
    demoEvent: 'matrimonio',
    demo: { name1: 'Camilla', name2: 'Riccardo' },
  },
  {
    id: 'inverno',
    name: 'Inverno',
    desc: 'Rami di pino, pigne e fiocchi di neve in argento',
    category: 'natura',
    events: ['matrimonio', 'natale', 'compleanno', 'festa', 'aziendale', 'cena', 'battesimo'],
    palette: light({ table: '#dfe5e8', table2: '#eff2f4', onTable: '#37474f', paper: '#fbfcfd', paper2: '#f6f8fa', ink: '#1c2b33', muted: '#4a5960', accent: '#2e5a6b', names: '#1c3440', rule: 'rgba(46,90,107,.28)', field: '#c3d0d6', btnBg: '#1f3c47', btnInk: '#f5fafc', env: '#eef2f4', env2: '#dbe3e6', sealInk: '#0e1d24', confetti: ['#ffffff', '#c3cfd8', '#2f5a4a', '#d0d6db'] }),
    foil: 'silver',
    demoEvent: 'matrimonio',
    demo: { name1: 'Greta', name2: 'Alessandro' },
  },
  {
    id: 'arcobaleno',
    name: 'Arcobaleno',
    desc: 'Arcobaleno pastello e nuvole: allegro e tenero',
    category: 'feste',
    events: ['compleanno', 'battesimo', 'babyshower', 'festa', 'genderreveal', 'comunione'],
    palette: light({ table: '#e6e9f2', table2: '#f3f5fa', onTable: '#3f4b66', paper: '#fffdf9', paper2: '#fcf9f3', ink: '#2c3a5a', muted: '#56607a', accent: '#a83f52', names: '#2c3a5a', rule: 'rgba(44,58,90,.2)', field: '#d6d2e2', btnBg: '#2c3a5a', btnInk: '#fffdf8', env: '#f6f3fb', env2: '#e5e1f0', sealInk: '#1b2440', confetti: ['#f3a3a0', '#f7c39a', '#f4dc94', '#bcdba6', '#a5c9e6', '#c3b2e0'] }),
    foil: 'champagne',
    demoEvent: 'compleanno',
    demo: { name1: 'Matilde', subtitle: 'compie 4 anni!' },
  },
  {
    id: 'palloncini',
    name: 'Palloncini',
    desc: 'Mazzi di palloncini colorati: la festa dei bambini',
    category: 'feste',
    events: ['compleanno', 'festa', 'babyshower', 'battesimo', 'genderreveal', 'inaugurazione'],
    palette: light({ table: '#ece6ee', table2: '#f6f2f6', onTable: '#454a66', paper: '#fffdf8', paper2: '#fcf9f2', ink: '#2a2f4a', muted: '#555a72', accent: '#b8344f', names: '#2a2f4a', rule: 'rgba(42,47,74,.2)', field: '#d9d3dc', btnBg: '#2a2f4a', btnInk: '#fffdf8', env: '#fbf2ec', env2: '#efe1d8', sealInk: '#1a1e33', confetti: ['#f28b82', '#f9bf5b', '#8ecae6', '#a8d89a', '#cdb4db', '#f7a8c4'] }),
    demoEvent: 'compleanno',
    demo: { name1: 'Tommaso', subtitle: 'compie 5 anni!' },
  },
  {
    id: 'farfalle',
    name: 'Farfalle',
    desc: 'Farfalle ad acquerello in volo: leggero e delicato',
    category: 'feste',
    events: ['comunione', 'battesimo', 'babyshower', 'compleanno', 'cresima', 'matrimonio'],
    palette: light({ table: '#ebe6ef', table2: '#f6f3f8', onTable: '#4b4258', paper: '#fffdfb', paper2: '#fcf8f5', ink: '#33283f', muted: '#5d5468', accent: '#6d4a8c', rule: 'rgba(109,74,140,.24)', field: '#d8cfe0', btnBg: '#3d2f52', btnInk: '#fdfaff', env: '#f8f3f6', env2: '#e9e0e8', sealInk: '#21182d', confetti: ['#86b6e3', '#f4ae86', '#c2a5e0', '#f2d06b', '#ffffff'] }),
    foil: 'champagne',
    demoEvent: 'comunione',
  },
  {
    id: 'bollicine',
    name: 'Bollicine',
    desc: 'Calici che brindano e bollicine color champagne',
    category: 'feste',
    events: ['festa', 'compleanno', 'laurea', 'aziendale', 'inaugurazione', 'pensione', 'anniversario', 'diciottesimo', 'addio'],
    palette: light({ table: '#e9e0cf', table2: '#f5efe3', onTable: '#4f4337', paper: '#fdfaf3', paper2: '#faf5ea', ink: '#2b241d', muted: '#5e5144', accent: '#7a5a1e', rule: 'rgba(148,113,47,.4)', field: '#d8c8a8', btnBg: '#2b241d', btnInk: '#fbf3e0', env: '#f4ead6', env2: '#e6d7bb', sealInk: '#3d2a0d', confetti: ['#c9a65f', '#ead9a0', '#fdfaf3', '#d8bd7a'] }),
    foil: 'champagne',
    frame: 'line',
    demoEvent: 'pensione',
  },
  {
    id: 'fuochi',
    name: 'Fuochi d’artificio',
    desc: 'Fuochi d’artificio colorati su carta blu notte',
    category: 'feste',
    events: ['diciottesimo', 'festa', 'compleanno', 'aziendale', 'inaugurazione', 'addio', 'natale'],
    palette: { table: '#0c0a18', table2: '#221b40', onTable: '#d6ccb4', paper: '#191230', paper2: '#1c1536', ink: '#f3ead6', muted: '#cfc6b0', accent: '#f0c987', names: '#f8e9c6', rule: 'rgba(240,201,135,.4)', field: '#4c4470', btnBg: '#f0c987', btnInk: '#1a1330', env: '#231a44', env2: '#150f2b', sealInk: '#5e4519', confetti: ['#f59ab8', '#8fd3f0', '#f6d27a', '#b9a3f2'] },
    foil: 'bright',
    dark: 'paper',
    blendNormal: true,
    demoEvent: 'diciottesimo',
  },
  {
    id: 'natale',
    name: 'Natale',
    desc: 'Agrifoglio, bacche rosse e stelle d’oro',
    category: 'feste',
    events: ['natale', 'cena', 'aziendale', 'festa', 'compleanno'],
    palette: light({ table: '#e9dfd2', table2: '#f5efe6', onTable: '#4f3d33', paper: '#fffcf6', paper2: '#fcf7ee', ink: '#2c1a14', muted: '#5a463c', accent: '#9e1b26', rule: 'rgba(158,27,38,.26)', field: '#e2cfc4', btnBg: '#7d1520', btnInk: '#fff7ef', env: '#f6ecdc', env2: '#e9d8c0', sealInk: '#3a0508', confetti: ['#c8202f', '#2f6b45', '#c9a65f', '#fffcf6'] }),
    demoEvent: 'natale',
  },
];

export const THEMES: ThemeDef[] = SPECS.map((t) => ({ ...t, swatches: [t.palette.paper, t.palette.accent, t.palette.names], fonts: FONTS }));

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<ThemeId, ThemeDef>;
export const isTheme = (v: unknown): v is ThemeId => typeof v === 'string' && v in THEME_BY_ID;

/** Styles for an occasion: the ones made for it first (best fit first), then all the others. */
export function themesFor(ev: EventType): { theme: ThemeDef; recommended: boolean }[] {
  const fit = (t: ThemeDef) => t.events.indexOf(ev);
  const made = THEMES.filter((t) => fit(t) >= 0).sort((a, b) => fit(a) - fit(b));
  return [...made.map((theme) => ({ theme, recommended: true })), ...THEMES.filter((t) => fit(t) < 0).map((theme) => ({ theme, recommended: false }))];
}

/** A varied selection for the home page (the /stili page shows them all). */
export const FEATURED_THEMES: ThemeId[] = ['ulivo', 'glicine', 'limoni', 'notte', 'peonie', 'montagna', 'palloncini', 'marmo', 'vigneto'];

// ---------------------------------------------------------------------------
// Envelope liners (tiles)
// ---------------------------------------------------------------------------

type Liner = { img: string; size: number };

/** Diamond lattice with dots (formal papers). */
function linerLattice(bg: string, fg: string): Liner {
  return {
    size: 30,
    img: svgDoc(30, 30, `<rect width="30" height="30" fill="${bg}"/><path d="M0 15L15 0L30 15L15 30Z" fill="none" stroke="${fg}" stroke-width=".7" opacity=".75"/><circle cx="15" cy="15" r="2.2" fill="${fg}" opacity=".8"/><circle cx="0" cy="0" r="1" fill="${fg}"/><circle cx="30" cy="0" r="1" fill="${fg}"/><circle cx="0" cy="30" r="1" fill="${fg}"/><circle cx="30" cy="30" r="1" fill="${fg}"/>`),
  };
}

/** Stripes (vertical, or diagonal with `diagonal`). */
function linerStripes(bg: string, fg: string, w: number, gap: number, diagonal = false): Liner {
  const size = w + gap;
  const body = diagonal
    ? `<path d="M0 ${size}L${size} 0" stroke="${fg}" stroke-width="${w}"/><path d="M${-size / 2} ${size / 2}L${size / 2} ${-size / 2}M${size / 2} ${size * 1.5}L${size * 1.5} ${size / 2}" stroke="${fg}" stroke-width="${w}"/>`
    : `<rect width="${w}" height="${size}" fill="${fg}"/>`;
  return { size, img: svgDoc(size, size, `<rect width="${size}" height="${size}" fill="${bg}"/>${body}`) };
}

/** Polka dots in a staggered grid. */
function linerDots(bg: string, fg: string, r = 2.2, size = 24): Liner {
  const h = size / 2;
  return { size, img: svgDoc(size, size, `<rect width="${size}" height="${size}" fill="${bg}"/><g fill="${fg}"><circle cx="${h / 2}" cy="${h / 2}" r="${r}"/><circle cx="${h * 1.5}" cy="${h * 1.5}" r="${r}"/></g>`) };
}

/** Art-déco fans. */
function linerFans(bg: string, fg: string): Liner {
  let s = `<rect width="40" height="40" fill="${bg}"/>`;
  for (const [cx, cy] of [[20, 20], [0, 40], [40, 40], [0, 0], [40, 0]] as const)
    for (const r of [18, 13, 8]) s += `<path d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="${fg}" stroke-width=".8"/>`;
  return { size: 40, img: svgDoc(40, 40, s) };
}

/** Five-petal blossoms scattered on a tile. */
function linerBlossoms(bg: string, petal: string, heart: string): Liner {
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
  return { size: 44, img: svgDoc(44, 44, `<rect width="44" height="44" fill="${bg}"/><g fill="${petal}">${bloom(12, 12, 3)}${bloom(34, 32, 2.4)}</g><circle cx="12" cy="12" r="1.3" fill="${heart}"/><circle cx="34" cy="32" r="1" fill="${heart}"/>`) };
}

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
    default:
      // newer themes bring their liner in the recipe
      return linerDots('#efe6d6', '#c9a65f');
  }
}

// ---------------------------------------------------------------------------
// Per-theme recipes
// ---------------------------------------------------------------------------


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
    case 'smeraldo':
      return {
        crest: laurelWreath(),
        divider: filigreeDivider(),
        corner: filigreeCorner(),
        seal: { base: '#b8924a', light: '#ecd38c', dark: '#7a5b25' },
        grain: { light: true, amount: 0.06 },
        linen: 0.7,
        liner: linerLattice('#0f3a2e', '#d6b56e'),
      };
    case 'bordeaux': {
      const st = { pal: BORDEAUX, leaves: DEEP_GREEN, stemColor: '#5a6b48' };
      return { paintTop: rosePainting(st, [5, 12]), divider: filigreeDivider(), paintEnd: roseSmall(st), seal: { base: '#7a1b29', light: '#b2414f', dark: '#45070f' }, grain: {}, linen: 0.7, liner: linerLattice('#6e1824', '#d4b06a') };
    }
    case 'marmo':
      return { divider: decoDivider(), corner: decoCorner(), seal: { base: '#2b2b2b', light: '#5f5f5f', dark: '#0d0d0d' }, grain: {}, grainSvg: marble(), linen: 0.7, liner: linerFans('#1c1c1c', '#c9a65f') };
    case 'essenziale':
      return { divider: minimalDivider(), seal: { base: '#1d1d1d', light: '#4d4d4d', dark: '#050505' }, grain: { amount: 0.04 }, linen: 0.6, liner: linerStripes('#ffffff', '#1d1d1d', 1, 7, true) };
    case 'pizzo':
      return { paintTop: lacePainting(laceBand()), divider: filigreeDivider(), seal: { base: '#dfa7ab', light: '#f3cdd0', dark: '#ad6f76' }, grain: { amount: 0.07 }, linen: 0.7, liner: linerDots('#efd6d3', '#ffffff', 2.4, 22) };
    case 'peonie': {
      const st = { pal: PEONY, leaves: PEONY_LEAVES, stemColor: '#7d9070', peonies: true };
      return { paintTop: rosePainting(st, [21, 34]), divider: sprigDivider('leaf'), paintEnd: roseSmall(st), seal: { base: '#d77b80', light: '#f2adb0', dark: '#a14a55' }, grain: {}, linen: 0.7, liner: linerBlossoms('#f6dcd6', '#e59a90', '#fff4f1') };
    }
    case 'lavanda':
      return { paintTop: lavenderPainting(), divider: filigreeDivider(), paintEnd: lavenderSmall(), seal: { base: '#6a568f', light: '#9a86c8', dark: '#40325e' }, grain: {}, linen: 0.7, liner: linerLattice('#5b4a7e', '#d9d4e6') };
    case 'girasoli':
      return { paintTop: sunflowerPainting(), divider: sprigDivider('leaf'), paintEnd: sunflowerSmall(), seal: { base: '#c8902a', light: '#ecc060', dark: '#8a5a10' }, grain: {}, linen: 0.7, liner: linerBlossoms('#5d6b3c', '#f2c230', '#6b4a12') };
    case 'prato':
      return { paintFoot: meadowPainting(), divider: sprigDivider('leaf'), paintEnd: meadowSmall(), seal: { base: '#5b7a3a', light: '#8fb46a', dark: '#36501f' }, grain: {}, linen: 0.7, liner: linerBlossoms('#dfe9d0', '#ffffff', '#f4d34a') };
    case 'ortensie':
      return { paintTop: hydrangeaPainting(), divider: filigreeDivider(), paintEnd: hydrangeaSmall(), seal: { base: '#6b85c4', light: '#a3b7e3', dark: '#3f548c' }, grain: {}, linen: 0.7, liner: linerDots('#cfdaee', '#ffffff', 2.2, 22) };
    case 'glicine':
      return { paintTop: wisteriaPainting(), divider: sprigDivider('leaf'), paintEnd: wisteriaSmall(), seal: { base: '#8a6bb5', light: '#b9a0dc', dark: '#5a417e' }, grain: {}, linen: 0.7, liner: linerStripes('#efe8f6', '#d9c9ec', 4, 8) };
    case 'ciliegio':
      return { paintTop: cherryPainting(), divider: filigreeDivider(), paintEnd: cherrySmall(), seal: { base: '#e08ea0', light: '#f6c1cc', dark: '#a9566a' }, grain: {}, linen: 0.7, liner: linerBlossoms('#f3d6dc', '#ffffff', '#e08ea0') };
    case 'rustico':
      return { paintTop: gypsophilaPainting(), divider: sprigDivider('leaf'), paintEnd: gypsophilaSmall(), seal: { base: '#efe7da', light: '#fffaf0', dark: '#c4b59c' }, grain: {}, grainSvg: kraftGrain(), linen: 0.7, liner: linerDots('#efe6d6', '#b89a6c', 1.6, 18) };
    case 'sicilia':
      return { paintTop: orangePainting(), divider: sprigDivider('leaf'), paintEnd: orangeSmall(), seal: { base: '#c45a1c', light: '#ec8c46', dark: '#82340c' }, grain: {}, linen: 0.7, liner: linerLattice('#a3471a', '#ffd27a') };
    case 'vigneto':
      return { paintTop: vinePainting(), divider: sprigDivider('leaf'), paintEnd: vineSmall(), seal: { base: '#5e2a4a', light: '#8e5478', dark: '#36122a' }, grain: {}, linen: 0.7, liner: linerStripes('#e9e0cf', '#c9b48e', 2, 10) };
    case 'eucalipto':
      return { paintTop: eucalyptusPainting(), divider: sprigDivider('leaf'), paintEnd: eucalyptusSmall(), seal: { base: '#7f9c8e', light: '#adc6b9', dark: '#4f6b5e' }, grain: {}, linen: 0.7, liner: linerDots('#dbe5df', '#ffffff', 2, 20) };
    case 'riviera':
      return { paintTop: awningPainting(), divider: waveDivider(), paintEnd: shellsSmall(), seal: { base: '#2f6aa3', light: '#6d9ccf', dark: '#163f6c' }, grain: { amount: 0.06 }, linen: 0.7, liner: linerStripes('#ffffff', '#3c79b4', 8, 8) };
    case 'tropicale':
      return { paintTop: tropicalPainting(), divider: sprigDivider('leaf'), paintEnd: tropicalSmall(), seal: { base: '#2f6a4a', light: '#5f9e6c', dark: '#1a4530' }, grain: {}, linen: 0.7, liner: linerBlossoms('#1e6a52', '#f27b7b', '#f2b22d') };
    case 'montagna':
      return { paintFoot: mountainPainting(), divider: starDivider(), paintEnd: mountainSmall(), seal: { base: '#4b6a86', light: '#7f9db8', dark: '#2a4259' }, grain: { amount: 0.06 }, linen: 0.7, liner: linerStripes('#e6ecf1', '#c3d0dc', 3, 9) };
    case 'autunno':
      return { paintTop: autumnPainting(), divider: sprigDivider('leaf'), paintEnd: autumnSmall(), seal: { base: '#a8461c', light: '#d9733f', dark: '#6b2809' }, grain: {}, linen: 0.7, liner: linerDots('#9a3f12', '#e8a33d', 2, 20) };
    case 'inverno':
      return { paintTop: winterPainting(), foilTop: snowFoil(), divider: snowDivider(), paintEnd: winterSmall(), seal: { base: '#2f5a4a', light: '#5c8a74', dark: '#1a3a2e' }, grain: { amount: 0.06 }, linen: 0.7, liner: linerDots('#2e5a6b', '#ffffff', 1.8, 20) };
    case 'arcobaleno':
      return { paintTop: rainbowPainting(), divider: starDivider(), paintEnd: rainbowSmall(), seal: { base: '#8fb8de', light: '#c3dcf0', dark: '#5a86b3' }, grain: { amount: 0.06 }, linen: 0.7, liner: linerDots('#eaf2fa', '#f3a3a0', 2.2, 22) };
    case 'palloncini':
      return { paintTop: balloonPainting(), divider: starDivider(), paintEnd: balloonSmall(), seal: { base: '#e9776e', light: '#f6aaa3', dark: '#b4483f' }, grain: { amount: 0.06 }, linen: 0.7, liner: linerDots('#fde9df', '#8ecae6', 2.6, 24) };
    case 'farfalle':
      return { paintTop: butterflyPainting(), divider: filigreeDivider(), paintEnd: butterflySmall(), seal: { base: '#a58bc9', light: '#cbb8e4', dark: '#6d4a8c' }, grain: {}, linen: 0.7, liner: linerBlossoms('#efe6f6', '#c2a5e0', '#f2d06b') };
    case 'bollicine':
      return { foilTop: bubblyFoil(), divider: bubblesDivider(), seal: { base: '#b8924a', light: '#ecd38c', dark: '#7a5b25' }, grain: {}, linen: 0.7, liner: linerDots('#2b241d', '#c9a65f', 1.6, 18) };
    case 'fuochi':
      return { paintTop: fireworksPainting(), foilTop: fireworksFoil(), divider: decoDivider(), seal: { base: '#b8924a', light: '#ecd38c', dark: '#7a5b25' }, grain: { light: true, amount: 0.06 }, linen: 0.7, liner: linerDots('#191230', '#f0c987', 1.4, 18) };
    case 'natale':
      return { paintTop: hollyPainting(), foilTop: christmasStars(), divider: starDivider(), paintEnd: hollySmall(), seal: { base: '#a3182a', light: '#d4464f', dark: '#5e0912' }, grain: {}, linen: 0.7, liner: linerStripes('#ffffff', '#a3182a', 4, 8, true) };
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
  /** artwork along the bottom edge of the invitation card */
  foot: string;
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
    foot: r.paintFoot ? '<div class="art art-foot" aria-hidden="true"></div>' : '',
    scatter: r.scatter ? '<div class="scatter" aria-hidden="true"></div>' : undefined,
  };
}

/** Colours, foil and the dark-paper adjustments of a theme as CSS custom properties. */
function paletteVars(def: ThemeDef): string[] {
  const p = def.palette;
  const vars = [
    `--table:${p.table}`,
    `--table-2:${p.table2}`,
    `--on-table:${p.onTable}`,
    `--paper:${p.paper}`,
    `--paper-2:${p.paper2}`,
    `--ink:${p.ink}`,
    `--muted:${p.muted}`,
    `--accent:${p.accent}`,
    `--names:${p.names}`,
    `--rule:${p.rule}`,
    `--field:${p.field}`,
    `--btn-bg:${p.btnBg}`,
    `--btn-ink:${p.btnInk}`,
    `--env:${p.env}`,
    `--env-2:${p.env2}`,
    `--seal-ink:${p.sealInk}`,
    `--confetti:${p.confetti.join(',')}`,
  ];
  if (def.foil && def.foil !== 'gold') vars.push(`--foil:var(--foil-${def.foil})`);
  if (def.namesSize) vars.push(`--names-size:${def.namesSize}px`);
  if (def.blendNormal) vars.push('--blend:normal');
  if (def.dark) {
    vars.push(
      '--sheet-shadow:0 1px 1px rgba(0,0,0,.3),0 10px 16px -8px rgba(0,0,0,.5),0 44px 70px -36px rgba(0,0,0,.85)',
      '--table-ink:#f2e3bd',
      '--seal-shadow:0 1px 0 rgba(255,250,220,.5),0 -1px 0 rgba(60,40,10,.35)',
    );
  }
  if (def.dark === 'paper') vars.push('--box:rgba(255,255,255,.05)', '--field-bg:rgba(255,255,255,.06)', '--track:rgba(255,255,255,.12)', '--err:#f0a493');
  return vars;
}

function buildCss(id: ThemeId): string {
  const r = recipe(id);
  const def = THEME_BY_ID[id];
  const t = `.t-${id}`;
  const ln = r.liner ?? liner(id);
  const rules: string[] = [];
  const vars = [
    ...paletteVars(def),
    `--grain:${dataUri(r.grainSvg ?? paperGrain({ ...r.grain, seed: 3 }))}`,
    `--linen:${dataUri(linen(200, 9, r.linen))}`,
    `--liner:${dataUri(ln.img)}`,
    `--liner-size:${ln.size}px`,
    `--seal-img:${dataUri(waxSeal(r.seal, id.length * 7 + 3))}`,
    `--m-div:${dataUri(r.divider)}`,
    `--div-ar:${viewBox(r.divider)}`,
  ];
  rules.push(`${t}{${vars.join(';')}}`);
  if (def.frame === 'double') rules.push(`${t} .sheet-main::before{content:"";outline:1px solid var(--rule);outline-offset:4px}`);
  if (def.frame === 'line') rules.push(`${t} .sheet-main::before{content:"";inset:12px}`);
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
  if (r.paintFoot) rules.push(`${t} .art-foot{aspect-ratio:${viewBox(r.paintFoot)};--paint:${dataUri(r.paintFoot)}}`);
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
