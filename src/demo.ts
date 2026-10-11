import { defaultInviteData } from './config';
import { THEME_BY_ID } from './themes';
import type { EventType, Invitation, ThemeId } from './types';
import { addDays, nowIso } from './util';

/** A fully populated, never-saved invitation used for /demo pages and the landing page. */
export function demoInvitation(theme: ThemeId, eventType?: EventType): Invitation {
  const ev = eventType ?? THEME_BY_ID[theme].demoEvent;
  const data = defaultInviteData(ev);
  data.rsvpDeadline = addDays(data.date, -30);
  if (ev === 'matrimonio' || ev === 'anniversario') {
    data.iban = 'IT60X0542811101000000123456';
    data.ibanHolder = ev === 'matrimonio' ? 'Anna Rossi e Marco Bianchi' : 'Paola e Roberto Verdi';
    data.contactName = data.name1;
    data.contactPhone = '+39 333 123 4567';
  }
  if (ev === 'matrimonio') data.customQuestion = 'Ti servirà il bus navetta dalla chiesa?';
  if (ev === 'compleanno') data.contactName = 'mamma Elena';
  if (ev === 'compleanno') data.contactPhone = '+39 333 765 4321';
  const now = nowIso();
  return {
    id: `demo-${theme}`,
    slug: `demo-${theme}`,
    vanity: null,
    admin_token: '',
    event_type: ev,
    theme,
    status: 'active',
    data,
    cover_key: null,
    email: null,
    notify_rsvp: 0,
    event_date: data.date,
    views: 0,
    created_at: now,
    updated_at: now,
    activated_at: now,
    amount_cents: 0,
    stripe_session_id: null,
  };
}
