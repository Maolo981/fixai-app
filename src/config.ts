import type { EventType, InviteData, ThemeId } from './types';
import { addDays, sampleSaturday } from './util';

/** Change these before launch (they appear in emails, privacy policy and terms). */
export const BRAND = {
  name: 'Confetto',
  tagline: 'Inviti digitali che fanno festa',
  legalName: '[Nome e cognome / ragione sociale]',
  vatNumber: '[Partita IVA]',
  address: '[Indirizzo della sede]',
  supportEmail: 'ciao@example.com',
};

/** Personal data is deleted this many days after the event (GDPR: storage limitation). */
export const RETENTION_DAYS_AFTER_EVENT = 180;
/** Unpaid drafts are deleted after this many days without edits. */
export const DRAFT_RETENTION_DAYS = 60;

export type PriceTier = 'festa' | 'cerimonia' | 'matrimonio';

/** One-off price per invitation, in euro cents. */
export const PRICES: Record<PriceTier, { cents: number; label: string; examples: string }> = {
  festa: { cents: 1200, label: 'Festa', examples: 'Compleanni, baby shower, feste' },
  cerimonia: { cents: 1900, label: 'Cerimonia', examples: 'Battesimo, Comunione, Cresima, Laurea, 18 anni, anniversari' },
  matrimonio: { cents: 3900, label: 'Matrimonio', examples: 'Partecipazioni di nozze con conferme e lista invitati' },
};

export interface EventDef {
  id: EventType;
  slug: string;
  label: string;
  emoji: string;
  tier: PriceTier;
  couple: boolean;
  theme: ThemeId;
  name1Label: string;
  name2Label: string;
  /** "un pensiero per gli sposi" — used as RSVP message label */
  messageFor: string;
  /** Used in WhatsApp texts: "al matrimonio", "al battesimo di Leonardo"... */
  eventPhrase: (d: Pick<InviteData, 'name1' | 'name2'>) => string;
  seoTitle: string;
  seoIntro: string;
  phrases: string[];
  defaults: () => Partial<InviteData>;
}

const both = (d: Pick<InviteData, 'name1' | 'name2'>) => [d.name1, d.name2].filter(Boolean).join(' e ');

export const EVENTS: EventDef[] = [
  {
    id: 'matrimonio',
    slug: 'matrimonio',
    label: 'Matrimonio',
    emoji: '💍',
    tier: 'matrimonio',
    couple: true,
    theme: 'ulivo',
    name1Label: 'Nome sposa/o',
    name2Label: 'Nome sposa/o',
    messageFor: 'Un pensiero per gli sposi',
    eventPhrase: (d) => `al matrimonio di ${both(d)}`,
    seoTitle: 'Partecipazioni di matrimonio digitali con conferma presenza',
    seoIntro:
      'Le partecipazioni digitali che i tuoi invitati apriranno davvero: busta animata, programma della giornata, mappa, IBAN per il regalo e conferme che arrivano da sole. Mandale su WhatsApp e tieni tutto sotto controllo in una lista sempre aggiornata.',
    phrases: [
      'Con immensa gioia vi annunciamo il nostro matrimonio. La vostra presenza sarà il regalo più bello.',
      'Abbiamo deciso di dirci sì per sempre. Saremmo felici di avervi accanto nel giorno più bello della nostra vita.',
      'Due cuori, una promessa e tutte le persone che amiamo: festeggiate con noi il nostro matrimonio!',
      'Dopo tanti anni insieme abbiamo deciso di fare il grande passo. Non sarebbe la stessa cosa senza di voi.',
      '«Amare non è guardarsi l’un l’altro, ma guardare insieme nella stessa direzione.» Con questa promessa vi aspettiamo al nostro matrimonio.',
      'Ci sposiamo! E vogliamo festeggiarlo con chi ha reso speciale ogni passo della nostra storia.',
      'Il nostro «per sempre» comincia qui. Vi aspettiamo per brindare, ballare e festeggiare insieme.',
      'Tra un sì e un brindisi c’è posto anche per voi. Vi aspettiamo per festeggiare il nostro matrimonio.',
    ],
    defaults: () => ({
      eyebrow: 'Il matrimonio di',
      name1: 'Anna',
      name2: 'Marco',
      time: '11:00',
      program: [
        { time: '11:00', title: 'Cerimonia', place: 'Chiesa di Santa Maria Assunta', address: 'Piazza della Chiesa 1, Ravello (SA)' },
        { time: '13:30', title: 'Ricevimento', place: 'Villa Le Magnolie', address: 'Via delle Colline 12, Ravello (SA)' },
      ],
      giftText: 'La vostra presenza è il regalo più bello. Per chi desiderasse farci un dono, ecco i nostri riferimenti.',
      signature: 'Vi aspettiamo con gioia',
      askChildren: true,
      askDiet: true,
    }),
  },
  {
    id: 'battesimo',
    slug: 'battesimo',
    label: 'Battesimo',
    emoji: '🕊️',
    tier: 'cerimonia',
    couple: false,
    theme: 'cielo',
    name1Label: 'Nome del bambino/a',
    name2Label: '',
    messageFor: 'Un pensiero per il piccolo',
    eventPhrase: (d) => `al Battesimo di ${d.name1}`,
    seoTitle: 'Inviti per il Battesimo digitali da mandare su WhatsApp',
    seoIntro:
      'Crea in 5 minuti l’invito per il Battesimo: tenero, elegante e con le conferme dei parenti raccolte in automatico. Niente più messaggi persi nei gruppi WhatsApp di famiglia.',
    phrases: [
      'Con il cuore pieno di gioia vi invitiamo al Battesimo del nostro piccolo {nome}. Festeggiate con noi il suo primo grande giorno!',
      'Una piccola luce è entrata nella nostra famiglia. Vi aspettiamo per accoglierla insieme nel giorno del suo Battesimo.',
      '{nome} riceverà il sacramento del Battesimo: sarà una festa ancora più bella se ci sarete anche voi.',
      'Il dono più grande che abbiamo ricevuto ha un nome: {nome}. Condividete con noi la gioia del suo Battesimo.',
      'Piccoli passi, grandi emozioni: vi invitiamo al Battesimo di {nome} e al pranzo che seguirà.',
      'Siamo felici di annunciarvi il Battesimo di {nome}. Vi aspettiamo per festeggiare insieme questo giorno speciale.',
    ],
    defaults: () => ({
      eyebrow: 'Il Battesimo di',
      name1: 'Leonardo',
      time: '11:30',
      program: [
        { time: '11:30', title: 'Battesimo', place: 'Parrocchia San Giovanni Battista', address: 'Via Roma 10, Bergamo' },
        { time: '13:00', title: 'Pranzo', place: 'Ristorante Il Giardino', address: 'Via dei Tigli 4, Bergamo' },
      ],
      signature: 'Mamma Giulia e papà Andrea',
      askChildren: true,
      askDiet: true,
    }),
  },
  {
    id: 'comunione',
    slug: 'comunione',
    label: 'Prima Comunione',
    emoji: '✨',
    tier: 'cerimonia',
    couple: false,
    theme: 'spiga',
    name1Label: 'Nome del bambino/a',
    name2Label: '',
    messageFor: 'Un pensiero per il festeggiato',
    eventPhrase: (d) => `alla Prima Comunione di ${d.name1}`,
    seoTitle: 'Inviti per la Prima Comunione digitali con conferma presenza',
    seoIntro:
      'L’invito per la Prima Comunione che arriva su WhatsApp e raccoglie da solo le conferme di parenti e amici, con programma, mappa della chiesa e del ristorante.',
    phrases: [
      '{nome} riceverà per la prima volta Gesù nell’Eucaristia e sarà felice di condividere con voi la gioia della sua Prima Comunione.',
      'Un giorno speciale da vivere insieme: vi invito alla mia Prima Comunione e alla festa che seguirà!',
      '«Io sono il pane della vita» (Gv 6,35). Con gioia {nome} vi invita alla sua Prima Comunione.',
      'Il mio cuore è pronto ad accogliere Gesù: mi farebbe tanto piacere avervi accanto nel giorno della mia Prima Comunione.',
      'Festeggiate con noi la Prima Comunione di {nome}: un momento di fede, famiglia e allegria.',
    ],
    defaults: () => ({
      eyebrow: 'La Prima Comunione di',
      name1: 'Sofia',
      time: '10:30',
      program: [
        { time: '10:30', title: 'Santa Messa', place: 'Chiesa di San Francesco', address: 'Piazza San Francesco 2, Lecce' },
        { time: '13:00', title: 'Pranzo', place: 'Masseria degli Ulivi', address: 'Strada Provinciale 5, Lecce' },
      ],
      signature: 'Con affetto, Sofia',
      askChildren: true,
      askDiet: true,
    }),
  },
  {
    id: 'cresima',
    slug: 'cresima',
    label: 'Cresima',
    emoji: '🙏',
    tier: 'cerimonia',
    couple: false,
    theme: 'spiga',
    name1Label: 'Nome del cresimando/a',
    name2Label: '',
    messageFor: 'Un pensiero per il festeggiato',
    eventPhrase: (d) => `alla Cresima di ${d.name1}`,
    seoTitle: 'Inviti per la Cresima digitali con conferma presenza',
    seoIntro:
      'Crea l’invito per la Cresima in pochi minuti: elegante, con il programma della giornata e le conferme di padrino, madrina e invitati sempre sotto controllo.',
    phrases: [
      '{nome} riceverà il sacramento della Confermazione. Vi aspettiamo per vivere insieme questo momento importante.',
      '«Ricevi il sigillo dello Spirito Santo che ti è dato in dono.» Con gioia vi invito alla mia Cresima.',
      'Un passo importante nel mio cammino di fede: mi farebbe piacere festeggiarlo con voi.',
      'Vi invitiamo alla Cresima di {nome} e al pranzo insieme per festeggiare.',
    ],
    defaults: () => ({
      eyebrow: 'La Cresima di',
      name1: 'Matteo',
      time: '11:00',
      program: [
        { time: '11:00', title: 'Santa Messa', place: 'Duomo di Santa Maria', address: 'Piazza del Duomo 1, Verona' },
        { time: '13:00', title: 'Pranzo', place: 'Trattoria Al Portico', address: 'Via Mazzini 22, Verona' },
      ],
      signature: 'Vi aspetto!',
      askChildren: true,
      askDiet: true,
    }),
  },
  {
    id: 'compleanno',
    slug: 'compleanno',
    label: 'Compleanno',
    emoji: '🎂',
    tier: 'festa',
    couple: false,
    theme: 'coriandoli',
    name1Label: 'Nome del festeggiato/a',
    name2Label: '',
    messageFor: 'Un messaggio di auguri',
    eventPhrase: (d) => `alla festa di compleanno di ${d.name1}`,
    seoTitle: 'Inviti di compleanno digitali per WhatsApp con conferma presenza',
    seoIntro:
      'Inviti di compleanno per bambini e adulti da mandare su WhatsApp: colorati, con mappa e conferme automatiche. Sai subito quanti bambini e quanti adulti arrivano.',
    phrases: [
      'Vieni a festeggiare con me! Ci saranno giochi, torta e tantissimo divertimento.',
      'Una candelina in più e tanta voglia di festeggiare: ti aspetto alla mia festa!',
      'Palloncini pronti, torta in forno… manchi solo tu! Vieni alla festa di {nome}!',
      'Compio gli anni e voglio festeggiarli con le persone a cui voglio bene. Ci sarai?',
      'Musica, amici e una torta gigante: segna la data, non puoi mancare!',
      'Gli anni passano, la voglia di far festa no. Ti aspetto per brindare insieme!',
    ],
    defaults: () => ({
      eyebrow: 'Festa di compleanno',
      name1: 'Martina',
      subtitle: 'compie 7 anni!',
      time: '16:30',
      program: [{ time: '16:30', title: 'Festa', place: 'Ludoteca Arcobaleno', address: 'Via Garibaldi 8, Torino' }],
      signature: 'Ti aspetto!',
      askChildren: true,
      askDiet: false,
      showCountdown: true,
    }),
  },
  {
    id: 'diciottesimo',
    slug: '18-anni',
    label: '18 anni',
    emoji: '🥂',
    tier: 'cerimonia',
    couple: false,
    theme: 'notte',
    name1Label: 'Nome del festeggiato/a',
    name2Label: '',
    messageFor: 'Un messaggio di auguri',
    eventPhrase: (d) => `alla festa dei 18 anni di ${d.name1}`,
    seoTitle: 'Inviti per i 18 anni digitali: crea l’invito per il diciottesimo',
    seoIntro:
      'L’invito per il diciottesimo che fa colpo: elegante, da mandare su WhatsApp e Instagram, con dress code, mappa del locale e lista dei confermati sempre aggiornata.',
    phrases: [
      'Diciotto anni si compiono una volta sola: festeggiamoli insieme!',
      'Maggiorenne, finalmente! Ti aspetto per una notte da ricordare.',
      '18 candeline, una sola regola: divertirsi. Sei dei nostri?',
      'È arrivato il momento: divento maggiorenne e voglio festeggiarlo con te.',
      'Chiudo un capitolo e ne apro uno nuovo: vieni a brindare ai miei 18 anni!',
    ],
    defaults: () => ({
      eyebrow: 'Festa dei 18 anni',
      name1: 'Giorgia',
      subtitle: 'diventa maggiorenne',
      time: '21:00',
      program: [{ time: '21:00', title: 'Festa', place: 'Terrazza Belvedere', address: 'Via del Faro 3, Cagliari' }],
      dressCode: 'Elegante, con un tocco di brillantini',
      signature: 'Non mancare!',
      askChildren: false,
      askDiet: true,
    }),
  },
  {
    id: 'laurea',
    slug: 'laurea',
    label: 'Laurea',
    emoji: '🎓',
    tier: 'cerimonia',
    couple: false,
    theme: 'alloro',
    name1Label: 'Nome del laureato/a',
    name2Label: '',
    messageFor: 'Un messaggio di auguri',
    eventPhrase: (d) => `alla festa di laurea di ${d.name1}`,
    seoTitle: 'Inviti per la festa di laurea digitali con conferma presenza',
    seoIntro:
      'Corona d’alloro pronta? Crea l’invito per la festa di laurea, mandalo su WhatsApp e scopri subito chi viene a brindare con te.',
    phrases: [
      'Dopo tanti esami, notti insonni e caffè, è arrivato il momento di festeggiare! Ti aspetto per brindare insieme.',
      'Ce l’ho fatta! Festeggia con me la fine di questo percorso e l’inizio di una nuova avventura.',
      'Corona d’alloro pronta: vieni a festeggiare la mia laurea!',
      'Il traguardo è raggiunto e non vedo l’ora di celebrarlo con chi mi ha sostenuto in questi anni.',
      'Il titolo è arrivato, ora manca solo la festa: brindiamo insieme a questo traguardo!',
    ],
    defaults: () => ({
      eyebrow: 'Festa di laurea',
      name1: 'Giulia',
      subtitle: 'Dottoressa in Architettura',
      time: '20:30',
      program: [{ time: '20:30', title: 'Festa', place: 'Agriturismo Il Poggio', address: 'Via del Poggio 15, Bologna' }],
      signature: 'Vi aspetto!',
      askChildren: false,
      askDiet: true,
    }),
  },
  {
    id: 'babyshower',
    slug: 'baby-shower',
    label: 'Baby shower',
    emoji: '🍼',
    tier: 'festa',
    couple: false,
    theme: 'cipria',
    name1Label: 'Nome della futura mamma (o del bebè)',
    name2Label: '',
    messageFor: 'Un augurio per il bebè',
    eventPhrase: (d) => `al baby shower di ${d.name1}`,
    seoTitle: 'Inviti per baby shower digitali da mandare su WhatsApp',
    seoIntro:
      'Un invito dolcissimo per il baby shower o il gender reveal: si apre come una busta, si condivide su WhatsApp e raccoglie le conferme in automatico.',
    phrases: [
      'Un piccolo miracolo è in arrivo! Vieni a festeggiare con noi l’attesa più dolce.',
      'Pannolini, sorrisi e tanto amore: ti aspettiamo al baby shower!',
      'Tra poco saremo uno in più: festeggiamo insieme l’arrivo del nostro bebè.',
      'Coccole in arrivo! Unisciti a noi per un pomeriggio di dolcezza, giochi e auguri.',
    ],
    defaults: () => ({
      eyebrow: 'Baby shower per',
      name1: 'Chiara',
      subtitle: 'Aspettiamo un bebè!',
      time: '16:00',
      program: [{ time: '16:00', title: 'Merenda e giochi', place: 'Casa di Chiara', address: 'Via Manzoni 5, Milano' }],
      signature: 'Con tanto affetto',
      askChildren: true,
      askDiet: false,
    }),
  },
  {
    id: 'anniversario',
    slug: 'anniversario',
    label: 'Anniversario',
    emoji: '💞',
    tier: 'cerimonia',
    couple: true,
    theme: 'avorio',
    name1Label: 'Nome',
    name2Label: 'Nome',
    messageFor: 'Un augurio per la coppia',
    eventPhrase: (d) => `all'anniversario di ${both(d)}`,
    seoTitle: 'Inviti per anniversario di matrimonio (nozze d’argento e d’oro)',
    seoIntro:
      'Nozze d’argento, d’oro o un anniversario speciale: crea un invito elegante da mandare a figli, nipoti e amici, con le conferme raccolte in automatico.',
    phrases: [
      'Tanti anni insieme e la stessa voglia di festeggiare: brindate con noi al nostro anniversario!',
      'Il nostro amore compie gli anni: vi aspettiamo per rinnovare insieme la nostra promessa.',
      'Ieri come oggi, mano nella mano. Festeggiate con noi questo traguardo d’amore.',
      'Abbiamo condiviso tutto, e oggi vogliamo condividere con voi la gioia del nostro anniversario.',
    ],
    defaults: () => ({
      eyebrow: '25° anniversario di matrimonio',
      name1: 'Paola',
      name2: 'Roberto',
      subtitle: 'Nozze d’argento',
      time: '12:30',
      program: [
        { time: '11:00', title: 'Santa Messa', place: 'Chiesa di San Michele', address: 'Piazza San Michele 1, Lucca' },
        { time: '12:30', title: 'Pranzo', place: 'Villa Bottini', address: 'Via Elisa 9, Lucca' },
      ],
      signature: 'Con affetto, Paola e Roberto',
      askChildren: true,
      askDiet: true,
    }),
  },
  {
    id: 'festa',
    slug: 'festa',
    label: 'Festa',
    emoji: '🎉',
    tier: 'festa',
    couple: false,
    theme: 'limoni',
    name1Label: 'Titolo della festa',
    name2Label: '',
    messageFor: 'Un messaggio per gli organizzatori',
    eventPhrase: (d) => `a ${d.name1}`,
    seoTitle: 'Inviti digitali per feste e cene con conferma presenza',
    seoIntro:
      'Cene, feste a tema, inaugurazioni, addii al nubilato: crea un invito bellissimo, mandalo su WhatsApp e sai subito chi c’è.',
    phrases: [
      'Si fa festa! Ti aspettiamo per una serata in compagnia, buon cibo e tanta allegria.',
      'Segna la data: abbiamo qualcosa da festeggiare e vogliamo farlo con te.',
      'Musica, amici e qualcosa di buono da brindare: non mancare!',
      'Una festa senza di te non sarebbe la stessa. Ci sarai?',
    ],
    defaults: () => ({
      eyebrow: 'Sei invitato a',
      name1: 'Festa d’estate',
      time: '20:30',
      program: [{ time: '20:30', title: 'Aperitivo e cena', place: 'Bagno Aurora', address: 'Lungomare Marconi 21, Rimini' }],
      dressCode: 'Bianco e un tocco di giallo limone',
      signature: 'Vi aspettiamo!',
      askChildren: false,
      askDiet: true,
    }),
  },
];

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e])) as Record<EventType, EventDef>;
export const EVENT_BY_SLUG = Object.fromEntries(EVENTS.map((e) => [e.slug, e])) as Record<string, EventDef>;

export function isEventType(v: unknown): v is EventType {
  return typeof v === 'string' && v in EVENT_BY_ID;
}

export function priceFor(eventType: EventType) {
  const tier = EVENT_BY_ID[eventType].tier;
  return { tier, ...PRICES[tier] };
}

/** Complete, ready-to-render sample content for a new invitation of this type. */
export function defaultInviteData(eventType: EventType, from?: string): InviteData {
  const ev = EVENT_BY_ID[eventType];
  const date = sampleSaturday(eventType === 'matrimonio' ? 240 : 60, from);
  const d = ev.defaults();
  const name1 = d.name1 ?? '';
  return {
    eyebrow: '',
    name1: '',
    name2: '',
    subtitle: '',
    date,
    time: '12:00',
    message: ev.phrases[0].replaceAll('{nome}', name1),
    program: [],
    dressCode: '',
    giftText: '',
    iban: '',
    ibanHolder: '',
    giftLink: '',
    rsvpDeadline: addDays(date, eventType === 'matrimonio' ? -45 : -10),
    askChildren: true,
    askDiet: true,
    customQuestion: '',
    contactName: '',
    contactPhone: '',
    signature: '',
    showCountdown: true,
    ...d,
  };
}
