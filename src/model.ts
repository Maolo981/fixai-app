import { defaultInviteData } from './config';
import { isTheme } from './themes';
import type { EventType, Invitation, InvitationRow, InviteData, ProgramItem, ThemeId } from './types';
import { isValidHm, isValidYmd, romeYmd, str } from './util';

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
};

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : v === 'true' || v === 'on' ? true : v === 'false' ? false : fallback);

/** Accepts untrusted input and returns a complete, valid InviteData. */
export function sanitizeInviteData(input: unknown, eventType: EventType, previous?: InviteData): InviteData {
  const base = previous ?? defaultInviteData(eventType);
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const pick = (key: keyof InviteData, max: number) => (key in src ? str(src[key], max) : (base[key] as string));

  const date = 'date' in src && isValidYmd(String(src.date)) ? String(src.date) : base.date;
  const time = 'time' in src ? (isValidHm(String(src.time)) ? String(src.time) : '') : base.time;
  const rsvpDeadline =
    'rsvpDeadline' in src ? (isValidYmd(String(src.rsvpDeadline)) ? String(src.rsvpDeadline) : '') : base.rsvpDeadline;

  let program: ProgramItem[] = base.program;
  if (Array.isArray(src.program)) {
    program = src.program
      .slice(0, LIMITS.programItems)
      .map((raw) => {
        const it = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
        const t = str(it.time, 5);
        return {
          time: isValidHm(t) ? t : '',
          title: str(it.title, LIMITS.programTitle),
          place: str(it.place, LIMITS.programPlace),
          address: str(it.address, LIMITS.programAddress),
        };
      })
      .filter((it) => it.time || it.title || it.place || it.address);
  }

  let giftLink = pick('giftLink', LIMITS.giftLink);
  if (giftLink && !/^https?:\/\/[^\s]+$/i.test(giftLink)) giftLink = /^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(giftLink) ? `https://${giftLink}` : '';

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
  };
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
