/**
 * Mappa interattiva (MapLibre GL JS) con disegno di lotto e linea A-B (Terra Draw),
 * mappe di base, livelli ordinabili (analisi del lotto, curve di livello, confine)
 * e lettura della quota di un punto. Il componente non calcola nulla: comunica le
 * geometrie al padre e visualizza i risultati ricevuti dal backend.
 */
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre 6 elabora le tile in un "web worker" (modulo ES separato).
import urlWorkerMapLibre from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import {
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  ValidateNotSelfIntersecting,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

import { caricaAreaPilota } from "../lib/api";
import { formattaQuota } from "../lib/formato";
import { LAYER_MAPLIBRE, MAPPE_BASE, ordineDiDisegno, type IdLivello, type MappaBase } from "../lib/livelli";
import { creaMaschera } from "../lib/maschera";
import type { Destinazione, GeoJsonLineString, GeoJsonPolygon, PuntoQuota } from "../lib/types";
import type { Strumento } from "./PannelloSinistro";

maplibregl.setWorkerUrl(urlWorkerMapLibre);

const STILE_MAPPA = "https://tiles.openfreemap.org/styles/liberty";
const RIQUADRO_LOMBARDIA: [number, number, number, number] = [8.49, 44.67, 11.43, 46.64];
const LIMITI_NAVIGAZIONE: [number, number, number, number] = [4.5, 42.5, 15.5, 48.5];

const COLORE_TERRENO = "#f97316";
const COLORE_BORDO = "#c2410c";
const COLORE_PROFILO = "#38bdf8";
const MODO_TERRA_DRAW: Record<Strumento, string> = {
  naviga: "static",
  quota: "static",
  poligono: "polygon",
  linea: "linestring",
  modifica: "select",
};

/** Immagine georeferenziata da sovrapporre alla mappa (analisi del lotto). */
export interface Sovrapposizione {
  pngBase64: string;
  coordinate: [number, number][];
}

interface Props {
  destinazione: Destinazione | null;
  onGeometria: (geometria: GeoJsonPolygon | null) => void;
  onLinea?: (linea: GeoJsonLineString | null) => void;
  strumento?: Strumento;
  onStrumento?: (s: Strumento) => void;
  /** Ogni incremento cancella lotto e linea. */
  versioneElimina?: number;
  mappaBase?: MappaBase;
  ordine?: IdLivello[];
  sovrapposizione?: Sovrapposizione | null;
  opacita?: number;
  curve?: GeoJSON.FeatureCollection | null;
  confineVisibile?: boolean;
  puntiQuota?: { minimo: PuntoQuota; massimo: PuntoQuota } | null;
  puntoProfilo?: { lon: number; lat: number } | null;
  onClickQuota?: (lon: number, lat: number) => void;
  quotaPunto?: { lon: number; lat: number; testo: string } | null;
  /** Lotto da disegnare all'apertura (modalità demo). */
  geometriaIniziale?: GeoJsonPolygon | null;
}

const VUOTO: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export function MappaTerreno({
  destinazione,
  onGeometria,
  onLinea,
  strumento = "naviga",
  onStrumento,
  versioneElimina = 0,
  mappaBase = "stradale",
  ordine = ["confine", "curve", "analisi"],
  sovrapposizione = null,
  opacita = 0.8,
  curve = null,
  confineVisibile = true,
  puntiQuota = null,
  puntoProfilo = null,
  onClickQuota,
  quotaPunto = null,
  geometriaIniziale = null,
}: Props) {
  const iniziale = useRef(geometriaIniziale);
  const contenitore = useRef<HTMLDivElement>(null);
  const mappa = useRef<maplibregl.Map | null>(null);
  const disegno = useRef<TerraDraw | null>(null);
  const cb = useRef({ onGeometria, onLinea, onStrumento, onClickQuota });
  cb.current = { onGeometria, onLinea, onStrumento, onClickQuota };
  const strumentoAttuale = useRef(strumento);
  strumentoAttuale.current = strumento;
  const stato = useRef({ mappaBase, ordine, confineVisibile });
  stato.current = { mappaBase, ordine, confineVisibile };

  const [pronta, setPronta] = useState(false);
  const [erroreMappa, setErroreMappa] = useState<string | null>(null);
  const [avvisoDisegno, setAvvisoDisegno] = useState<string | null>(null);

  /** Ordina i livelli logici sotto i disegni di Terra Draw. */
  const applicaOrdine = (map: maplibregl.Map, ordineLivelli: IdLivello[]) => {
    const primoDisegno = map.getStyle().layers.find((l) => l.id.startsWith("td-"))?.id;
    for (const id of ordineDiDisegno(ordineLivelli)) {
      if (map.getLayer(id)) map.moveLayer(id, primoDisegno);
    }
  };

  const applicaMappaBase = (map: maplibregl.Map, base: MappaBase) => {
    for (const m of ["satellite", "topografica"] as const) {
      if (map.getLayer(`base-${m}`)) map.setLayoutProperty(`base-${m}`, "visibility", m === base ? "visible" : "none");
    }
    // Curve chiare sull'ortofoto, scure sulle carte
    if (map.getLayer("curve-linee")) {
      const colore = base === "satellite" ? "#fef9c3" : "#7c2d12";
      map.setPaintProperty("curve-linee", "line-color", colore);
      map.setPaintProperty("curve-etichette", "text-color", colore);
      map.setPaintProperty("curve-etichette", "text-halo-color", base === "satellite" ? "#1c1917" : "#ffffff");
    }
  };

  useEffect(() => {
    if (!contenitore.current) return;
    const map = new maplibregl.Map({
      container: contenitore.current,
      style: STILE_MAPPA,
      bounds: RIQUADRO_LOMBARDIA,
      fitBoundsOptions: { padding: 24 },
      maxBounds: LIMITI_NAVIGAZIONE,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    mappa.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric", maxWidth: 140 }), "bottom-left");
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "Confine © ISTAT (CC BY 3.0) · DTM 5×5 © Regione Lombardia (CC BY 4.0)",
      }),
      "bottom-right",
    );

    map.on("error", (evento: maplibregl.ErrorEvent) => {
      if (!map.isStyleLoaded()) {
        console.error(evento.error);
        setErroreMappa("Mappa di base non disponibile: controlla la connessione a Internet.");
      }
    });

    map.on("click", (e) => {
      if (strumentoAttuale.current === "quota") cb.current.onClickQuota?.(e.lngLat.lng, e.lngLat.lat);
    });

    let debounce: ReturnType<typeof setTimeout> | undefined;

    map.on("load", async () => {
      // 1) Mappe di base raster (sopra le strade, sotto i livelli di analisi)
      const primoSimbolo = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
      for (const base of ["satellite", "topografica"] as const) {
        const conf = MAPPE_BASE[base];
        map.addSource(`base-${base}`, {
          type: "raster",
          tiles: conf.tiles!,
          tileSize: 256,
          maxzoom: conf.maxzoom,
          attribution: conf.attribuzione,
        });
        // L'ortofoto resta sotto le etichette (vista ibrida); la CTR ha le sue scritte.
        map.addLayer(
          { id: `base-${base}`, type: "raster", source: `base-${base}`, layout: { visibility: "none" } },
          base === "satellite" ? primoSimbolo : undefined,
        );
      }

      // 2) Curve di livello (sorgente vuota, riempita quando arrivano i dati)
      map.addSource("curve", { type: "geojson", data: VUOTO });
      map.addLayer({
        id: "curve-linee",
        type: "line",
        source: "curve",
        paint: {
          "line-color": "#7c2d12",
          "line-width": ["case", ["get", "direttrice"], 1.8, 0.9],
          "line-opacity": 0.9,
        },
      });
      map.addLayer({
        id: "curve-etichette",
        type: "symbol",
        source: "curve",
        layout: {
          "symbol-placement": "line",
          "text-field": ["concat", ["to-string", ["get", "quota"]], " m"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10.5,
          "symbol-spacing": 220,
        },
        paint: { "text-color": "#7c2d12", "text-halo-color": "#ffffff", "text-halo-width": 1.4 },
      });

      // 3) Area pilota (Lombardia): maschera esterna e confine
      try {
        const area = await caricaAreaPilota();
        map.addSource("area-pilota", { type: "geojson", data: area });
        map.addSource("maschera", { type: "geojson", data: creaMaschera(area) });
        map.addLayer({
          id: "maschera",
          type: "fill",
          source: "maschera",
          paint: { "fill-color": "#0f172a", "fill-opacity": 0.28 },
        });
        map.addLayer({
          id: "confine-area-pilota",
          type: "line",
          source: "area-pilota",
          paint: { "line-color": "#10b981", "line-width": 2.2, "line-opacity": 0.9 },
        });
      } catch (errore) {
        console.warn("Confine area pilota non caricato", errore);
      }

      // 4) Strumenti di disegno
      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [
          new TerraDrawPolygonMode({
            validation: (feature, { updateType }) => {
              if (updateType === "finish" || updateType === "commit") {
                const esito = ValidateNotSelfIntersecting(feature);
                if (!esito.valid) setAvvisoDisegno("I lati del lotto non possono incrociarsi.");
                return esito;
              }
              return { valid: true };
            },
            styles: {
              fillColor: COLORE_TERRENO,
              fillOpacity: 0.12,
              outlineColor: COLORE_BORDO,
              outlineWidth: 2.5,
              closingPointColor: "#ffffff",
              closingPointOutlineColor: COLORE_BORDO,
              closingPointWidth: 6,
              closingPointOutlineWidth: 2,
            },
          }),
          new TerraDrawLineStringMode({
            styles: {
              lineStringColor: COLORE_PROFILO,
              lineStringWidth: 3.5,
              closingPointColor: "#ffffff",
              closingPointOutlineColor: COLORE_PROFILO,
              closingPointWidth: 6,
              closingPointOutlineWidth: 2,
            },
          }),
          new TerraDrawSelectMode({
            flags: {
              polygon: {
                feature: { draggable: false, coordinates: { midpoints: true, draggable: true, deletable: true } },
              },
              linestring: {
                feature: { draggable: false, coordinates: { midpoints: true, draggable: true, deletable: true } },
              },
            },
            validation: (feature) =>
              feature.geometry.type === "Polygon" ? ValidateNotSelfIntersecting(feature) : { valid: true },
            styles: {
              selectedPolygonColor: COLORE_TERRENO,
              selectedPolygonFillOpacity: 0.14,
              selectedPolygonOutlineColor: COLORE_BORDO,
              selectedPolygonOutlineWidth: 3,
              selectedLineStringColor: COLORE_PROFILO,
              selectedLineStringWidth: 4,
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

      // Solo geometrie completate: quelle ancora in costruzione hanno "currentlyDrawing".
      const elementi = (tipo: "Polygon" | "LineString", modo: "polygon" | "linestring") =>
        draw
          .getSnapshot()
          .filter((f) => f.geometry.type === tipo && f.properties.mode === modo && !f.properties.currentlyDrawing);

      let ultimoPoligono = "";
      let ultimaLinea = "";
      const comunica = () => {
        const [poligono] = elementi("Polygon", "polygon");
        const [linea] = elementi("LineString", "linestring");
        const jsonPoligono = poligono ? JSON.stringify(poligono.geometry) : "";
        const jsonLinea = linea ? JSON.stringify(linea.geometry) : "";
        if (jsonPoligono !== ultimoPoligono) {
          ultimoPoligono = jsonPoligono;
          cb.current.onGeometria(poligono ? (poligono.geometry as GeoJsonPolygon) : null);
        }
        if (jsonLinea !== ultimaLinea) {
          ultimaLinea = jsonLinea;
          cb.current.onLinea?.(linea ? (linea.geometry as GeoJsonLineString) : null);
        }
      };
      (map as unknown as { __comunica: () => void }).__comunica = comunica;

      draw.on("finish", (id, contesto) => {
        if (contesto.mode !== "polygon" && contesto.mode !== "linestring") return;
        const [tipo, modo] =
          contesto.mode === "polygon" ? (["Polygon", "polygon"] as const) : (["LineString", "linestring"] as const);
        const altri = elementi(tipo, modo)
          .map((f) => f.id)
          .filter((x): x is string | number => x !== undefined && x !== id);
        if (altri.length) draw.removeFeatures(altri);
        setAvvisoDisegno(null);
        comunica();
        // Passa subito alla modifica, così i vertici sono trascinabili.
        draw.setMode("select");
        draw.selectFeature(id);
        cb.current.onStrumento?.("modifica");
      });

      draw.on("change", (_ids, tipo) => {
        if (draw.getMode() !== "select" || tipo === "styling") return;
        clearTimeout(debounce);
        debounce = setTimeout(comunica, 250);
      });

      applicaMappaBase(map, stato.current.mappaBase);
      applicaOrdine(map, stato.current.ordine);
      setPronta(true);

      if (iniziale.current) {
        const esiti = draw.addFeatures([
          { type: "Feature", geometry: iniziale.current, properties: { mode: "polygon" } },
        ]);
        if (esiti.every((e) => e.valid)) {
          const anello = iniziale.current.coordinates[0];
          const lon = anello.map((c) => c[0]);
          const lat = anello.map((c) => c[1]);
          map.fitBounds([Math.min(...lon), Math.min(...lat), Math.max(...lon), Math.max(...lat)], {
            padding: 80,
            duration: 0,
          });
          comunica();
        }
      }
    });

    return () => {
      clearTimeout(debounce);
      disegno.current?.stop();
      disegno.current = null;
      map.remove();
      mappa.current = null;
    };
  }, []);

  // Strumento scelto nel pannello -> modalità di Terra Draw
  useEffect(() => {
    const draw = disegno.current;
    const map = mappa.current;
    if (!pronta || !draw || !map) return;
    const modo = MODO_TERRA_DRAW[strumento];
    if (draw.getMode() !== modo) draw.setMode(modo);
    map.getCanvas().style.cursor = strumento === "quota" ? "crosshair" : "";
    setAvvisoDisegno(null);
  }, [strumento, pronta]);

  // Elimina lotto e linea
  useEffect(() => {
    const draw = disegno.current;
    if (!pronta || !draw || versioneElimina === 0) return;
    draw.clear();
    draw.setMode("static");
    (mappa.current as unknown as { __comunica?: () => void })?.__comunica?.();
    cb.current.onGeometria(null);
    cb.current.onLinea?.(null);
  }, [versioneElimina, pronta]);

  useEffect(() => {
    if (pronta && mappa.current) applicaMappaBase(mappa.current, mappaBase);
  }, [mappaBase, pronta]);

  // Analisi del lotto (immagine georeferenziata)
  useEffect(() => {
    const map = mappa.current;
    if (!map || !pronta) return;
    if (map.getLayer("mappa-tematica")) map.removeLayer("mappa-tematica");
    if (map.getSource("mappa-tematica")) map.removeSource("mappa-tematica");
    if (!sovrapposizione) return;
    const [a, b, c, d] = sovrapposizione.coordinate;
    map.addSource("mappa-tematica", {
      type: "image",
      url: `data:image/png;base64,${sovrapposizione.pngBase64}`,
      coordinates: [a, b, c, d],
    });
    map.addLayer({
      id: "mappa-tematica",
      type: "raster",
      source: "mappa-tematica",
      // "nearest": ogni cella del DTM resta un quadrato netto, senza sfumature inventate.
      paint: { "raster-opacity": opacita, "raster-resampling": "nearest", "raster-fade-duration": 0 },
    });
    applicaOrdine(map, stato.current.ordine);
    // L'opacità è gestita dall'effetto dedicato: non ricreare l'immagine a ogni spostamento del cursore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sovrapposizione, pronta]);

  useEffect(() => {
    const map = mappa.current;
    if (map && pronta && map.getLayer("mappa-tematica")) map.setPaintProperty("mappa-tematica", "raster-opacity", opacita);
  }, [opacita, pronta]);

  // Curve di livello
  useEffect(() => {
    const map = mappa.current;
    if (!map || !pronta) return;
    (map.getSource("curve") as maplibregl.GeoJSONSource | undefined)?.setData(curve ?? VUOTO);
  }, [curve, pronta]);

  // Confine area pilota e ordine dei livelli
  useEffect(() => {
    const map = mappa.current;
    if (!map || !pronta) return;
    for (const id of LAYER_MAPLIBRE.confine) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", confineVisibile ? "visible" : "none");
    }
  }, [confineVisibile, pronta]);

  useEffect(() => {
    if (pronta && mappa.current) applicaOrdine(mappa.current, ordine);
  }, [ordine, pronta]);

  // Indicatori dei punti di quota minima e massima
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

  // Quota di un punto cliccato
  useEffect(() => {
    const map = mappa.current;
    if (!map || !quotaPunto) return;
    const el = document.createElement("div");
    el.className = "marcatore-punto";
    el.innerHTML = `<span class="marcatore-punto__testo"></span>`;
    (el.firstChild as HTMLElement).textContent = quotaPunto.testo;
    const m = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([quotaPunto.lon, quotaPunto.lat]).addTo(map);
    return () => {
      m.remove();
    };
  }, [quotaPunto]);

  // Punto del profilo evidenziato nel grafico
  useEffect(() => {
    const map = mappa.current;
    if (!map || !puntoProfilo) return;
    const el = document.createElement("div");
    el.className = "marcatore-profilo";
    const marcatore = new maplibregl.Marker({ element: el }).setLngLat([puntoProfilo.lon, puntoProfilo.lat]).addTo(map);
    return () => {
      marcatore.remove();
    };
  }, [puntoProfilo]);

  // Sposta la mappa sulla località cercata
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

  const suggerimenti: Partial<Record<Strumento, string>> = {
    poligono: "Clicca i vertici del lotto; chiudi cliccando sul primo vertice. Esc annulla.",
    linea: "Clicca i punti della linea A-B; termina cliccando di nuovo sull'ultimo punto o con Invio.",
    quota: "Clicca un punto della mappa per leggerne la quota dal DTM.",
    modifica: "Trascina i vertici; clicca i punti intermedi per aggiungerne, clic destro per eliminarli.",
  };

  return (
    <div className="mappa">
      <div ref={contenitore} className="mappa__canvas" data-testid="mappa" />
      {(avvisoDisegno || suggerimenti[strumento]) && (
        <div className={`suggerimento ${avvisoDisegno ? "suggerimento--avviso" : ""}`} role={avvisoDisegno ? "alert" : "status"}>
          {avvisoDisegno ?? suggerimenti[strumento]}
        </div>
      )}
      {erroreMappa && <div className="mappa__errore">{erroreMappa}</div>}
    </div>
  );
}
