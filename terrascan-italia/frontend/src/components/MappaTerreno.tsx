/**
 * Mappa interattiva (MapLibre GL JS) con disegno del perimetro del terreno
 * (Terra Draw). Il componente non calcola nulla: comunica la geometria
 * disegnata al componente padre, che la invia al backend per l'analisi.
 */
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre 6 elabora le tile in un "web worker" (modulo ES separato):
// lo facciamo includere da Vite nella build e indichiamo a MapLibre dove trovarlo.
import urlWorkerMapLibre from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  ValidateNotSelfIntersecting,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

import { caricaAreaPilota } from "../lib/api";
import { creaMaschera } from "../lib/maschera";
import { formattaQuota } from "../lib/formato";
import type { Destinazione, GeoJsonPolygon, PuntoQuota } from "../lib/types";

maplibregl.setWorkerUrl(urlWorkerMapLibre);

/** Mappa di base vettoriale gratuita basata su OpenStreetMap. */
const STILE_MAPPA = "https://tiles.openfreemap.org/styles/liberty";
/** Riquadro iniziale: Lombardia. */
const RIQUADRO_LOMBARDIA: [number, number, number, number] = [8.49, 44.67, 11.43, 46.64];
/** Limite di navigazione: Nord Italia (area pilota e dintorni). */
const LIMITI_NAVIGAZIONE: [number, number, number, number] = [4.5, 42.5, 15.5, 48.5];

const COLORE_TERRENO = "#ea580c";
const COLORE_BORDO = "#9a3412";

type Modalita = "static" | "polygon" | "select";

interface Props {
  destinazione: Destinazione | null;
  onGeometria: (geometria: GeoJsonPolygon | null) => void;
  /** Punti più basso e più alto del terreno (dal DTM), da evidenziare sulla mappa. */
  puntiQuota?: { minimo: PuntoQuota; massimo: PuntoQuota } | null;
}

export function MappaTerreno({ destinazione, onGeometria, puntiQuota }: Props) {
  const contenitore = useRef<HTMLDivElement>(null);
  const mappa = useRef<maplibregl.Map | null>(null);
  const disegno = useRef<TerraDraw | null>(null);
  const callback = useRef(onGeometria);
  callback.current = onGeometria;

  const [pronta, setPronta] = useState(false);
  const [modalita, setModalita] = useState<Modalita>("static");
  const [haTerreno, setHaTerreno] = useState(false);
  const [erroreMappa, setErroreMappa] = useState<string | null>(null);
  const [avvisoDisegno, setAvvisoDisegno] = useState<string | null>(null);

  useEffect(() => {
    if (!contenitore.current) return;
    const map = new maplibregl.Map({
      container: contenitore.current,
      style: STILE_MAPPA,
      bounds: RIQUADRO_LOMBARDIA,
      fitBoundsOptions: { padding: 24 },
      maxBounds: LIMITI_NAVIGAZIONE,
      attributionControl: false,
      // Necessario per generare immagini della mappa (es. futuri report).
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mappa.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric", maxWidth: 140 }), "bottom-left");
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "Confine regionale © ISTAT (CC BY 3.0)",
      }),
      "bottom-right",
    );

    map.on("error", (evento: maplibregl.ErrorEvent) => {
      if (!map.isStyleLoaded()) {
        console.error(evento.error);
        setErroreMappa("Mappa di base non disponibile: controlla la connessione a Internet.");
      }
    });

    let debounce: ReturnType<typeof setTimeout> | undefined;

    map.on("load", async () => {
      // 1) Area pilota (Lombardia): maschera esterna e confine.
      try {
        const area = await caricaAreaPilota();
        map.addSource("area-pilota", { type: "geojson", data: area });
        map.addSource("maschera", { type: "geojson", data: creaMaschera(area) });
        map.addLayer({
          id: "maschera",
          type: "fill",
          source: "maschera",
          paint: { "fill-color": "#0f172a", "fill-opacity": 0.22 },
        });
        map.addLayer({
          id: "confine-area-pilota",
          type: "line",
          source: "area-pilota",
          paint: { "line-color": "#14532d", "line-width": 2.2, "line-opacity": 0.85 },
        });
      } catch (errore) {
        console.warn("Confine area pilota non caricato", errore);
      }

      // 2) Strumenti di disegno.
      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [
          new TerraDrawPolygonMode({
            validation: (feature, { updateType }) => {
              if (updateType === "finish" || updateType === "commit") {
                const esito = ValidateNotSelfIntersecting(feature);
                if (!esito.valid) setAvvisoDisegno("I lati del terreno non possono incrociarsi.");
                return esito;
              }
              return { valid: true };
            },
            styles: {
              fillColor: COLORE_TERRENO,
              fillOpacity: 0.22,
              outlineColor: COLORE_BORDO,
              outlineWidth: 2.5,
              closingPointColor: "#ffffff",
              closingPointOutlineColor: COLORE_BORDO,
              closingPointWidth: 6,
              closingPointOutlineWidth: 2,
            },
          }),
          new TerraDrawSelectMode({
            flags: {
              polygon: {
                feature: {
                  draggable: false,
                  coordinates: { midpoints: true, draggable: true, deletable: true },
                },
              },
            },
            validation: (feature) => ValidateNotSelfIntersecting(feature),
            styles: {
              selectedPolygonColor: COLORE_TERRENO,
              selectedPolygonFillOpacity: 0.28,
              selectedPolygonOutlineColor: COLORE_BORDO,
              selectedPolygonOutlineWidth: 3,
              selectionPointColor: "#ffffff",
              selectionPointOutlineColor: COLORE_BORDO,
              selectionPointWidth: 6,
              selectionPointOutlineWidth: 2,
              midPointColor: COLORE_TERRENO,
              midPointOutlineColor: "#ffffff",
              midPointWidth: 4,
            },
          }),
        ],
      });
      draw.start();
      disegno.current = draw;

      const poligoni = () =>
        draw.getSnapshot().filter((f) => f.geometry.type === "Polygon" && f.properties.mode === "polygon");

      const comunica = () => {
        const [primo] = poligoni();
        setHaTerreno(Boolean(primo));
        callback.current(primo ? (primo.geometry as GeoJsonPolygon) : null);
      };

      draw.on("finish", (id, contesto) => {
        if (contesto.mode !== "polygon") return;
        // Fase 1: un solo terreno alla volta; i precedenti vengono rimossi.
        const altri = poligoni()
          .map((f) => f.id)
          .filter((x): x is string | number => x !== undefined && x !== id);
        if (altri.length) draw.removeFeatures(altri);
        setAvvisoDisegno(null);
        comunica();
        // Passa subito alla modifica, così i vertici sono trascinabili.
        draw.setMode("select");
        draw.selectFeature(id);
        setModalita("select");
      });

      draw.on("change", (_ids, tipo) => {
        if (draw.getMode() !== "select" || tipo === "styling") return;
        clearTimeout(debounce);
        debounce = setTimeout(comunica, 250);
      });

      setPronta(true);
    });

    return () => {
      clearTimeout(debounce);
      disegno.current?.stop();
      disegno.current = null;
      map.remove();
      mappa.current = null;
    };
  }, []);

  // Indicatori dei punti di quota minima e massima.
  useEffect(() => {
    const map = mappa.current;
    if (!map || !puntiQuota) return;
    const crea = (punto: PuntoQuota, tipo: "min" | "max") => {
      const el = document.createElement("div");
      el.className = `marcatore-quota marcatore-quota--${tipo}`;
      el.textContent = tipo === "min" ? "▼" : "▲";
      el.title = `Quota ${tipo === "min" ? "minima" : "massima"}: ${formattaQuota(punto.quota)}`;
      return new maplibregl.Marker({ element: el }).setLngLat([punto.lon, punto.lat]).addTo(map);
    };
    const marcatori = [crea(puntiQuota.minimo, "min"), crea(puntiQuota.massimo, "max")];
    return () => marcatori.forEach((m) => m.remove());
  }, [puntiQuota]);

  // Sposta la mappa sulla località cercata.
  useEffect(() => {
    const map = mappa.current;
    if (!map || !destinazione) return;
    if (destinazione.tipo === "riquadro") {
      const [o, s, e, n] = destinazione.bbox;
      map.fitBounds([o, s, e, n], { padding: 48, maxZoom: 17, duration: 1200 });
    } else {
      map.flyTo({ center: [destinazione.lon, destinazione.lat], zoom: destinazione.zoom ?? 17, duration: 1200 });
    }
  }, [destinazione]);

  const impostaModalita = (nuova: Modalita) => {
    const draw = disegno.current;
    if (!draw) return;
    draw.setMode(nuova);
    setModalita(nuova);
    setAvvisoDisegno(null);
  };

  const elimina = () => {
    const draw = disegno.current;
    if (!draw) return;
    draw.clear();
    draw.setMode("static");
    setModalita("static");
    setHaTerreno(false);
    setAvvisoDisegno(null);
    callback.current(null);
  };

  return (
    <div className="mappa">
      <div ref={contenitore} className="mappa__canvas" data-testid="mappa" />

      <div className="strumenti" role="toolbar" aria-label="Strumenti di disegno">
        <button
          type="button"
          className={`strumento ${modalita === "polygon" ? "strumento--attivo" : ""}`}
          onClick={() => impostaModalita("polygon")}
          disabled={!pronta}
          aria-pressed={modalita === "polygon"}
        >
          <IconaPoligono /> <span>{haTerreno ? "Nuovo terreno" : "Disegna terreno"}</span>
        </button>
        <button
          type="button"
          className={`strumento ${modalita === "select" ? "strumento--attivo" : ""}`}
          onClick={() => impostaModalita("select")}
          disabled={!pronta || !haTerreno}
          aria-pressed={modalita === "select"}
        >
          <IconaModifica /> <span>Modifica</span>
        </button>
        <button type="button" className="strumento" onClick={elimina} disabled={!pronta || !haTerreno}>
          <IconaCestino /> <span>Elimina</span>
        </button>
      </div>

      {modalita === "polygon" && (
        <div className="suggerimento" role="status">
          Clicca sulla mappa per aggiungere i vertici. Chiudi il perimetro cliccando sul primo vertice.
          <kbd>Esc</kbd> annulla.
        </div>
      )}
      {modalita === "select" && haTerreno && !avvisoDisegno && (
        <div className="suggerimento" role="status">
          Trascina i vertici per correggere il perimetro; clicca sui punti intermedi per aggiungerne.
          Clic destro su un vertice per eliminarlo.
        </div>
      )}
      {avvisoDisegno && (
        <div className="suggerimento suggerimento--avviso" role="alert">
          {avvisoDisegno}
        </div>
      )}
      {erroreMappa && <div className="mappa__errore">{erroreMappa}</div>}
    </div>
  );
}

function IconaPoligono() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M5 18 L8 6 L18 4 L20 15 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {[[5, 18], [8, 6], [18, 4], [20, 15]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="currentColor" />
      ))}
    </svg>
  );
}

function IconaModifica() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16z M14 6l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function IconaCestino() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
