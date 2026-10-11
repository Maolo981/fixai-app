import { DRAFT_RETENTION_DAYS, EVENT_BY_ID, RETENTION_DAYS_AFTER_EVENT } from './config';
import { parseInvitation } from './model';
import type { EventType, GuestRow, Invitation, InvitationRow, InviteData, RsvpRow, ThemeId } from './types';
import { addDays, newId, newToken, nowIso, randomString, slugify, todayRome } from './util';

export const MAX_RSVPS_PER_INVITATION = 2000;
export const MAX_GUESTS_PER_INVITATION = 800;

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export async function createInvitation(db: D1Database, eventType: EventType, theme: ThemeId, data: InviteData): Promise<InvitationRow> {
  const now = nowIso();
  const row: InvitationRow = {
    id: newId(),
    slug: randomString(8),
    vanity: null,
    admin_token: newToken(),
    event_type: eventType,
    theme,
    status: 'draft',
    data: JSON.stringify(data),
    cover_key: null,
    email: null,
    notify_rsvp: 1,
    event_date: data.date,
    views: 0,
    created_at: now,
    updated_at: now,
    activated_at: null,
    amount_cents: null,
    stripe_session_id: null,
  };
  await db
    .prepare(
      `INSERT INTO invitations (id, slug, admin_token, event_type, theme, status, data, notify_rsvp, event_date, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 'draft', ?6, 1, ?7, ?8, ?8)`,
    )
    .bind(row.id, row.slug, row.admin_token, eventType, theme, row.data, data.date, now)
    .run();
  return row;
}

export async function getByToken(db: D1Database, token: string): Promise<Invitation | null> {
  if (!/^[A-Za-z0-9]{20,64}$/.test(token)) return null;
  const row = await db.prepare('SELECT * FROM invitations WHERE admin_token = ?1').bind(token).first<InvitationRow>();
  return row ? parseInvitation(row) : null;
}

export async function getByPublicId(db: D1Database, publicId: string): Promise<Invitation | null> {
  if (!/^[a-z0-9-]{4,80}$/.test(publicId)) return null;
  const row = await db
    .prepare('SELECT * FROM invitations WHERE slug = ?1 OR vanity = ?1 LIMIT 1')
    .bind(publicId)
    .first<InvitationRow>();
  return row ? parseInvitation(row) : null;
}

export async function getById(db: D1Database, id: string): Promise<Invitation | null> {
  const row = await db.prepare('SELECT * FROM invitations WHERE id = ?1').bind(id).first<InvitationRow>();
  return row ? parseInvitation(row) : null;
}

export async function saveContent(db: D1Database, id: string, theme: ThemeId, data: InviteData): Promise<string> {
  const now = nowIso();
  await db
    .prepare('UPDATE invitations SET theme = ?2, data = ?3, event_date = ?4, updated_at = ?5 WHERE id = ?1')
    .bind(id, theme, JSON.stringify(data), data.date, now)
    .run();
  return now;
}

export async function setEmail(db: D1Database, id: string, email: string | null, notify: boolean): Promise<void> {
  await db
    .prepare('UPDATE invitations SET email = ?2, notify_rsvp = ?3, updated_at = ?4 WHERE id = ?1')
    .bind(id, email, notify ? 1 : 0, nowIso())
    .run();
}

export async function setCover(db: D1Database, id: string, key: string | null): Promise<void> {
  await db.prepare('UPDATE invitations SET cover_key = ?2, updated_at = ?3 WHERE id = ?1').bind(id, key, nowIso()).run();
}

export async function incrementViews(db: D1Database, id: string): Promise<void> {
  await db.prepare('UPDATE invitations SET views = views + 1 WHERE id = ?1').bind(id).run();
}

/**
 * Marks the invitation as paid/active. Idempotent: the webhook and the success redirect can
 * both call it; only the first call flips the status (returns true).
 */
export async function activate(
  db: D1Database,
  inv: Invitation,
  payment: { amountCents: number; sessionId: string | null; email?: string | null },
): Promise<boolean> {
  let vanity = inv.vanity;
  if (!vanity) {
    const base = slugify([inv.data.name1, inv.data.name2].filter(Boolean).join(' e '), 32) || EVENT_BY_ID[inv.event_type].slug;
    for (let attempt = 0; attempt < 5 && !vanity; attempt++) {
      const candidate = `${base}-${randomString(4)}`;
      const clash = await db.prepare('SELECT 1 FROM invitations WHERE slug = ?1 OR vanity = ?1').bind(candidate).first();
      if (!clash) vanity = candidate;
    }
  }
  const now = nowIso();
  const res = await db
    .prepare(
      `UPDATE invitations SET status = 'active', activated_at = ?2, vanity = COALESCE(vanity, ?3), amount_cents = ?4,
         stripe_session_id = ?5, email = COALESCE(email, ?6), updated_at = ?2
       WHERE id = ?1 AND status = 'draft'`,
    )
    .bind(inv.id, now, vanity, payment.amountCents, payment.sessionId, payment.email ?? null)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function deleteInvitation(db: D1Database, media: R2Bucket, inv: Pick<InvitationRow, 'id' | 'cover_key'>): Promise<void> {
  if (inv.cover_key) await media.delete(inv.cover_key).catch(() => undefined);
  await db.batch([
    db.prepare('DELETE FROM rsvps WHERE invitation_id = ?1').bind(inv.id),
    db.prepare('DELETE FROM guests WHERE invitation_id = ?1').bind(inv.id),
    db.prepare('DELETE FROM invitations WHERE id = ?1').bind(inv.id),
  ]);
}

export async function invitationsByEmail(db: D1Database, email: string): Promise<InvitationRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM invitations WHERE email = ?1 ORDER BY created_at DESC LIMIT 20')
    .bind(email.toLowerCase())
    .all<InvitationRow>();
  return results;
}

// ---------------------------------------------------------------------------
// Guests (personalised links)
// ---------------------------------------------------------------------------

export async function listGuests(db: D1Database, invitationId: string): Promise<GuestRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM guests WHERE invitation_id = ?1 ORDER BY created_at, name')
    .bind(invitationId)
    .all<GuestRow>();
  return results;
}

export async function countGuests(db: D1Database, invitationId: string): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM guests WHERE invitation_id = ?1').bind(invitationId).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function addGuests(
  db: D1Database,
  invitationId: string,
  guests: { name: string; seats: number; phone: string | null }[],
): Promise<number> {
  if (!guests.length) return 0;
  const now = nowIso();
  const stmts = guests.map((g, i) =>
    db
      .prepare(
        `INSERT INTO guests (id, invitation_id, code, name, seats, phone, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      )
      // created_at gets a per-row offset so the list keeps the typed order
      .bind(newId(), invitationId, randomString(6), g.name, g.seats, g.phone, new Date(Date.parse(now) + i).toISOString()),
  );
  await db.batch(stmts);
  return guests.length;
}

export async function getGuestByCode(db: D1Database, invitationId: string, code: string): Promise<GuestRow | null> {
  if (!/^[a-z0-9]{4,12}$/.test(code)) return null;
  return db.prepare('SELECT * FROM guests WHERE invitation_id = ?1 AND code = ?2').bind(invitationId, code).first<GuestRow>();
}

export async function deleteGuest(db: D1Database, invitationId: string, guestId: string): Promise<void> {
  await db.batch([
    db.prepare('UPDATE rsvps SET guest_id = NULL WHERE guest_id = ?1 AND invitation_id = ?2').bind(guestId, invitationId),
    db.prepare('DELETE FROM guests WHERE id = ?1 AND invitation_id = ?2').bind(guestId, invitationId),
  ]);
}

export async function markGuestOpened(db: D1Database, invitationId: string, code: string): Promise<void> {
  const now = nowIso();
  await db
    .prepare(
      `UPDATE guests SET opened_count = opened_count + 1, first_opened_at = COALESCE(first_opened_at, ?3), last_opened_at = ?3
       WHERE invitation_id = ?1 AND code = ?2`,
    )
    .bind(invitationId, code, now)
    .run();
}

export async function markGuestSent(db: D1Database, invitationId: string, guestId: string): Promise<void> {
  await db.prepare('UPDATE guests SET sent_at = ?3 WHERE id = ?1 AND invitation_id = ?2').bind(guestId, invitationId, nowIso()).run();
}

// ---------------------------------------------------------------------------
// RSVPs
// ---------------------------------------------------------------------------

export async function listRsvps(db: D1Database, invitationId: string): Promise<RsvpRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM rsvps WHERE invitation_id = ?1 ORDER BY updated_at DESC')
    .bind(invitationId)
    .all<RsvpRow>();
  return results;
}

export async function getRsvpByGuest(db: D1Database, guestId: string): Promise<RsvpRow | null> {
  return db.prepare('SELECT * FROM rsvps WHERE guest_id = ?1').bind(guestId).first<RsvpRow>();
}

export interface RsvpInput {
  name: string;
  attending: boolean;
  adults: number;
  children: number;
  diet: string;
  answer: string;
  message: string;
}

export type UpsertResult = { ok: true; row: RsvpRow; created: boolean } | { ok: false; error: string };

export async function upsertRsvp(
  db: D1Database,
  invitationId: string,
  input: RsvpInput,
  who: { guest?: GuestRow | null; id?: string; editToken?: string },
): Promise<UpsertResult> {
  const now = nowIso();
  let existing: RsvpRow | null = null;
  if (who.guest) existing = await getRsvpByGuest(db, who.guest.id);
  else if (who.id && who.editToken) {
    const row = await db.prepare('SELECT * FROM rsvps WHERE id = ?1 AND invitation_id = ?2').bind(who.id, invitationId).first<RsvpRow>();
    if (row && row.edit_token === who.editToken) existing = row;
  }

  const values = [input.name, input.attending ? 1 : 0, input.adults, input.children, input.diet || null, input.answer || null, input.message || null];
  if (existing) {
    await db
      .prepare(
        `UPDATE rsvps SET name = ?2, attending = ?3, adults = ?4, children = ?5, diet = ?6, answer = ?7, message = ?8, updated_at = ?9 WHERE id = ?1`,
      )
      .bind(existing.id, ...values, now)
      .run();
    return { ok: true, created: false, row: { ...existing, name: input.name, attending: input.attending ? 1 : 0, adults: input.adults, children: input.children, diet: input.diet || null, answer: input.answer || null, message: input.message || null, updated_at: now } };
  }

  const count = await db.prepare('SELECT COUNT(*) AS n FROM rsvps WHERE invitation_id = ?1').bind(invitationId).first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_RSVPS_PER_INVITATION) return { ok: false, error: 'Questo invito ha raggiunto il numero massimo di risposte.' };

  const row: RsvpRow = {
    id: newId(),
    invitation_id: invitationId,
    guest_id: who.guest?.id ?? null,
    edit_token: newToken(),
    name: input.name,
    attending: input.attending ? 1 : 0,
    adults: input.adults,
    children: input.children,
    diet: input.diet || null,
    answer: input.answer || null,
    message: input.message || null,
    created_at: now,
    updated_at: now,
  };
  await db
    .prepare(
      `INSERT INTO rsvps (id, invitation_id, guest_id, edit_token, name, attending, adults, children, diet, answer, message, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)`,
    )
    .bind(row.id, invitationId, row.guest_id, row.edit_token, ...values, now)
    .run();
  return { ok: true, created: true, row };
}

export async function deleteRsvp(db: D1Database, invitationId: string, rsvpId: string): Promise<void> {
  await db.prepare('DELETE FROM rsvps WHERE id = ?1 AND invitation_id = ?2').bind(rsvpId, invitationId).run();
}

export interface Stats {
  yes: number;
  no: number;
  adults: number;
  children: number;
  people: number;
  withDiet: number;
  invitedGroups: number;
  invitedSeats: number;
  pendingGroups: number;
  openedGroups: number;
}

export function computeStats(rsvps: RsvpRow[], guests: GuestRow[]): Stats {
  const yes = rsvps.filter((r) => r.attending);
  const answered = new Set(rsvps.map((r) => r.guest_id).filter(Boolean));
  const adults = yes.reduce((s, r) => s + r.adults, 0);
  const children = yes.reduce((s, r) => s + r.children, 0);
  return {
    yes: yes.length,
    no: rsvps.length - yes.length,
    adults,
    children,
    people: adults + children,
    withDiet: yes.filter((r) => r.diet).length,
    invitedGroups: guests.length,
    invitedSeats: guests.reduce((s, g) => s + g.seats, 0),
    pendingGroups: guests.filter((g) => !answered.has(g.id)).length,
    openedGroups: guests.filter((g) => g.opened_count > 0).length,
  };
}

// ---------------------------------------------------------------------------
// Orders (Stripe)
// ---------------------------------------------------------------------------

export async function createOrder(db: D1Database, invitationId: string, sessionId: string, amountCents: number, email: string | null) {
  await db
    .prepare(
      `INSERT INTO orders (id, invitation_id, stripe_session_id, amount_cents, currency, status, email, created_at)
       VALUES (?1, ?2, ?3, ?4, 'eur', 'created', ?5, ?6)
       ON CONFLICT(stripe_session_id) DO NOTHING`,
    )
    .bind(newId(), invitationId, sessionId, amountCents, email, nowIso())
    .run();
}

export async function markOrderPaid(db: D1Database, sessionId: string, amountCents: number, email: string | null, invitationId: string) {
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO orders (id, invitation_id, stripe_session_id, amount_cents, currency, status, email, created_at, paid_at)
       VALUES (?1, ?2, ?3, ?4, 'eur', 'paid', ?5, ?6, ?6)
       ON CONFLICT(stripe_session_id) DO UPDATE SET status = 'paid', amount_cents = ?4,
         email = COALESCE(?5, orders.email), paid_at = COALESCE(orders.paid_at, ?6)`,
    )
    .bind(newId(), invitationId, sessionId, amountCents, email, now)
    .run();
}

// ---------------------------------------------------------------------------
// Owner dashboard
// ---------------------------------------------------------------------------

export interface AdminRow extends InvitationRow {
  rsvp_count: number;
  guest_count: number;
}

export async function adminOverview(db: D1Database) {
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const since14 = new Date(Date.now() - 13 * 864e5).toISOString().slice(0, 10);
  const [totals, revenue, revenue30, rsvps, recent, createdByDay, paidByDay, byType] = await db.batch([
    db
      .prepare(
        `SELECT COUNT(*) AS total, COALESCE(SUM(status = 'active'), 0) AS active,
           COALESCE(SUM(created_at >= ?1), 0) AS created30, COALESCE(SUM(status = 'active' AND activated_at >= ?1), 0) AS active30
         FROM invitations`,
      )
      .bind(since30),
    db.prepare(`SELECT COALESCE(SUM(amount_cents), 0) AS cents, COUNT(*) AS n FROM orders WHERE status = 'paid'`),
    db.prepare(`SELECT COALESCE(SUM(amount_cents), 0) AS cents, COUNT(*) AS n FROM orders WHERE status = 'paid' AND paid_at >= ?1`).bind(since30),
    db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(adults + children), 0) AS people FROM rsvps WHERE attending = 1'),
    db.prepare(
      `SELECT i.*, (SELECT COUNT(*) FROM rsvps r WHERE r.invitation_id = i.id) AS rsvp_count,
              (SELECT COUNT(*) FROM guests g WHERE g.invitation_id = i.id) AS guest_count
       FROM invitations i ORDER BY i.created_at DESC LIMIT 100`,
    ),
    db.prepare(`SELECT substr(created_at, 1, 10) AS d, COUNT(*) AS n FROM invitations WHERE created_at >= ?1 GROUP BY d`).bind(since14),
    db
      .prepare(`SELECT substr(paid_at, 1, 10) AS d, COUNT(*) AS n, SUM(amount_cents) AS cents FROM orders WHERE status = 'paid' AND paid_at >= ?1 GROUP BY d`)
      .bind(since14),
    db.prepare(`SELECT event_type, COUNT(*) AS n, COALESCE(SUM(status = 'active'), 0) AS active FROM invitations GROUP BY event_type ORDER BY n DESC`),
  ]);
  type T = { total: number; active: number; created30: number; active30: number };
  return {
    totals: (totals.results[0] as T) ?? { total: 0, active: 0, created30: 0, active30: 0 },
    revenue: revenue.results[0] as { cents: number; n: number },
    revenue30: revenue30.results[0] as { cents: number; n: number },
    rsvps: rsvps.results[0] as { n: number; people: number },
    recent: recent.results as unknown as AdminRow[],
    createdByDay: createdByDay.results as { d: string; n: number }[],
    paidByDay: paidByDay.results as { d: string; n: number; cents: number }[],
    byType: byType.results as { event_type: EventType; n: number; active: number }[],
  };
}

// ---------------------------------------------------------------------------
// Retention (cron)
// ---------------------------------------------------------------------------

export async function runCleanup(db: D1Database, media: R2Bucket): Promise<{ deleted: number }> {
  const draftCutoff = new Date(Date.now() - DRAFT_RETENTION_DAYS * 864e5).toISOString();
  const eventCutoff = addDays(todayRome(), -RETENTION_DAYS_AFTER_EVENT);
  const { results } = await db
    .prepare(
      `SELECT id, cover_key FROM invitations
       WHERE (status = 'draft' AND updated_at < ?1) OR (event_date IS NOT NULL AND event_date < ?2)
       LIMIT 300`,
    )
    .bind(draftCutoff, eventCutoff)
    .all<{ id: string; cover_key: string | null }>();
  for (const inv of results) await deleteInvitation(db, media, inv);
  await db.prepare('DELETE FROM rate_limits WHERE reset_at < ?1').bind(Math.floor(Date.now() / 1000)).run();
  return { deleted: results.length };
}

// ---------------------------------------------------------------------------
// Rate limiting (fixed window, stored in D1)
// ---------------------------------------------------------------------------

export async function rateLimit(db: D1Database, key: string, limit: number, windowSec: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (k, count, reset_at) VALUES (?1, 1, ?2)
       ON CONFLICT(k) DO UPDATE SET
         count = CASE WHEN rate_limits.reset_at <= ?3 THEN 1 ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at <= ?3 THEN ?2 ELSE rate_limits.reset_at END
       RETURNING count`,
    )
    .bind(key, now + windowSec, now)
    .first<{ count: number }>();
  return (row?.count ?? 1) <= limit;
}
