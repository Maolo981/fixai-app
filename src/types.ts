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
  /** Optional Telegram bot that sends each new answer to the host (see README). */
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_NAME?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  /** Override for tests (mock server). Defaults to https://api.telegram.org */
  TELEGRAM_API_BASE?: string;
  /** Optional Claude API key: enables "rewrite the message" in the editor. */
  ANTHROPIC_API_KEY?: string;
  /** Override for tests (mock server). Defaults to https://api.anthropic.com */
  ANTHROPIC_API_BASE?: string;
  /** "false" disables the weather forecast lookups (they call Open-Meteo, a free public service). */
  WEATHER?: string;
  /** Override for tests (mock server). Defaults to the Open-Meteo hosts. */
  WEATHER_API_BASE?: string;
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
  | 'coriandoli'
  | 'smeraldo'
  | 'bordeaux'
  | 'marmo'
  | 'essenziale'
  | 'pizzo'
  | 'peonie'
  | 'lavanda'
  | 'girasoli'
  | 'prato'
  | 'ortensie'
  | 'glicine'
  | 'ciliegio'
  | 'rustico'
  | 'sicilia'
  | 'vigneto'
  | 'eucalipto'
  | 'riviera'
  | 'tropicale'
  | 'montagna'
  | 'autunno'
  | 'inverno'
  | 'arcobaleno'
  | 'palloncini'
  | 'farfalle'
  | 'bollicine'
  | 'fuochi'
  | 'natale';

export interface ProgramItem {
  time: string;
  title: string;
  place: string;
  address: string;
  /** Only guests invited to "everything" see this step (e.g. the reception). */
  restricted?: boolean;
}

/** A present guests can reserve ("item"), or a group fund guests contribute to ("fund"). */
export interface GiftItem {
  id: string;
  kind: 'item' | 'fund';
  title: string;
  note: string;
  link: string;
  /** euro; for a fund it is the target (0 = no target) */
  price: number;
}

export interface StayItem {
  name: string;
  address: string;
  link: string;
  note: string;
}

export interface StoryItem {
  when: string;
  title: string;
  text: string;
}

export type TableReveal = 'never' | 'day' | 'always';

/** How the main photo is shown: arch, round, framed, polaroid, or big across the top of the card. */
export type PhotoStyle = 'arco' | 'cerchio' | 'cornice' | 'polaroid' | 'grande';

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
  /** Menu choices asked for each person (empty: no menu question). */
  menuOptions: string[];
  /** Ask the name of each person coming. */
  askNames: boolean;
  /** Ask for a song for the party playlist. */
  askSong: boolean;
  gifts: GiftItem[];
  stays: StayItem[];
  /** Guests can offer or ask for a lift to the event. */
  ridesBoard: boolean;
  story: StoryItem[];
  /** When guests see their table on their personal link. */
  tableReveal: TableReveal;
  /** Only a "save the date" for now: no programme, no RSVP. */
  saveTheDate: boolean;
  /** Update shown on top of the invitation ('' = none) and when it was last changed. */
  notice: string;
  noticeAt: string;
  showWeather: boolean;
  photoStyle: PhotoStyle;
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
  /** JSON array of R2 keys (photo gallery) */
  gallery: string | null;
  /** R2 key of the generated WhatsApp preview image */
  og_key: string | null;
  /** secret of the read-only link for co-organisers */
  viewer_token: string | null;
  /** Telegram chat that receives new answers, and the one-time code used to link it */
  tg_chat_id: string | null;
  tg_code: string | null;
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
  /** 1 = invited to the whole programme, 0 = only to the steps open to everyone */
  full_access: number;
  table_name: string | null;
  grp: string | null;
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
  /** JSON array of Person */
  people: string | null;
  song: string | null;
}

/** One person in an answer (when names or menus are asked). */
export interface Person {
  name: string;
  menu: string;
  child: boolean;
}

export interface GiftClaimRow {
  id: string;
  invitation_id: string;
  gift_id: string;
  name: string;
  amount_cents: number;
  guest_id: string | null;
  token: string;
  created_at: string;
}

export interface RideRow {
  id: string;
  invitation_id: string;
  kind: 'offer' | 'need';
  place: string;
  seats: number;
  name: string;
  phone: string;
  note: string | null;
  token: string;
  created_at: string;
}

/** An invitation with its JSON data parsed. */
export interface Invitation extends Omit<InvitationRow, 'data'> {
  data: InviteData;
}
