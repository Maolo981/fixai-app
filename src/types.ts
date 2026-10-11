export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  PUBLIC_URL?: string;
  EMAIL_FROM?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  /** Override for tests (mock server). Defaults to https://api.stripe.com */
  STRIPE_API_BASE?: string;
  RESEND_API_KEY?: string;
  ADMIN_PASSWORD?: string;
  /** "true" only in local development: lets you activate invitations without paying. */
  ALLOW_FREE_ACTIVATION?: string;
  /** Optional Cloudflare Web Analytics token (cookieless): enables visit stats on marketing pages. */
  CF_ANALYTICS_TOKEN?: string;
}

export type EventType =
  | 'matrimonio'
  | 'battesimo'
  | 'comunione'
  | 'cresima'
  | 'compleanno'
  | 'diciottesimo'
  | 'laurea'
  | 'babyshower'
  | 'anniversario'
  | 'festa'
  | 'cena'
  | 'addio'
  | 'genderreveal'
  | 'pensione'
  | 'natale'
  | 'inaugurazione'
  | 'aziendale'
  | 'altro';

export type ThemeId =
  | 'avorio'
  | 'ulivo'
  | 'limoni'
  | 'notte'
  | 'alloro'
  | 'cielo'
  | 'cipria'
  | 'spiga'
  | 'coriandoli';

export interface ProgramItem {
  time: string;
  title: string;
  place: string;
  address: string;
}

/** Everything the host can edit, stored as JSON in invitations.data */
export interface InviteData {
  eyebrow: string;
  name1: string;
  name2: string;
  subtitle: string;
  date: string; // YYYY-MM-DD (Europe/Rome)
  time: string; // HH:MM
  message: string;
  program: ProgramItem[];
  dressCode: string;
  giftText: string;
  iban: string;
  ibanHolder: string;
  giftLink: string;
  rsvpDeadline: string; // YYYY-MM-DD or ''
  askChildren: boolean;
  askDiet: boolean;
  customQuestion: string;
  contactName: string;
  contactPhone: string;
  signature: string;
  showCountdown: boolean;
}

export interface InvitationRow {
  id: string;
  slug: string;
  vanity: string | null;
  admin_token: string;
  event_type: EventType;
  theme: ThemeId;
  status: 'draft' | 'active';
  data: string;
  cover_key: string | null;
  email: string | null;
  notify_rsvp: number;
  event_date: string | null;
  views: number;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  amount_cents: number | null;
  stripe_session_id: string | null;
}

export interface GuestRow {
  id: string;
  invitation_id: string;
  code: string;
  name: string;
  seats: number;
  phone: string | null;
  opened_count: number;
  first_opened_at: string | null;
  last_opened_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface RsvpRow {
  id: string;
  invitation_id: string;
  guest_id: string | null;
  edit_token: string;
  name: string;
  attending: number;
  adults: number;
  children: number;
  diet: string | null;
  answer: string | null;
  message: string | null;
  created_at: string;
  updated_at: string;
}

/** An invitation with its JSON data parsed. */
export interface Invitation extends Omit<InvitationRow, 'data'> {
  data: InviteData;
}
