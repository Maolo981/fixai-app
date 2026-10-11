-- Confetto: initial schema (Cloudflare D1 / SQLite)

CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,            -- random public id, never changes
  vanity TEXT UNIQUE,                   -- pretty public id set on activation (e.g. anna-e-marco-k7p2)
  admin_token TEXT NOT NULL UNIQUE,     -- secret key of the management link
  event_type TEXT NOT NULL,
  theme TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | active
  data TEXT NOT NULL,                   -- JSON with the invitation content
  cover_key TEXT,                       -- R2 object key of the cover photo
  email TEXT,
  notify_rsvp INTEGER NOT NULL DEFAULT 1,
  event_date TEXT,                      -- YYYY-MM-DD, copied from data for cleanup queries
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  activated_at TEXT,
  amount_cents INTEGER,
  stripe_session_id TEXT
);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status_created ON invitations(status, created_at);
CREATE INDEX idx_invitations_event_date ON invitations(event_date);

CREATE TABLE guests (
  id TEXT PRIMARY KEY,
  invitation_id TEXT NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 1,
  phone TEXT,
  opened_count INTEGER NOT NULL DEFAULT 0,
  first_opened_at TEXT,
  last_opened_at TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (invitation_id, code)
);
CREATE INDEX idx_guests_invitation ON guests(invitation_id, created_at);

CREATE TABLE rsvps (
  id TEXT PRIMARY KEY,
  invitation_id TEXT NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  guest_id TEXT REFERENCES guests(id) ON DELETE SET NULL,
  edit_token TEXT NOT NULL,
  name TEXT NOT NULL,
  attending INTEGER NOT NULL,           -- 1 = yes, 0 = no
  adults INTEGER NOT NULL DEFAULT 0,
  children INTEGER NOT NULL DEFAULT 0,
  diet TEXT,
  answer TEXT,
  message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_rsvps_invitation ON rsvps(invitation_id, created_at);
CREATE UNIQUE INDEX idx_rsvps_guest ON rsvps(guest_id) WHERE guest_id IS NOT NULL;

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  invitation_id TEXT NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL,                 -- created | paid
  email TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT
);
CREATE INDEX idx_orders_invitation ON orders(invitation_id);
CREATE INDEX idx_orders_status_paid ON orders(status, paid_at);

CREATE TABLE rate_limits (
  k TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL             -- unix seconds
);
