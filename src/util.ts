const SAFE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o/1/l/i: easy to read aloud
const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function randomString(len: number, alphabet = SAFE_ALPHABET): string {
  // Rejection sampling avoids modulo bias.
  const limit = 256 - (256 % alphabet.length);
  let out = '';
  while (out.length < len) {
    for (const b of crypto.getRandomValues(new Uint8Array(len * 2))) {
      if (b < limit) out += alphabet[b % alphabet.length];
      if (out.length === len) break;
    }
  }
  return out;
}

export const newId = () => randomString(12);
export const newToken = () => randomString(32, TOKEN_ALPHABET);
export const nowIso = () => new Date().toISOString();

export function slugify(input: string, max = 40): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- Dates (all event dates are Europe/Rome wall-clock times) ----------

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidYmd(s: string): boolean {
  const m = YMD.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export const isValidHm = (s: string) => HM.test(s);

function ymdToUtcDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(ymd: string, days: number): string {
  const d = ymdToUtcDate(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Rome calendar date (YYYY-MM-DD) of an instant. */
export function romeYmd(at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(at);
}

export const todayRome = () => romeYmd();

/** Days from today (Rome) to ymd; negative when in the past. */
export function daysUntil(ymd: string): number {
  return Math.round((ymdToUtcDate(ymd).getTime() - ymdToUtcDate(todayRome()).getTime()) / 86400000);
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Converts a Rome wall-clock date/time into the matching UTC instant. */
export function romeToUtc(ymd: string, hm: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  const [hh, mm] = (isValidHm(hm) ? hm : '12:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let ts = guess - tzOffsetMinutes(new Date(guess), 'Europe/Rome') * 60000;
  const corrected = guess - tzOffsetMinutes(new Date(ts), 'Europe/Rome') * 60000;
  if (corrected !== ts) ts = corrected;
  return new Date(ts);
}

const fmtLong = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const fmtShort = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtDayMonth = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/** "sabato 12 giugno 2027" */
export const formatDateLong = (ymd: string) => (isValidYmd(ymd) ? fmtLong.format(ymdToUtcDate(ymd)) : '');
/** "12 giugno 2027" */
export const formatDateShort = (ymd: string) => (isValidYmd(ymd) ? fmtShort.format(ymdToUtcDate(ymd)) : '');
/** "12 giugno" */
export const formatDayMonth = (ymd: string) => (isValidYmd(ymd) ? fmtDayMonth.format(ymdToUtcDate(ymd)) : '');

/** "11:00" -> "ore 11:00" */
export const formatTime = (hm: string) => (isValidHm(hm) ? `ore ${hm}` : '');

export function formatDateTimeIt(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  }).format(new Date(iso));
}

/** First Saturday at least `minDays` after `from` (used for sample data). */
export function sampleSaturday(minDays: number, from: string = todayRome()): string {
  let ymd = addDays(from, minDays);
  while (ymdToUtcDate(ymd).getUTCDay() !== 6) ymd = addDays(ymd, 1);
  return ymd;
}

// ---------- Money ----------

export function euro(cents: number): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

// ---------- Links ----------

/** Normalizes a phone number for wa.me (Italian numbers get the 39 prefix). */
export function waNumber(phone: string): string {
  let d = phone.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (/^[03]\d{5,10}$/.test(d)) d = '39' + d;
  return d.replace(/\D/g, '');
}

export function waLink(text: string, phone?: string | null): string {
  const n = phone ? waNumber(phone) : '';
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

export function mapsLink(place: string, address: string): string {
  const q = [place, address].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

/** ISO 13616 mod-97 check. */
export function isValidIban(iban: string): boolean {
  const s = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const v = ch >= 'A' ? (ch.charCodeAt(0) - 55).toString() : ch;
    for (const digit of v) rem = (rem * 10 + Number(digit)) % 97;
  }
  return rem === 1;
}

export function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function str(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
}

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 200;
}

const BOT_UA = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|skype|embedly|vkshare|pinterest|headless/i;
export const isBot = (ua: string | undefined | null) => !ua || BOT_UA.test(ua);
