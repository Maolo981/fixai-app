/**
 * Landing page di TerraScan Italia (/).
 * Contenuti solo veritieri: nessuna statistica, testimonianza o certificazione inventata.
 */
import "../landing.css";

const EMAIL_CONTATTO: string | undefined = import.meta.env.VITE_CONTATTO_EMAIL || undefined;

const FUNZIONI = [
  {
    titolo: "Misure geodetiche",
    testo: "Superficie, perimetro e distanze calcolati sull'ellissoide, con controllo in UTM 32N e formato catastale.",
  },
  {
    titolo: "Elevation Insights",
    testo:
      "Mappa altimetrica a colori ritagliata sul lotto, curve di livello e quota di qualsiasi punto, dal DTM 5×5 della Regione.",
  },
  {
    titolo: "Pendenze ed esposizione",
    testo: "Pendenza media e massima, classi di pendenza ed esposizione dei versanti, cella per cella.",
  },
  {
    titolo: "Profilo A-B",
    testo: "Traccia una linea e ottieni il profilo altimetrico con quote, dislivelli e pendenza di ogni tratto.",
  },
  {
    titolo: "Report PDF",
    testo: "Un documento professionale con misure, mappe, profilo, coordinate dei vertici, fonti e limiti.",
  },
  {
    titolo: "Vincoli territoriali",
    testo: "PAI, PGRA e vincoli paesaggistici dalle fonti ufficiali, con esito 'Non verificabile' dove il dato manca.",
    inSviluppo: true,
  },
];

const CASI = [
  { titolo: "Geometri e studi tecnici", testo: "Un inquadramento rapido del lotto prima del sopralluogo e del rilievo." },
  { titolo: "Imprese edili", testo: "Pendenze e dislivelli per valutare accessi, sbancamenti e cantierabilità." },
  { titolo: "Operatori immobiliari", testo: "Dati oggettivi sul terreno da condividere con clienti e investitori." },
  { titolo: "Aziende agricole", testo: "Esposizione e pendenze per vigneti, frutteti e meccanizzazione." },
];

const FAQ = [
  {
    d: "Quali zone sono coperte?",
    r: "Le analisi altimetriche coprono la Lombardia, area pilota del servizio. Superficie, perimetro e distanze funzionano ovunque in Italia.",
  },
  {
    d: "Quanto sono precisi i dati?",
    r: "Il DTM 5×5 di Regione Lombardia (edizione 2015) dichiara un'accuratezza in quota da 0,30 m nelle aree urbanizzate a 2 m nelle aree agricole e forestali. Ogni risultato riporta fonte, anno, risoluzione e limiti.",
  },
  {
    d: "Il report sostituisce un rilievo topografico?",
    r: "No. TerraScan fornisce analisi preliminari e indicative: non sostituiscono rilievi, certificazioni o verifiche amministrative eseguiti da professionisti abilitati.",
  },
  {
    d: "TerraScan dice se un terreno è edificabile?",
    r: "No. L'edificabilità dipende dagli strumenti urbanistici del Comune e da verifiche amministrative. I vincoli territoriali, in sviluppo, saranno mostrati solo quando verificati sulle fonti ufficiali.",
  },
  {
    d: "Quanto costa?",
    r: "Durante la fase pilota TerraScan è in accesso libero. I piani per professionisti sono in definizione.",
  },
];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <a className="lp-marchio" href="/">
          <img src="/favicon.svg" alt="" width="30" height="30" />
          <span>TerraScan Italia</span>
        </a>
        <nav aria-label="Sezioni" className="lp-nav__link">
          <a href="#prodotto">Prodotto</a>
          <a href="#casi">Casi d'uso</a>
          <a href="#report">Report</a>
          <a href="#faq">FAQ</a>
          <a href="#contatti">Contatti</a>
        </nav>
        <a className="lp-bottone lp-bottone--piccolo" href="/app">
          Apri l'app
        </a>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero__testo">
            <p className="lp-occhiello">Analisi preliminare dei terreni · Area pilota Lombardia</p>
            <h1>Conosci il tuo terreno prima di investire</h1>
            <p className="lp-hero__sottotitolo">
              Superficie, quote, curve di livello, pendenze ed esposizione calcolate su dati altimetrici ufficiali, con
              un report PDF pronto da condividere.
            </p>
            <div className="lp-hero__azioni">
              <a className="lp-bottone" href="/app">
                Analizza un terreno
              </a>
              <a className="lp-bottone lp-bottone--secondario" href="/app?demo">
                Esplora la demo
              </a>
            </div>
            <p className="lp-nota">
              Dati altimetrici: DTM 5×5 Regione Lombardia (2015), licenza CC BY 4.0. Analisi preliminari, non
              sostitutive di rilievi.
            </p>
          </div>
          <figure className="lp-hero__visuale">
            <div className="lp-finestra">
              <span className="lp-finestra__puntini" aria-hidden="true" />
              <img
                src="/anteprima-app.jpg"
                alt="Schermata reale di TerraScan: un lotto in Valtellina con mappa delle esposizioni e profilo altimetrico"
                loading="eager"
              />
            </div>
            <figcaption>Schermata reale: versante vitato sopra Sondrio, esposizione e profilo A-B.</figcaption>
          </figure>
        </section>

        <section id="prodotto" className="lp-sezione">
          <h2>Tutto quello che serve per un primo inquadramento</h2>
          <p className="lp-sezione__intro">Calcoli reali, fonti dichiarate, limiti espliciti.</p>
          <div className="lp-griglia">
            {FUNZIONI.map((f) => (
              <article key={f.titolo} className="lp-carta">
                <h3>
                  {f.titolo}
                  {f.inSviluppo && <span className="lp-etichetta">In sviluppo</span>}
                </h3>
                <p>{f.testo}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-sezione lp-sezione--chiara">
          <h2>Come funziona</h2>
          <ol className="lp-passi">
            <li>
              <strong>Cerca</strong> il comune, l'indirizzo o le coordinate del terreno.
            </li>
            <li>
              <strong>Disegna</strong> il perimetro del lotto su ortofoto, mappa stradale o carta tecnica.
            </li>
            <li>
              <strong>Analizza</strong> quote, pendenze e profili, poi scarica il report PDF.
            </li>
          </ol>
        </section>

        <section id="casi" className="lp-sezione">
          <h2>Per chi è pensato</h2>
          <div className="lp-griglia lp-griglia--4">
            {CASI.map((c) => (
              <article key={c.titolo} className="lp-carta">
                <h3>{c.titolo}</h3>
                <p>{c.testo}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="report" className="lp-sezione lp-sezione--chiara lp-report">
          <div>
            <h2>Un report che puoi allegare</h2>
            <p>
              Inquadramento con scala e Nord, superficie e perimetro, analisi altimetrica con mappe di pendenze ed
              esposizioni, profilo A-B, coordinate dei vertici in WGS84 e UTM 32N, fonti, metodi e limiti. L'avvertenza
              legale è su ogni pagina.
            </p>
            <a className="lp-bottone" href="/esempio-report.pdf" target="_blank" rel="noopener">
              Apri un report di esempio (PDF)
            </a>
          </div>
          <ul className="lp-fonti" aria-label="Fonti dei dati">
            <li>
              <strong>Quote e pendenze</strong> DTM 5×5 – Regione Lombardia, ed. 2015, CC BY 4.0
            </li>
            <li>
              <strong>Ortofoto</strong> AGEA 2015 – servizio di Regione Lombardia
            </li>
            <li>
              <strong>Carta tecnica</strong> CTR/DBT – Regione Lombardia
            </li>
            <li>
              <strong>Confini</strong> ISTAT 2024, CC BY 3.0
            </li>
            <li>
              <strong>Mappa stradale e ricerca</strong> © OpenStreetMap contributors
            </li>
          </ul>
        </section>

        <section id="faq" className="lp-sezione">
          <h2>Domande frequenti</h2>
          <div className="lp-faq">
            {FAQ.map((f) => (
              <details key={f.d}>
                <summary>{f.d}</summary>
                <p>{f.r}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="contatti" className="lp-sezione lp-sezione--chiara lp-contatti">
          <h2>Contatti</h2>
          {EMAIL_CONTATTO ? (
            <p>
              Scrivici a <a href={`mailto:${EMAIL_CONTATTO}`}>{EMAIL_CONTATTO}</a> per informazioni, collaborazioni o
              per segnalare un problema.
            </p>
          ) : (
            <p>I canali di contatto sono in attivazione durante la fase pilota.</p>
          )}
          <a className="lp-bottone" href="/app">
            Analizza un terreno
          </a>
        </section>
      </main>

      <footer className="lp-piede">
        <p>
          TerraScan Italia · nome provvisorio · fase pilota. Le analisi sono preliminari e indicative: non sostituiscono
          rilievi topografici, certificazioni o verifiche amministrative.
        </p>
      </footer>
    </div>
  );
}
