import { raw } from 'hono/html';
import { BRAND, EVENTS, PRICES, RETENTION_DAYS_AFTER_EVENT } from '../config';
import { type UiIcon, occasionIcon, uiIcon } from '../icons';
import { FEATURED_THEMES, THEMES, THEME_BY_ID } from '../themes';
import { euro } from '../util';
import { LIMITS } from '../model';
import { Layout } from './layout';
import { PhotoStylesSection } from './styles';

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Gli invitati devono scaricare un’app o registrarsi?',
    a: 'No. L’invito è un link: si apre con un tocco da WhatsApp, Instagram, SMS o email, su qualsiasi telefono. Per confermare basta scrivere il nome e scegliere «Sì, ci sarò».',
  },
  {
    q: 'Come mando l’invito?',
    a: 'Copi il link o premi «Condividi su WhatsApp». Se vuoi sapere esattamente chi ha risposto e chi no, crea la lista invitati: ogni famiglia riceve un link personalizzato con il proprio nome.',
  },
  {
    q: 'Posso modificare l’invito dopo averlo mandato?',
    a: 'Sì, tutte le volte che vuoi: orari, indirizzi, testo, foto. Il link resta lo stesso e gli invitati vedono sempre la versione aggiornata.',
  },
  {
    q: 'Posso mettere una mia foto?',
    a: `Sì. Carichi la foto dal telefono e scegli come mostrarla: ad arco, tonda, in cornice, come una polaroid o grande in cima all’invito. Puoi aggiungere anche una galleria con fino a ${LIMITS.gallery} foto, che gli invitati ingrandiscono con un tocco.`,
  },
  {
    q: 'Quanti stili ci sono? Posso cambiarlo dopo?',
    a: `Sono ${THEMES.length}, dai classici con l’oro ai fiori ad acquerello, dalla montagna ai palloncini per i bambini. Lo stile si cambia con un tocco quando vuoi, anche dopo aver mandato l’invito: il link resta lo stesso.`,
  },
  {
    q: 'Come vedo chi ha confermato?',
    a: 'Nella tua pagina di gestione trovi la lista sempre aggiornata: chi viene, quanti adulti e bambini, allergie e menu, i messaggi degli invitati. Puoi scaricare tutto in Excel per il ristorante o il catering e ricevere una email a ogni nuova risposta.',
  },
  {
    q: 'Posso sapere chi ha aperto l’invito e mandare un promemoria?',
    a: 'Sì, con i link personalizzati vedi chi l’ha aperto e chi non ha ancora risposto. Con un tocco mandi un promemoria gentile su WhatsApp solo a chi manca.',
  },
  {
    q: 'Posso mettere la lista nozze o una colletta?',
    a: 'Sì. Aggiungi i regali e gli invitati li prenotano dall’invito, così nessuno sceglie lo stesso. Per il viaggio di nozze o un regalo di gruppo apri una colletta: ognuno indica la sua quota e tu vedi il totale. Il pagamento avviene direttamente tra voi (IBAN o come preferite).',
  },
  {
    q: 'Posso gestire menu e tavoli?',
    a: 'Sì. Ogni invitato sceglie il menu per ogni persona, tu assegni i tavoli dalla lista e stampi il tableau. Se vuoi, il giorno della festa ognuno trova il proprio tavolo direttamente sul telefono.',
  },
  {
    q: 'Quanto costa? C’è un abbonamento?',
    a: `Nessun abbonamento: crei e provi l’invito gratis, paghi una sola volta quando lo pubblichi (da ${euro(PRICES.festa.cents)}). Le conferme sono illimitate e non ci sono pubblicità.`,
  },
  {
    q: 'Fino a quando resta online?',
    a: `Fino a ${Math.round(RETENTION_DAYS_AFTER_EVENT / 30)} mesi dopo l’evento. Dopo, per proteggere la privacy dei tuoi invitati, cancelliamo automaticamente tutti i dati: ricordati di scaricare l’elenco delle risposte e i messaggi.`,
  },
  {
    q: 'Posso avere la fattura?',
    a: `Certo: dopo il pagamento scrivici a ${BRAND.supportEmail} con i tuoi dati di fatturazione.`,
  },
];

const FEATURES_GUESTS: [UiIcon, string, string][] = [
  ['envelope', 'Una busta da aprire', 'Il primo tocco è un’emozione: si rompe il sigillo di ceralacca, la busta si apre e l’invito esce, tra coriandoli d’oro.'],
  ['pin', 'Programma, mappa e meteo', 'Ogni tappa con le indicazioni stradali e, nei giorni prima, le previsioni del tempo.'],
  ['gift', 'Lista regali senza doppioni', 'Prenotano il regalo con un tocco o partecipano a una colletta: nessuno sceglie lo stesso.'],
  ['table', 'Il tavolo sul telefono', 'Il giorno della festa ognuno trova il suo tavolo, senza code davanti al tableau.'],
  ['car', 'Passaggi e alloggi', 'Una bacheca per offrire o chiedere un passaggio e gli hotel consigliati per chi viene da lontano.'],
  ['photo', 'Le vostre foto e la vostra storia', 'Una galleria da sfogliare e le tappe più belle, da raccontare prima della festa.'],
  ['phone', 'Nessuna app', 'Si apre ovunque, anche sul telefono della nonna. E si salva in calendario con un tocco.'],
];

const FEATURES_HOSTS: [UiIcon, string, string][] = [
  ['check', 'Conferme automatiche', 'Chi viene, nome e menu di ogni persona, allergie e canzoni per il DJ: tutto in una lista che si aggiorna da sola.'],
  ['person', 'Un link per ogni invitato', '«Un invito speciale per Zia Carla e Zio Paolo»: ognuno vede il suo nome, i posti riservati e solo le tappe a cui è invitato.'],
  ['eye', 'Sai chi l’ha aperto', 'Vedi chi ha aperto l’invito e chi non ha ancora risposto.'],
  ['bell', 'Promemoria e avvisi', 'Un tocco e mandi su WhatsApp un promemoria a chi manca, o un avviso a tutti se cambia un orario.'],
  ['printer', 'Excel, tableau e stampa', 'Excel per il catering, tableau dei tavoli e l’invito da stampare con il codice QR.'],
  ['users', 'Organizzi in compagnia', 'Un link di sola lettura per genitori, testimoni e wedding planner: vedono tutto, senza poter cambiare nulla.'],
  ['pencil', 'Modifiche illimitate', 'Cambi un orario o un indirizzo? Il link resta lo stesso.'],
];

export function LandingPage({ origin, telegram }: { origin: string; telegram?: boolean }) {
  const hosts = telegram
    ? FEATURES_HOSTS.map((f): [UiIcon, string, string] => (f[0] === 'users' ? [f[0], f[1], `${f[2].replace(/: vedono.*$/, '')}. E ricevi le risposte anche su Telegram.`] : f))
    : FEATURES_HOSTS;
  return (
    <Layout
      title={`${BRAND.name} · Inviti digitali con conferma presenza per matrimoni, battesimi e feste`}
      description="Crea in 5 minuti un invito digitale elegante per matrimonio, battesimo, comunione, laurea, compleanno o qualsiasi festa. Mandalo su WhatsApp e ricevi le conferme di presenza in automatico."
      canonical={`${origin}/`}
      ogImage={`${origin}/og/brand.png`}
      scripts={['/js/site.js']}
      jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }}
    >
      <main>
        <section class="hero">
          <div class="container hero-grid">
            <div class="hero-copy">
              <p class="kicker">Inviti digitali · conferme automatiche</p>
              <h1 class="display">
                Il tuo invito arriva su WhatsApp. <em>Le conferme arrivano da sole.</em>
              </h1>
              <p class="lead">
                Matrimoni, battesimi, comunioni, compleanni, cene, eventi aziendali e qualsiasi festa: crei un invito elegante in 5 minuti, lo
                mandi a tutti con un link e vedi in tempo reale chi viene, quanti sono e cosa mangiano.
              </p>
              <div class="hero-cta">
                <a class="btn btn-primary btn-lg" href="/crea">
                  Crea il tuo invito
                </a>
                <a class="btn btn-secondary btn-lg" href="/demo/ulivo">
                  Guarda un esempio
                </a>
              </div>
              <p class="hero-note">Provi gratis · Paghi solo quando lo pubblichi · Da {euro(PRICES.festa.cents)}, una volta sola</p>
            </div>
            <div class="hero-visual">
              <div class="phone" aria-label="Esempio di invito: tocca la busta per aprirla">
                <iframe src="/demo/ulivo?embed=1" title="Esempio di invito digitale" loading="eager"></iframe>
              </div>
              <p class="phone-caption">È un invito vero: tocca la busta</p>
            </div>
          </div>
        </section>

        <section class="events-strip" aria-label="Per ogni occasione">
          <div class="container chips">
            {EVENTS.map((e) => (
              <a class="chip" href={`/inviti/${e.slug}`}>
                {raw(occasionIcon(e.id, 'icon chip-icon'))}
                {e.label}
              </a>
            ))}
          </div>
        </section>

        <section class="section" id="come-funziona">
          <div class="container">
            <h2 class="h2 center">Pronto in 5 minuti, davvero</h2>
            <ol class="steps">
              <li>
                <span class="step-n">I</span>
                <h3>Scegli lo stile</h3>
                <p>Avorio e oro, rami d’ulivo, limoni di Amalfi, blu mezzanotte… nove stili su carta di cotone, con dettagli in oro a caldo.</p>
              </li>
              <li>
                <span class="step-n">II</span>
                <h3>Scrivi i dettagli</h3>
                <p>Nomi, data, chiesa e ristorante, una foto. Se non trovi le parole, ti suggeriamo noi la frase giusta.</p>
              </li>
              <li>
                <span class="step-n">III</span>
                <h3>Invia e rilassati</h3>
                <p>Mandi il link su WhatsApp. Le risposte arrivano nella tua lista, e a chi si dimentica ricordi tutto con un tocco.</p>
              </li>
            </ol>
          </div>
        </section>

        <section class="section alt">
          <div class="container two-col">
            <div>
              <h2 class="h3">Per i tuoi invitati</h2>
              <ul class="features">
                {FEATURES_GUESTS.map(([icon, t, d]) => (
                  <li>
                    <span class="f-icon">{raw(uiIcon(icon))}</span>
                    <div>
                      <h3>{t}</h3>
                      <p>{d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 class="h3">Per te che organizzi</h2>
              <ul class="features">
                {hosts.map(([icon, t, d]) => (
                  <li>
                    <span class="f-icon">{raw(uiIcon(icon))}</span>
                    <div>
                      <h3>{t}</h3>
                      <p>{d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section class="section" id="esempi">
          <div class="container">
            <h2 class="h2 center">
              {THEMES.length} stili, <em>tutti made in Italy</em>
            </h2>
            <p class="lead center narrow">Tocca uno stile per aprire un invito di esempio, proprio come lo vedranno i tuoi ospiti.</p>
            <div class="themes-grid">
              {FEATURED_THEMES.map((id) => THEME_BY_ID[id]).map((t) => (
                <a class="theme-card" href={`/demo/${t.id}`}>
                  <img src={`/img/themes/${t.id}.webp`} alt={`Invito stile ${t.name}`} loading="lazy" width={390} height={520} />
                  <span class="theme-meta">
                    <strong>{t.name}</strong>
                    <span>{t.desc}</span>
                  </span>
                </a>
              ))}
            </div>
            <p class="center more-styles">
              <a class="btn btn-secondary btn-lg" href="/stili">
                Vedi tutti i {THEMES.length} stili
              </a>
            </p>
          </div>
        </section>

        <PhotoStylesSection alt />

        <section class="section">
          <div class="container">
            <h2 class="h2 center">Carta, foto su WhatsApp o {BRAND.name}?</h2>
            <div class="table-wrap">
              <table class="compare">
                <thead>
                  <tr>
                    <th></th>
                    <th>Partecipazioni di carta</th>
                    <th>Immagine su WhatsApp</th>
                    <th class="hl">{BRAND.name}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>Costo per 100 invitati</th>
                    <td>250–500 € + francobolli</td>
                    <td>Gratis</td>
                    <td class="hl">da {euro(PRICES.festa.cents)}, una volta</td>
                  </tr>
                  <tr>
                    <th>Conferme di presenza</th>
                    <td>Telefonate e rincorse</td>
                    <td>Messaggi sparsi nelle chat</td>
                    <td class="hl">Automatiche, in una lista</td>
                  </tr>
                  <tr>
                    <th>Menu, allergie, bambini</th>
                    <td>—</td>
                    <td>—</td>
                    <td class="hl">Raccolti nella risposta</td>
                  </tr>
                  <tr>
                    <th>Cambi un orario</th>
                    <td>Ristampa</td>
                    <td>Nuova immagine a tutti</td>
                    <td class="hl">Si aggiorna da solo</td>
                  </tr>
                  <tr>
                    <th>Mappa, programma, IBAN</th>
                    <td>—</td>
                    <td>Da copiare a mano</td>
                    <td class="hl">Con un tocco</td>
                  </tr>
                  <tr>
                    <th>Sai chi l’ha visto</th>
                    <td>—</td>
                    <td>—</td>
                    <td class="hl">Sì</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section class="section" id="prezzi">
          <div class="container">
            <h2 class="h2 center">Un prezzo, una volta sola</h2>
            <p class="lead center narrow">Crei e provi gratis. Paghi solo quando pubblichi l’invito. Nessun abbonamento, nessuna pubblicità.</p>
            <div class="pricing">
              {(['festa', 'cerimonia', 'matrimonio'] as const).map((tier) => (
                <div class={`price-card${tier === 'matrimonio' ? ' featured' : ''}`}>
                  {tier === 'matrimonio' && <span class="ribbon">Il più scelto dagli sposi</span>}
                  <h3>{PRICES[tier].label}</h3>
                  <p class="price">{euro(PRICES[tier].cents)}</p>
                  <p class="muted small">{PRICES[tier].examples}</p>
                  <ul class="checks">
                    <li>Conferme di presenza illimitate</li>
                    <li>Link personalizzati e promemoria su WhatsApp</li>
                    <li>Lista regali, menu e tavoli</li>
                    <li>Excel per il catering e tableau</li>
                    <li>Modifiche illimitate</li>
                    <li>Online fino a 6 mesi dopo l’evento</li>
                  </ul>
                  <a class={`btn btn-block ${tier === 'matrimonio' ? 'btn-primary' : 'btn-secondary'}`} href="/crea">
                    Inizia gratis
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section class="section alt" id="domande">
          <div class="container narrow">
            <h2 class="h2 center">Domande frequenti</h2>
            <div class="faq">
              {FAQ.map((f) => (
                <details>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section class="section cta-final">
          <div class="container narrow center">
            <h2 class="h2">La festa inizia dall’invito</h2>
            <p class="lead">Crealo adesso: ti bastano 5 minuti e lo vedi subito, prima di pagare.</p>
            <a class="btn btn-primary btn-lg" href="/crea">
              Crea il tuo invito gratis
            </a>
          </div>
        </section>
      </main>
    </Layout>
  );
}
