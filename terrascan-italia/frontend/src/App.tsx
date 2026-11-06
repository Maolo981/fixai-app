import { useCallback, useEffect, useRef, useState } from "react";

import { BarraRicerca } from "./components/BarraRicerca";
import { MappaTerreno } from "./components/MappaTerreno";
import { PannelloRisultati, type StatoAnalisi } from "./components/PannelloRisultati";
import { analizzaGeometria, caricaCapacita, ErroreApi } from "./lib/api";
import type { Capacita, Destinazione, GeoJsonPolygon } from "./lib/types";

export default function App() {
  const [destinazione, setDestinazione] = useState<Destinazione | null>(null);
  const [analisi, setAnalisi] = useState<StatoAnalisi>({ stato: "vuoto" });
  const [capacita, setCapacita] = useState<Capacita | null>(null);
  // Su smartphone il pannello parte chiuso per lasciare visibile la mappa.
  const [pannelloAperto, setPannelloAperto] = useState(
    () => typeof window === "undefined" || !window.matchMedia("(max-width: 768px)").matches,
  );
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    caricaCapacita()
      .then(setCapacita)
      .catch(() => setCapacita(null));
  }, []);

  const suGeometria = useCallback(async (geometria: GeoJsonPolygon | null) => {
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
          Fase 1 · Area pilota Lombardia
        </span>
      </header>

      <main className="corpo">
        <MappaTerreno destinazione={destinazione} onGeometria={suGeometria} />
        <button
          type="button"
          className="interruttore-pannello"
          onClick={() => setPannelloAperto((v) => !v)}
          aria-expanded={pannelloAperto}
        >
          {pannelloAperto ? "Nascondi risultati" : "Mostra risultati"}
        </button>
        <PannelloRisultati analisi={analisi} capacita={capacita} />
      </main>
    </div>
  );
}
