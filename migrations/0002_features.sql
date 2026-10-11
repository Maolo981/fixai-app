-- Confetto: per-person menus and names, songs, guest groups and tables, gift registry, rides board,
-- photo gallery, WhatsApp preview image, read-only link for co-organisers, Telegram notifications.

ALTER TABLE invitations ADD COLUMN gallery TEXT;          -- JSON array of R2 keys
ALTER TABLE invitations ADD COLUMN og_key TEXT;           -- R2 key of the preview image with the names
ALTER TABLE invitations ADD COLUMN viewer_token TEXT;     -- read-only link for co-organisers
ALTER TABLE invitations ADD COLUMN tg_chat_id TEXT;       -- Telegram chat receiving new answers
ALTER TABLE invitations ADD COLUMN tg_code TEXT;          -- one-time code to link the chat
CREATE UNIQUE INDEX idx_invitations_viewer ON invitations(viewer_token) WHERE viewer_token IS NOT NULL;
CREATE UNIQUE INDEX idx_invitations_tg_code ON invitations(tg_code) WHERE tg_code IS NOT NULL;

ALTER TABLE guests ADD COLUMN full_access INTEGER NOT NULL DEFAULT 1;  -- sees the steps reserved to some guests
ALTER TABLE guests ADD COLUMN table_name TEXT;
ALTER TABLE guests ADD COLUMN grp TEXT;

ALTER TABLE rsvps ADD COLUMN people TEXT;                 -- JSON [{name, menu, child}]
ALTER TABLE rsvps ADD COLUMN song TEXT;

CREATE TABLE gift_claims (
  id TEXT PRIMARY KEY,
  invitation_id TEXT NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  gift_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,                -- contributions to a group fund
  guest_id TEXT,
  token TEXT NOT NULL,                                    -- lets the giver cancel from the same phone
  created_at TEXT NOT NULL
);
CREATE INDEX idx_gift_claims_invitation ON gift_claims(invitation_id, gift_id);

CREATE TABLE rides (
  id TEXT PRIMARY KEY,
  invitation_id TEXT NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                                     -- offer | need
  place TEXT NOT NULL,                                    -- leaving from
  seats INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  note TEXT,
  token TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_rides_invitation ON rides(invitation_id, created_at);
