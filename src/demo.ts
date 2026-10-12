import { EVENT_BY_ID, defaultInviteData } from './config';
import { THEME_BY_ID } from './themes';
import type { EventType, GiftClaimRow, GiftItem, Invitation, RideRow, ThemeId } from './types';
import { addDays, nowIso } from './util';

const SAMPLE_GIFTS: Partial<Record<EventType, GiftItem[]>> = {
  matrimonio: [
    { id: 'demogift1', kind: 'item', title: 'Servizio di piatti in porcellana', note: 'Bianco, per 12 persone', link: '', price: 240 },
    { id: 'demogift2', kind: 'item', title: 'Macchina del caffè', note: '', link: '', price: 180 },
    { id: 'demofund1', kind: 'fund', title: 'Viaggio di nozze in Giappone', note: 'Ogni quota, piccola o grande, ci porta un po’ più lontano', link: '', price: 3000 },
  ],
  anniversario: [{ id: 'demofund1', kind: 'fund', title: 'Un weekend a Parigi', note: 'Il viaggio che sognano da quarant’anni', link: '', price: 800 }],
  battesimo: [
    { id: 'demogift1', kind: 'item', title: 'Passeggino', note: '', link: '', price: 450 },
    { id: 'demogift2', kind: 'item', title: 'Seggiolone', note: '', link: '', price: 120 },
    { id: 'demofund1', kind: 'fund', title: 'Il suo primo libretto di risparmio', note: '', link: '', price: 0 },
  ],
  babyshower: [
    { id: 'demogift1', kind: 'item', title: 'Fasciatoio', note: '', link: '', price: 140 },
    { id: 'demogift2', kind: 'item', title: 'Body neonato (6 pezzi)', note: 'Taglia 0-3 mesi', link: '', price: 35 },
  ],
  comunione: [{ id: 'demofund1', kind: 'fund', title: 'La sua prima bicicletta', note: '', link: '', price: 300 }],
  diciottesimo: [{ id: 'demofund1', kind: 'fund', title: 'Regalo di gruppo: la patente', note: '', link: '', price: 900 }],
  laurea: [{ id: 'demofund1', kind: 'fund', title: 'Regalo di gruppo: il viaggio di laurea', note: '', link: '', price: 1000 }],
};

/** A fully populated, never-saved invitation used for /demo pages and the landing page. */
export function demoInvitation(theme: ThemeId, eventType?: EventType): Invitation {
  const ev = eventType ?? THEME_BY_ID[theme].demoEvent;
  let data = defaultInviteData(ev);
  // each style shows its own example names (unless a specific occasion is asked)
  const demo = eventType ? undefined : THEME_BY_ID[theme].demo;
  if (demo) {
    const { phrase, ...fields } = demo;
    // the sample names of the occasion also appear in the message, places and signature: swap them everywhere
    let json = JSON.stringify(data);
    for (const k of ['name1', 'name2'] as const) {
      const from = data[k];
      const to = fields[k];
      if (from && to) json = json.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), to);
    }
    data = { ...JSON.parse(json), ...fields };
    if (phrase !== undefined) data.message = EVENT_BY_ID[ev].phrases[phrase].replaceAll('{nome}', data.name1);
  }
  data.rsvpDeadline = addDays(data.date, -30);
  if (ev === 'matrimonio' || ev === 'anniversario') {
    data.iban = 'IT60X0542811101000000123456';
    data.ibanHolder = ev === 'matrimonio' ? `${data.name1} Rossi e ${data.name2} Bianchi` : `${data.name1} e ${data.name2} Verdi`;
    data.contactName = data.name1;
    data.contactPhone = '+39 333 123 4567';
  }
  if (ev === 'matrimonio') {
    data.customQuestion = 'Ti servirà il bus navetta dalla chiesa?';
    data.story = [
      { when: '2016', title: 'Il primo incontro', text: 'Una cena tra amici a Napoli: lei arrivò in ritardo, lui le aveva tenuto il posto.' },
      { when: '2019', title: 'La prima casa', text: 'Quaranta metri quadri, una pianta di basilico e tanti sogni.' },
      { when: '2025', title: 'La proposta', text: 'Al tramonto, sulla terrazza dove tutto era cominciato.' },
    ];
    data.stays = [{ name: 'Hotel Villa Rosa', address: 'Via Roma 12, Ravello', link: '', note: 'Camere riservate per gli invitati fino al 30 maggio' }];
    data.ridesBoard = true;
    data.askSong = true;
  }
  if (ev === 'anniversario')
    data.story = [
      { when: '1986', title: 'Il ballo', text: 'Una festa di paese, un valzer e un sì sussurrato.' },
      { when: '1988', title: 'Il matrimonio', text: 'Nella stessa chiesa dove festeggiamo oggi.' },
    ];
  if (ev === 'diciottesimo' || ev === 'compleanno' || ev === 'festa' || ev === 'laurea') data.askSong = true;
  if (ev === 'compleanno') data.contactName = 'mamma Elena';
  if (ev === 'compleanno') data.contactPhone = '+39 333 765 4321';
  data.gifts = SAMPLE_GIFTS[ev] ?? [];
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
    gallery: null,
    og_key: null,
    viewer_token: null,
    tg_chat_id: null,
    tg_code: null,
  };
}

/** Sample reservations and rides so the demo shows the registry and the board in use. */
export function demoExtras(inv: Invitation): { claims: GiftClaimRow[]; rides: RideRow[] } {
  const now = nowIso();
  const claim = (id: string, giftId: string, name: string, euros: number): GiftClaimRow => ({
    id,
    invitation_id: inv.id,
    gift_id: giftId,
    name,
    amount_cents: euros * 100,
    guest_id: null,
    token: '',
    created_at: now,
  });
  const ids = new Set(inv.data.gifts.map((g) => g.id));
  const claims = [claim('democ1', 'demogift2', 'Zia Carla', 0), claim('democ2', 'demofund1', 'Giulia', 100), claim('democ3', 'demofund1', 'I colleghi', 250)].filter((c) =>
    ids.has(c.gift_id),
  );
  const rides: RideRow[] = inv.data.ridesBoard
    ? [
        { id: 'demor1', invitation_id: inv.id, kind: 'offer', place: 'Napoli Centrale', seats: 3, name: 'Luca', phone: '+39 333 000 0001', note: 'parto alle 9:30', token: '', created_at: now },
        { id: 'demor2', invitation_id: inv.id, kind: 'need', place: 'Salerno', seats: 2, name: 'Marta', phone: '+39 333 000 0002', note: null, token: '', created_at: now },
      ]
    : [];
  return { claims, rides };
}
