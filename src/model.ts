import { defaultInviteData } from './config';
import { isTheme } from './themes';
import type { EventType, GiftItem, Invitation, InvitationRow, InviteData, Person, ProgramItem, StayItem, StoryItem, TableReveal, ThemeId } from './types';
import { daysUntil, isValidHm, isValidYmd, nowIso, randomString, romeYmd, str } from './util';

export const LIMITS = {
  name: 60,
  eyebrow: 60,
  subtitle: 80,
  message: 1200,
  programItems: 5,
  programTitle: 60,
  programPlace: 90,
  programAddress: 140,
  dressCode: 140,
  giftText: 400,
  ibanHolder: 80,
  giftLink: 300,
  customQuestion: 120,
  contactName: 40,
  contactPhone: 24,
  signature: 120,
  menuOptions: 6,
  menuOption: 40,
  gifts: 30,
  giftTitle: 80,
  giftNote: 160,
  stays: 6,
  story: 8,
  storyText: 300,
  notice: 400,
  song: 120,
  personName: 60,
  gallery: 8,
};

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : v === 'true' || v === 'on' ? true : v === 'false' ? false : fallback);
const obj = (v: unknown) => (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;

/** Accepts http(s) links, or bare domains ("www.amazon.it/…"); anything else becomes ''. */
export function cleanLink(v: unknown, max = 300): string {
  const s = str(v, max);
  if (!s) return '';
  if (/^https?:\/\/[^\s]+$/i.test(s)) return s;
  return /^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(s) ? `https://${s}` : '';
}

/** "Carne, Pesce, Vegetariano" or an array → unique, non-empty options. */
export function cleanMenuOptions(v: unknown): string[] {
  const raw = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,;\n]/) : [];
  const out: string[] = [];
  for (const o of raw) {
    const t = str(o, LIMITS.menuOption);
    if (t && !out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
  }
  return out.slice(0, LIMITS.menuOptions);
}

function cleanGifts(v: unknown): GiftItem[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: GiftItem[] = [];
  for (const raw of v.slice(0, LIMITS.gifts)) {
    const it = obj(raw);
    const title = str(it.title, LIMITS.giftTitle);
    if (!title) continue;
    let id = str(it.id, 12);
    if (!/^[a-z0-9]{6,12}$/.test(id) || seen.has(id)) id = randomString(8);
    seen.add(id);
    const price = Math.round(Number(String(it.price ?? '').replace(',', '.')) || 0);
    out.push({ id, kind: it.kind === 'fund' ? 'fund' : 'item', title, note: str(it.note, LIMITS.giftNote), link: cleanLink(it.link), price: Math.min(Math.max(price, 0), 100000) });
  }
  return out;
}

function cleanStays(v: unknown): StayItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, LIMITS.stays)
    .map((raw) => {
      const it = obj(raw);
      return { name: str(it.name, 80), address: str(it.address, LIMITS.programAddress), link: cleanLink(it.link), note: str(it.note, 160) };
    })
    .filter((s) => s.name);
}

function cleanStory(v: unknown): StoryItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, LIMITS.story)
    .map((raw) => {
      const it = obj(raw);
      return { when: str(it.when, 40), title: str(it.title, 80), text: str(it.text, LIMITS.storyText) };
    })
    .filter((s) => s.title || s.text);
}

const TABLE_REVEALS: TableReveal[] = ['never', 'day', 'always'];
const isIso = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(v);

/** Accepts untrusted input and returns a complete, valid InviteData. */
export function sanitizeInviteData(input: unknown, eventType: EventType, previous?: InviteData): InviteData {
  const base = previous ?? defaultInviteData(eventType);
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const pick = (key: keyof InviteData, max: number) => (key in src ? str(src[key], max) : (base[key] as string));

  const date = 'date' in src && isValidYmd(String(src.date)) ? String(src.date) : base.date;
  const time = 'time' in src ? (isValidHm(String(src.time)) ? String(src.time) : '') : base.time;
  let rsvpDeadline =
    'rsvpDeadline' in src ? (isValidYmd(String(src.rsvpDeadline)) ? String(src.rsvpDeadline) : '') : base.rsvpDeadline;
  // a deadline after the event makes no sense (e.g. the sample one, after the host moved the date earlier)
  if (rsvpDeadline && rsvpDeadline > date) rsvpDeadline = '';

  let program: ProgramItem[] = base.program;
  if (Array.isArray(src.program)) {
    program = src.program
      .slice(0, LIMITS.programItems)
      .map((raw) => {
        const it = obj(raw);
        const t = str(it.time, 5);
        return {
          time: isValidHm(t) ? t : '',
          title: str(it.title, LIMITS.programTitle),
          place: str(it.place, LIMITS.programPlace),
          address: str(it.address, LIMITS.programAddress),
          restricted: bool(it.restricted, false),
        };
      })
      .filter((it) => it.time || it.title || it.place || it.address);
  }

  const giftLink = 'giftLink' in src ? cleanLink(src.giftLink, LIMITS.giftLink) : base.giftLink;
  const notice = pick('notice', LIMITS.notice);
  let noticeAt = '';
  if (notice) {
    if (previous && notice !== previous.notice) noticeAt = nowIso();
    else noticeAt = isIso(src.noticeAt) ? String(src.noticeAt) : isIso(base.noticeAt) ? base.noticeAt : nowIso();
  }

  const iban = 'iban' in src ? str(src.iban, 50).replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 34) : base.iban;
  const contactPhone = 'contactPhone' in src ? str(src.contactPhone, LIMITS.contactPhone).replace(/[^\d+ ]/g, '') : base.contactPhone;

  return {
    eyebrow: pick('eyebrow', LIMITS.eyebrow),
    name1: pick('name1', LIMITS.name),
    name2: pick('name2', LIMITS.name),
    subtitle: pick('subtitle', LIMITS.subtitle),
    date,
    time,
    message: pick('message', LIMITS.message),
    program,
    dressCode: pick('dressCode', LIMITS.dressCode),
    giftText: pick('giftText', LIMITS.giftText),
    iban,
    ibanHolder: pick('ibanHolder', LIMITS.ibanHolder),
    giftLink,
    rsvpDeadline,
    askChildren: bool(src.askChildren, base.askChildren),
    askDiet: bool(src.askDiet, base.askDiet),
    customQuestion: pick('customQuestion', LIMITS.customQuestion),
    contactName: pick('contactName', LIMITS.contactName),
    contactPhone,
    signature: pick('signature', LIMITS.signature),
    showCountdown: bool(src.showCountdown, base.showCountdown),
    menuOptions: 'menuOptions' in src ? cleanMenuOptions(src.menuOptions) : base.menuOptions ?? [],
    askNames: bool(src.askNames, base.askNames ?? false),
    askSong: bool(src.askSong, base.askSong ?? false),
    gifts: 'gifts' in src ? cleanGifts(src.gifts) : base.gifts ?? [],
    stays: 'stays' in src ? cleanStays(src.stays) : base.stays ?? [],
    ridesBoard: bool(src.ridesBoard, base.ridesBoard ?? false),
    story: 'story' in src ? cleanStory(src.story) : base.story ?? [],
    tableReveal: TABLE_REVEALS.includes(src.tableReveal as TableReveal) ? (src.tableReveal as TableReveal) : base.tableReveal ?? 'never',
    saveTheDate: bool(src.saveTheDate, base.saveTheDate ?? false),
    notice,
    noticeAt,
    showWeather: bool(src.showWeather, base.showWeather ?? true),
  };
}

/** Validates the people of an answer against the invitation settings. */
export function sanitizePeople(input: unknown, d: InviteData, adults: number, children: number): Person[] {
  if (!(d.askNames || d.menuOptions.length) || !Array.isArray(input)) return [];
  const total = adults + children;
  return input.slice(0, total).map((raw, i) => {
    const it = obj(raw);
    const menu = str(it.menu, LIMITS.menuOption);
    return {
      name: d.askNames ? str(it.name, LIMITS.personName) : '',
      menu: d.menuOptions.includes(menu) ? menu : '',
      child: i >= adults,
    };
  });
}

export function parsePeople(json: string | null): Person[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as Person[]) : [];
  } catch {
    return [];
  }
}

/** "Anna · Carne | Luca · Pesce" (dashboard and CSV). */
export function peopleSummary(json: string | null): string {
  return parsePeople(json)
    .map((p) => [p.name, p.menu].filter(Boolean).join(' · '))
    .filter(Boolean)
    .join(' | ');
}

export function parseGallery(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

/** Programme steps a given guest can see: the public link only shows the steps open to everyone. */
export function visibleProgram(d: InviteData, guest: { full_access: number } | null | undefined, showAll = false): ProgramItem[] {
  if (showAll) return d.program;
  return d.program.filter((p) => !p.restricted || (guest ? guest.full_access === 1 : false));
}

export function parseInvitation(row: InvitationRow): Invitation {
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(row.data);
  } catch {
    // fall back to defaults below
  }
  return { ...row, data: sanitizeInviteData(parsed, row.event_type) };
}

export function sanitizeTheme(v: unknown, fallback: ThemeId): ThemeId {
  return isTheme(v) ? v : fallback;
}

/** "Anna & Marco" / "Leonardo" */
export function displayNames(d: Pick<InviteData, 'name1' | 'name2'>, joiner = ' & '): string {
  return [d.name1, d.name2].filter(Boolean).join(joiner) || 'Il tuo invito';
}

/** Initials for the wax seal: "A&M" / "L" */
export function initials(d: Pick<InviteData, 'name1' | 'name2'>): string {
  const first = (s: string) => (s.trim().match(/\p{L}/u)?.[0] ?? '').toUpperCase();
  const a = first(d.name1);
  const b = first(d.name2);
  return a && b ? `${a}&${b}` : a || '♥';
}

/** Public path of an invitation (pretty slug once activated). */
export function publicPath(inv: Pick<InvitationRow, 'slug' | 'vanity'>, guestCode?: string): string {
  return `/i/${inv.vanity || inv.slug}${guestCode ? `/${guestCode}` : ''}`;
}

/** Fields still holding the sample values: we warn the host before publishing. */
export function untouchedSampleFields(inv: Invitation): string[] {
  const sample = defaultInviteData(inv.event_type, romeYmd(new Date(inv.created_at)));
  const d = inv.data;
  const out: string[] = [];
  if (d.date === sample.date) out.push('la data');
  if (d.name1 && d.name1 === sample.name1) out.push('il nome');
  if (sample.program[0] && d.program.some((p) => p.address === sample.program[0].address || p.address === sample.program[1]?.address))
    out.push('gli indirizzi del programma');
  if (d.message === sample.message && d.name1 === sample.name1) out.push('il messaggio');
  return out;
}

/** Guests see their table on their personal link: always, from the day of the event, or never. */
export function tableRevealActive(d: Pick<InviteData, 'tableReveal' | 'date'>): boolean {
  if (d.tableReveal === 'always') return true;
  return d.tableReveal === 'day' && isValidYmd(d.date) && daysUntil(d.date) <= 0;
}
