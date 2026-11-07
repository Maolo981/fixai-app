/**
 * Applicazione GIS full-screen (/app): mappa centrale, pannello sinistro (strumenti e
 * livelli) e destro (risultati e report), collassabili; bottom-sheet su smartphone.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BarraRicerca } from "./components/BarraRicerca";
import { MappaTerreno, type Sovrapposizione, type Vista3D } from "./components/MappaTerreno";
import { PannelloRisultati, type SchedaDestra, type StatoAnalisi } from "./components/PannelloRisultati";
import {
  PannelloSinistro,
  type StatoLivelloAnalisi,
  type StatoLivelloCurve,
  type Strumento,
} from "./components/PannelloSinistro";
import {
  analizzaGeometria,
  calcolaProfilo,
  caricaCapacita,
  caricaCurve,
  caricaMappaTematica,
  caricaQuota,
  ErroreApi,
  salvaFile,
  scaricaReport,
  type CampiReport,
} from "./lib/api";
import { formattaQuota } from "./lib/formato";
import { ORDINE_PREDEFINITO, type IdLivello, type MappaBase } from "./lib/livelli";
import type {
  Capacita,
  Destinazione,
  GeoJsonLineString,
  GeoJsonPolygon,
  PuntoProfilo,
  RispostaCurve,
  RispostaMappa,
  RispostaProfilo,
  RispostaQuota,
  StatoRichiesta,
} from "./lib/types";

/** Lotto di esempio della modalità demo: versante vitato sopra Sondrio (analizzato con dati reali). */
export const LOTTO_DEMO: GeoJsonPolygon = {
  type: "Polygon",
  coordinates: [[[9.8838, 46.1777], [9.8866, 46.1775], [9.887, 46.1802], [9.8841, 46.1804], [9.8838, 46.1777]]],
};

function messaggioErrore(e: unknown, predefinito: string) {
  return e instanceof ErroreApi ? e.message : predefinito;
}

const eMobile = () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

const SCHEDE: { id: SchedaDestra; nome: string }[] = [
  { id: "lotto", nome: "Lotto" },
  { id: "altimetria", nome: "Altimetria" },
  { id: "profilo", nome: "Profilo" },
  { id: "report", nome: "Report" },
];

export default function App() {
  const demo = useMemo(() => new URLSearchParams(window.location.search).has("demo"), []);
  const [destinazione, setDestinazione] = useState<Destinazione | null>(null);
  const [analisi, setAnalisi] = useState<StatoAnalisi>({ stato: "vuoto" });
  const [capacita, setCapacita] = useState<Capacita | null>(null);
  const [terreno, setTerreno] = useState<GeoJsonPolygon | null>(null);
  const [linea, setLinea] = useState<GeoJsonLineString | null>(null);
  const [demoAttiva, setDemoAttiva] = useState(demo);

  // Pannelli
  const [sxAperto, setSxAperto] = useState(() => !eMobile());
  const [dxAperto, setDxAperto] = useState(() => !eMobile());
  const [scheda, setScheda] = useState<SchedaDestra>("lotto");

  // Strumenti e livelli
  const [strumento, setStrumento] = useState<Strumento>("naviga");
  const [versioneElimina, setVersioneElimina] = useState(0);
  const [mappaBase, setMappaBase] = useState<MappaBase>("satellite");
  const [ordine, setOrdine] = useState<IdLivello[]>(ORDINE_PREDEFINITO);
  const [livelloAnalisi, setLivelloAnalisi] = useState<StatoLivelloAnalisi>({ visibile: true, modo: "quota", opacita: 0.75 });
  const [livelloCurve, setLivelloCurve] = useState<StatoLivelloCurve>({ visibile: true, intervallo: null });
  const [confineVisibile, setConfineVisibile] = useState(true);
  const [vista3d, setVista3d] = useState<Vista3D>({ attiva: false, esagerazione: 1, ombreggiatura: false });
  const [versioneRipristino, setVersioneRipristino] = useState(0);

  // Risultati
  const [mappa, setMappa] = useState<StatoRichiesta<RispostaMappa>>({ stato: "vuoto" });
  const [curve, setCurve] = useState<StatoRichiesta<RispostaCurve>>({ stato: "vuoto" });
  const [profilo, setProfilo] = useState<StatoRichiesta<RispostaProfilo>>({ stato: "vuoto" });
  const [quotaPunto, setQuotaPunto] = useState<StatoRichiesta<RispostaQuota>>({ stato: "vuoto" });
  const [puntoProfilo, setPuntoProfilo] = useState<PuntoProfilo | null>(null);
  const controller = useRef<AbortController | null>(null);
  const controllerProfilo = useRef<AbortController | null>(null);
  const controllerQuota = useRef<AbortController | null>(null);

  useEffect(() => {
    caricaCapacita()
      .then(setCapacita)
      .catch(() => setCapacita(null));
  }, []);

  const apriScheda = useCallback((s: SchedaDestra) => {
    setScheda(s);
    setDxAperto(true);
    if (eMobile()) setSxAperto(false);
  }, []);

  const suGeometria = useCallback(
    async (geometria: GeoJsonPolygon | null) => {
      setTerreno(geometria);
      controller.current?.abort();
      if (!geometria) {
        setAnalisi({ stato: "vuoto" });
        return;
      }
      const attuale = new AbortController();
      controller.current = attuale;
      setAnalisi({ stato: "in_corso" });
      try {
        const risultato = await analizzaGeometria(geometria, attuale.signal);
        if (attuale.signal.aborted) return;
        setAnalisi({ stato: "completata", risultato });
        apriScheda(risultato.altimetria.disponibile ? "altimetria" : "lotto");
      } catch (e) {
        if (attuale.signal.aborted) return;
        setAnalisi({ stato: "errore", messaggio: messaggioErrore(e, "Errore imprevisto durante l'analisi.") });
      }
    },
    [apriScheda],
  );

  // Mappa del lotto: si ricalcola quando cambiano lotto, modalità o visibilità (non l'opacità).
  useEffect(() => {
    if (!terreno || !livelloAnalisi.visibile) {
      setMappa({ stato: "vuoto" });
      return;
    }
    const attuale = new AbortController();
    setMappa({ stato: "in_corso" });
    caricaMappaTematica(terreno, livelloAnalisi.modo, attuale.signal)
      .then((risultato) => !attuale.signal.aborted && setMappa({ stato: "completata", risultato }))
      .catch((e) => {
        if (!attuale.signal.aborted)
          setMappa({ stato: "errore", messaggio: messaggioErrore(e, "Errore imprevisto nella mappa.") });
      });
    return () => attuale.abort();
  }, [terreno, livelloAnalisi.modo, livelloAnalisi.visibile]);

  // Curve di livello
  useEffect(() => {
    if (!terreno || !livelloCurve.visibile) {
      setCurve({ stato: "vuoto" });
      return;
    }
    const attuale = new AbortController();
    setCurve({ stato: "in_corso" });
    caricaCurve(terreno, livelloCurve.intervallo, attuale.signal)
      .then((risultato) => !attuale.signal.aborted && setCurve({ stato: "completata", risultato }))
      .catch((e) => {
        if (!attuale.signal.aborted)
          setCurve({ stato: "errore", messaggio: messaggioErrore(e, "Errore imprevisto nelle curve.") });
      });
    return () => attuale.abort();
  }, [terreno, livelloCurve.intervallo, livelloCurve.visibile]);

  const suLinea = useCallback(
    async (nuova: GeoJsonLineString | null) => {
      setLinea(nuova);
      controllerProfilo.current?.abort();
      setPuntoProfilo(null);
      if (!nuova) {
        setProfilo({ stato: "vuoto" });
        return;
      }
      const attuale = new AbortController();
      controllerProfilo.current = attuale;
      setProfilo({ stato: "in_corso" });
      apriScheda("profilo");
      try {
        const risultato = await calcolaProfilo(nuova, attuale.signal);
        if (!attuale.signal.aborted) setProfilo({ stato: "completata", risultato });
      } catch (e) {
        if (!attuale.signal.aborted)
          setProfilo({ stato: "errore", messaggio: messaggioErrore(e, "Errore imprevisto nel profilo.") });
      }
    },
    [apriScheda],
  );

  const suClickQuota = useCallback(
    async (lon: number, lat: number) => {
      controllerQuota.current?.abort();
      const attuale = new AbortController();
      controllerQuota.current = attuale;
      setQuotaPunto({ stato: "in_corso" });
      apriScheda("altimetria");
      try {
        const risultato = await caricaQuota(lon, lat, attuale.signal);
        if (!attuale.signal.aborted) setQuotaPunto({ stato: "completata", risultato });
      } catch (e) {
        if (!attuale.signal.aborted)
          setQuotaPunto({ stato: "errore", messaggio: messaggioErrore(e, "Errore nella lettura della quota.") });
      }
    },
    [apriScheda],
  );

  const generaReport = useCallback(
    async (campi: CampiReport, includiProfilo: boolean) => {
      if (!terreno) throw new Error("Disegna prima un lotto.");
      const { file, nome } = await scaricaReport(terreno, includiProfilo ? linea : null, campi);
      salvaFile(file, nome);
      return nome;
    },
    [terreno, linea],
  );

  const sovrapposizione = useMemo<Sovrapposizione | null>(() => {
    if (!livelloAnalisi.visibile || mappa.stato !== "completata" || !mappa.risultato.disponibile) return null;
    const { immagine_png_base64, coordinate } = mappa.risultato;
    return immagine_png_base64 && coordinate ? { pngBase64: immagine_png_base64, coordinate } : null;
  }, [mappa, livelloAnalisi.visibile]);

  const geojsonCurve =
    livelloCurve.visibile && curve.stato === "completata" && curve.risultato.disponibile ? curve.risultato.geojson ?? null : null;

  const puntiQuota = useMemo(() => {
    if (analisi.stato !== "completata") return null;
    const quote = analisi.risultato.altimetria.quote;
    return quote ? { minimo: quote.punto_minimo, massimo: quote.punto_massimo } : null;
  }, [analisi]);

  const marcatoreQuota =
    quotaPunto.stato === "completata"
      ? {
          lon: quotaPunto.risultato.lon,
          lat: quotaPunto.risultato.lat,
          testo:
            quotaPunto.risultato.disponibile && quotaPunto.risultato.quota_m != null
              ? formattaQuota(quotaPunto.risultato.quota_m)
              : "n.d.",
        }
      : null;

  const togglePannello = (lato: "sx" | "dx") => {
    if (lato === "sx") {
      setSxAperto((v) => !v);
      if (eMobile()) setDxAperto(false);
    } else {
      setDxAperto((v) => !v);
      if (eMobile()) setSxAperto(false);
    }
  };

  return (
    <div className={`app-gis ${sxAperto ? "app-gis--sx" : ""} ${dxAperto ? "app-gis--dx" : ""}`}>
      <header className="testata-gis">
        <a className="marchio-gis" href="/" aria-label="TerraScan Italia, pagina principale">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <span>TerraScan</span>
        </a>
        <BarraRicerca onDestinazione={setDestinazione} />
        <div className="testata-gis__azioni">
          <span className="badge-area" title="Analisi altimetriche disponibili in Lombardia">
            Area pilota: Lombardia
          </span>
          <button type="button" className="pulsante-icona" aria-pressed={sxAperto} onClick={() => togglePannello("sx")}>
            Livelli
          </button>
          <button type="button" className="pulsante-icona" aria-pressed={dxAperto} onClick={() => togglePannello("dx")}>
            Risultati
          </button>
        </div>
      </header>

      {demoAttiva && (
        <div className="banner-demo" role="status">
          <strong>Modalità demo.</strong> Lotto di esempio in Valtellina analizzato con dati reali del DTM.
          Disegna il tuo lotto per sostituirlo.
          <button type="button" onClick={() => setDemoAttiva(false)} aria-label="Chiudi avviso demo">
            ×
          </button>
        </div>
      )}

      <main className="corpo-gis">
        <aside className="lato lato--sx" aria-label="Strumenti e livelli" hidden={!sxAperto}>
          <PannelloSinistro
            strumento={strumento}
            onStrumento={setStrumento}
            haTerreno={terreno !== null}
            haLinea={linea !== null}
            onElimina={() => {
              setVersioneElimina((v) => v + 1);
              setStrumento("naviga");
              setQuotaPunto({ stato: "vuoto" });
            }}
            mappaBase={mappaBase}
            onMappaBase={setMappaBase}
            ordine={ordine}
            onOrdine={setOrdine}
            analisi={livelloAnalisi}
            onAnalisi={(patch) => setLivelloAnalisi((v) => ({ ...v, ...patch }))}
            mappa={mappa}
            curve={livelloCurve}
            onCurve={(patch) => setLivelloCurve((v) => ({ ...v, ...patch }))}
            statoCurve={curve}
            confineVisibile={confineVisibile}
            onConfine={setConfineVisibile}
            vista3d={vista3d}
            onVista3d={(patch) => setVista3d((v) => ({ ...v, ...patch }))}
            onRipristinaVista={() => {
              setVista3d((v) => ({ ...v, attiva: false }));
              setVersioneRipristino((n) => n + 1);
            }}
            motivo3d={
              capacita === null
                ? "servizio non raggiungibile."
                : (() => {
                    const f = capacita.funzioni.find((x) => x.chiave === "vista_3d");
                    return f?.stato === "implementata" ? null : (f?.note ?? "DTM non disponibile.");
                  })()
            }
          />
        </aside>

        <section className="centro-mappa" aria-label="Mappa">
          <MappaTerreno
            destinazione={destinazione}
            onGeometria={(g) => {
              if (g && demoAttiva && JSON.stringify(g) !== JSON.stringify(LOTTO_DEMO)) setDemoAttiva(false);
              void suGeometria(g);
            }}
            onLinea={suLinea}
            strumento={strumento}
            onStrumento={setStrumento}
            versioneElimina={versioneElimina}
            mappaBase={mappaBase}
            ordine={ordine}
            sovrapposizione={sovrapposizione}
            opacita={livelloAnalisi.opacita}
            curve={geojsonCurve}
            confineVisibile={confineVisibile}
            puntiQuota={puntiQuota}
            puntoProfilo={puntoProfilo}
            onClickQuota={suClickQuota}
            quotaPunto={marcatoreQuota}
            geometriaIniziale={demo ? LOTTO_DEMO : null}
            vista3d={vista3d}
            versioneRipristino={versioneRipristino}
          />
        </section>

        <aside className="lato lato--dx" aria-label="Risultati e report" hidden={!dxAperto}>
          <nav className="schede" aria-label="Sezioni dei risultati">
            {SCHEDE.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`schede__voce ${scheda === s.id ? "schede__voce--attiva" : ""}`}
                aria-current={scheda === s.id ? "page" : undefined}
                onClick={() => setScheda(s.id)}
              >
                {s.nome}
              </button>
            ))}
          </nav>
          <PannelloRisultati
            analisi={analisi}
            capacita={capacita}
            scheda={scheda}
            fase3={{
              quotaPunto,
              profilo,
              onPuntoProfilo: setPuntoProfilo,
              haLinea: linea !== null,
              onReport: generaReport,
            }}
          />
        </aside>
      </main>

      <nav className="barra-mobile" aria-label="Pannelli">
        <button type="button" aria-pressed={sxAperto} onClick={() => togglePannello("sx")}>
          Strumenti e livelli
        </button>
        <button type="button" aria-pressed={dxAperto} onClick={() => togglePannello("dx")}>
          Risultati
        </button>
      </nav>
    </div>
  );
}
