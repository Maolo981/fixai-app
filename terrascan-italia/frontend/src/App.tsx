import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BarraRicerca } from "./components/BarraRicerca";
import { MappaTerreno, type Sovrapposizione } from "./components/MappaTerreno";
import { PannelloRisultati, type StatoAnalisi } from "./components/PannelloRisultati";
import type { SceltaMappa } from "./components/SezioniFase3";
import {
  analizzaGeometria,
  calcolaProfilo,
  caricaCapacita,
  caricaMappaTematica,
  ErroreApi,
  salvaFile,
  scaricaReport,
  type CampiReport,
} from "./lib/api";
import type {
  Capacita,
  Destinazione,
  GeoJsonLineString,
  GeoJsonPolygon,
  PuntoProfilo,
  RispostaMappa,
  RispostaProfilo,
  StatoRichiesta,
} from "./lib/types";

function messaggioErrore(e: unknown, predefinito: string) {
  return e instanceof ErroreApi ? e.message : predefinito;
}

export default function App() {
  const [destinazione, setDestinazione] = useState<Destinazione | null>(null);
  const [analisi, setAnalisi] = useState<StatoAnalisi>({ stato: "vuoto" });
  const [capacita, setCapacita] = useState<Capacita | null>(null);
  // Su smartphone il pannello parte chiuso per lasciare visibile la mappa.
  const [pannelloAperto, setPannelloAperto] = useState(
    () => typeof window === "undefined" || !window.matchMedia("(max-width: 768px)").matches,
  );
  const controller = useRef<AbortController | null>(null);

  // Fase 3: mappe tematiche e profilo altimetrico
  const [terreno, setTerreno] = useState<GeoJsonPolygon | null>(null);
  const [sceltaMappa, setSceltaMappa] = useState<SceltaMappa>("nessuna");
  const [mappa, setMappa] = useState<StatoRichiesta<RispostaMappa>>({ stato: "vuoto" });
  const [profilo, setProfilo] = useState<StatoRichiesta<RispostaProfilo>>({ stato: "vuoto" });
  const [puntoProfilo, setPuntoProfilo] = useState<PuntoProfilo | null>(null);
  const [linea, setLinea] = useState<GeoJsonLineString | null>(null);
  const controllerProfilo = useRef<AbortController | null>(null);

  useEffect(() => {
    caricaCapacita()
      .then(setCapacita)
      .catch(() => setCapacita(null));
  }, []);

  const suGeometria = useCallback(async (geometria: GeoJsonPolygon | null) => {
    setTerreno(geometria);
    // Annulla l'eventuale richiesta precedente: conta solo l'ultima geometria.
    controller.current?.abort();
    if (!geometria) {
      setAnalisi({ stato: "vuoto" });
      return;
    }
    const attuale = new AbortController();
    controller.current = attuale;
    setAnalisi({ stato: "in_corso" });
    setPannelloAperto(true);
    try {
      const risultato = await analizzaGeometria(geometria, attuale.signal);
      if (!attuale.signal.aborted) setAnalisi({ stato: "completata", risultato });
    } catch (e) {
      if (attuale.signal.aborted) return;
      setAnalisi({
        stato: "errore",
        messaggio: e instanceof ErroreApi ? e.message : "Errore imprevisto durante l'analisi.",
      });
    }
  }, []);

  // La mappa tematica si ricalcola quando cambiano il terreno o la scelta.
  useEffect(() => {
    if (!terreno || sceltaMappa === "nessuna") {
      setMappa({ stato: "vuoto" });
      return;
    }
    const attuale = new AbortController();
    setMappa({ stato: "in_corso" });
    caricaMappaTematica(terreno, sceltaMappa, attuale.signal)
      .then((risultato) => !attuale.signal.aborted && setMappa({ stato: "completata", risultato }))
      .catch((e) => {
        if (!attuale.signal.aborted)
          setMappa({ stato: "errore", messaggio: messaggioErrore(e, "Errore imprevisto nella mappa.") });
      });
    return () => attuale.abort();
  }, [terreno, sceltaMappa]);

  const suLinea = useCallback(async (linea: GeoJsonLineString | null) => {
    setLinea(linea);
    controllerProfilo.current?.abort();
    setPuntoProfilo(null);
    if (!linea) {
      setProfilo({ stato: "vuoto" });
      return;
    }
    const attuale = new AbortController();
    controllerProfilo.current = attuale;
    setProfilo({ stato: "in_corso" });
    setPannelloAperto(true);
    try {
      const risultato = await calcolaProfilo(linea, attuale.signal);
      if (!attuale.signal.aborted) setProfilo({ stato: "completata", risultato });
    } catch (e) {
      if (!attuale.signal.aborted)
        setProfilo({ stato: "errore", messaggio: messaggioErrore(e, "Errore imprevisto nel profilo.") });
    }
  }, []);

  // Fase 4: il server ricalcola tutto e restituisce il PDF, che il browser salva.
  const generaReport = useCallback(
    async (campi: CampiReport, includiProfilo: boolean) => {
      if (!terreno) throw new Error("Disegna prima un terreno.");
      const { file, nome } = await scaricaReport(terreno, includiProfilo ? linea : null, campi);
      salvaFile(file, nome);
      return nome;
    },
    [terreno, linea],
  );

  const sovrapposizione = useMemo<Sovrapposizione | null>(() => {
    if (mappa.stato !== "completata" || !mappa.risultato.disponibile) return null;
    const { immagine_png_base64, coordinate } = mappa.risultato;
    return immagine_png_base64 && coordinate ? { pngBase64: immagine_png_base64, coordinate } : null;
  }, [mappa]);

  const puntiQuota = useMemo(() => {
    if (analisi.stato !== "completata") return null;
    const quote = analisi.risultato.altimetria.quote;
    return quote ? { minimo: quote.punto_minimo, massimo: quote.punto_massimo } : null;
  }, [analisi]);

  return (
    <div className={`app ${pannelloAperto ? "app--pannello-aperto" : ""}`}>
      <header className="testata">
        <div className="marchio">
          <img src="/favicon.svg" alt="" width="32" height="32" />
          <div>
            <h1>TerraScan Italia</h1>
            <p>Analisi preliminare dei terreni</p>
          </div>
        </div>
        <BarraRicerca onDestinazione={setDestinazione} />
        <span className="badge-fase" title="Versione di sviluppo">
          Fase 3 · Area pilota Lombardia
        </span>
      </header>

      <main className="corpo">
        <MappaTerreno
          destinazione={destinazione}
          onGeometria={suGeometria}
          onLinea={suLinea}
          puntiQuota={puntiQuota}
          sovrapposizione={sovrapposizione}
          puntoProfilo={puntoProfilo}
        />
        <button
          type="button"
          className="interruttore-pannello"
          onClick={() => setPannelloAperto((v) => !v)}
          aria-expanded={pannelloAperto}
        >
          {pannelloAperto ? "Nascondi risultati" : "Mostra risultati"}
        </button>
        <PannelloRisultati
          analisi={analisi}
          capacita={capacita}
          fase3={{
            sceltaMappa,
            mappa,
            onSceltaMappa: setSceltaMappa,
            profilo,
            onPuntoProfilo: setPuntoProfilo,
            haLinea: linea !== null,
            onReport: generaReport,
          }}
        />
      </main>
    </div>
  );
}
