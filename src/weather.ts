/**
 * Weather forecast for the day of the event (shown in the 14 days before it).
 * Uses Open-Meteo: free, no API key, no personal data sent (only the town name and the date).
 */
import { visibleProgram } from './model';
import type { Env, InviteData } from './types';
import { daysUntil, formatDateParts } from './util';

export interface Forecast {
  ok: true;
  icon: 'sun' | 'partly' | 'cloud' | 'rain' | 'storm' | 'snow' | 'fog';
  title: string;
  text: string;
}

/** "Via Santa Chiara 26, Ravello" → "Ravello"; falls back to the place name. */
export function townOf(address: string, place: string): string {
  const parts = address.split(',').map((p) => p.replace(/\b\d{5}\b/g, '').replace(/\(\w{2}\)/g, '').trim()).filter(Boolean);
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? '';
  const town = /\d/.test(last) && parts.length > 1 ? parts[parts.length - 2] : last;
  return (town || place).replace(/^(via|viale|piazza|corso|località|loc\.)\s.*/i, '').trim() || place;
}

function describe(code: number): { icon: Forecast['icon']; text: string } {
  if (code === 0) return { icon: 'sun', text: 'sereno' };
  if (code === 1) return { icon: 'sun', text: 'quasi sereno' };
  if (code === 2) return { icon: 'partly', text: 'parzialmente nuvoloso' };
  if (code === 3) return { icon: 'cloud', text: 'nuvoloso' };
  if (code === 45 || code === 48) return { icon: 'fog', text: 'nebbia' };
  if (code >= 51 && code <= 57) return { icon: 'rain', text: 'pioviggine' };
  if (code >= 61 && code <= 67) return { icon: 'rain', text: code >= 65 ? 'pioggia forte' : 'pioggia' };
  if (code >= 71 && code <= 77) return { icon: 'snow', text: 'neve' };
  if (code >= 80 && code <= 82) return { icon: 'rain', text: 'rovesci' };
  if (code === 85 || code === 86) return { icon: 'snow', text: 'rovesci di neve' };
  if (code >= 95) return { icon: 'storm', text: 'temporali' };
  return { icon: 'cloud', text: 'variabile' };
}

export async function forecastFor(env: Env, d: InviteData): Promise<Forecast | null> {
  if (env.WEATHER === 'false' || !d.showWeather) return null;
  const days = daysUntil(d.date);
  if (days < 0 || days > 14) return null;
  const first = visibleProgram(d, null).find((p) => p.address || p.place);
  if (!first) return null;
  const town = townOf(first.address, first.place);
  if (!town) return null;

  const cacheKey = new Request(`https://meteo.confetto.invalid/${encodeURIComponent(town.toLowerCase())}/${d.date}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const hit = await cache?.match(cacheKey).catch(() => undefined);
  if (hit) return (await hit.json()) as Forecast;

  // WEATHER_API_BASE: a mock server in tests
  const geoBase = env.WEATHER_API_BASE || 'https://geocoding-api.open-meteo.com';
  const fcBase = env.WEATHER_API_BASE || 'https://api.open-meteo.com';
  try {
    const geo = (await (
      await fetch(`${geoBase}/v1/search?name=${encodeURIComponent(town)}&count=1&language=it&format=json`, { signal: AbortSignal.timeout(4000) })
    ).json()) as { results?: { latitude: number; longitude: number; name: string }[] };
    const loc = geo.results?.[0];
    if (!loc) return null;
    const url =
      `${fcBase}/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FRome&start_date=${d.date}&end_date=${d.date}`;
    const fc = (await (await fetch(url, { signal: AbortSignal.timeout(4000) })).json()) as {
      daily?: { weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[] };
    };
    const day = fc.daily;
    if (!day || day.weather_code?.[0] == null) return null;
    const w = describe(day.weather_code[0]);
    const parts = formatDateParts(d.date);
    const rain = day.precipitation_probability_max?.[0];
    const out: Forecast = {
      ok: true,
      icon: w.icon,
      title: `Previsioni per ${parts ? `${parts.weekday} ${parts.day}` : 'il grande giorno'}: ${w.text}`,
      text: `${loc.name} · massima ${Math.round(day.temperature_2m_max[0])}°, minima ${Math.round(day.temperature_2m_min[0])}°${rain != null ? ` · pioggia ${rain}%` : ''}`,
    };
    await cache?.put(cacheKey, new Response(JSON.stringify(out), { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=10800' } })).catch(() => undefined);
    return out;
  } catch {
    return null;
  }
}
