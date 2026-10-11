import { isValidHm } from './util';

interface CalEvent {
  uid: string;
  title: string;
  date: string; // YYYY-MM-DD (Rome)
  time: string; // HH:MM or '' for all-day
  durationMin: number;
  location: string;
  details: string;
  url: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Wall-clock arithmetic on a naive local time; returns YYYYMMDDTHHMMSS. */
function localStamp(date: string, time: string, plusMin = 0): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm) + plusMin * 60000);
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`;
}

function dayStamp(date: string, plusDays = 0): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + plusDays));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`;
}

export function googleCalendarUrl(e: CalEvent): string {
  const dates = isValidHm(e.time)
    ? `${localStamp(e.date, e.time)}/${localStamp(e.date, e.time, e.durationMin)}`
    : `${dayStamp(e.date)}/${dayStamp(e.date, 1)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates,
    ctz: 'Europe/Rome',
    location: e.location,
    details: `${e.details}\n${e.url}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** RFC 5545 line folding at 75 octets. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    if (size + len > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const VTIMEZONE_ROME = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Rome',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

export function icsFile(e: CalEvent): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const timed = isValidHm(e.time);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Confetto//Inviti digitali//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(timed ? VTIMEZONE_ROME : []),
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${now}`,
    timed ? `DTSTART;TZID=Europe/Rome:${localStamp(e.date, e.time)}` : `DTSTART;VALUE=DATE:${dayStamp(e.date)}`,
    timed ? `DTEND;TZID=Europe/Rome:${localStamp(e.date, e.time, e.durationMin)}` : `DTEND;VALUE=DATE:${dayStamp(e.date, 1)}`,
    `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : '',
    `DESCRIPTION:${esc(`${e.details}\n${e.url}`)}`,
    `URL:${e.url}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(e.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.map(fold).join('\r\n') + '\r\n';
}
