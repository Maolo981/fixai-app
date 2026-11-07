# TerraScan Italia – Analisi del repository e piano verso la piattaforma SaaS

Data: 7 novembre 2026. Ramo `terrascan-italia`, cartella `terrascan-italia/`.

## 1. Cosa esiste e funziona (verificato con test e browser)

| Area | Stato | Dove |
|---|---|---|
| Ricerca località / indirizzo / coordinate | ✅ Nominatim via backend (cache, 1 req/s), coordinate riconosciute nel client | `backend/app/services/geocodifica.py`, `frontend/src/components/BarraRicerca.tsx`, `frontend/src/lib/coordinate.ts` |
| Disegno e modifica lotto e linea A-B | ✅ Terra Draw (poligono, linea, selezione/modifica) | `frontend/src/components/MappaTerreno.tsx` |
| Superficie e perimetro geodetici | ✅ Karney/pyproj + controllo UTM 32N, validazione geometrie | `backend/app/services/geometria.py` |
| DTM 5×5 Regione Lombardia | ✅ scaricato, convertito in GeoTIFF a blocchi compresso senza perdita, verificato cella per cella e contro il WMS ufficiale | `backend/scripts/prepara_dtm.py`, `docs/dati-dtm-lombardia.md` |
| Statistiche altimetriche, pendenza (Horn), esposizione | ✅ ritaglio per finestra, NoData, celle al bordo | `backend/app/services/altimetria.py` |
| Mappe tematiche pendenza/esposizione (PNG georeferenziato) | ✅ | `backend/app/services/mappe.py` |
| Profilo A-B (bilineare, distanze geodetiche) | ✅ | `backend/app/services/profilo.py`, `GraficoProfilo.tsx` |
| Report PDF | ✅ ReportLab, ricalcolo lato server | `backend/app/services/report.py` |
| Test | ✅ 91 backend (9 su DTM reale), 40 frontend | `backend/tests`, `frontend/src/**/*.test.ts(x)` |

## 2. Differenze rispetto ai nuovi requisiti

| Requisito | Stato iniziale | Intervento |
|---|---|---|
| Landing page premium | assente | nuova pagina `/` (React, nessuna nuova dipendenza) |
| App GIS full-screen a pannelli collassabili, bottom-sheet su mobile | layout a pannello unico | nuovo layout `/app` riusando i componenti esistenti |
| Mappa satellitare / stradale / topografica | solo stradale (OpenFreeMap) | ortofoto AGEA 2015 e CTR dai servizi di Regione Lombardia (vedi §4) |
| Gestione layer (interruttori, legenda, opacità, ordine) | solo scelta pendenza/esposizione | pannello Livelli |
| Distanza | solo come lunghezza del profilo (richiede DTM) | lunghezza geodetica della linea sempre disponibile |
| Elevation Insights: gradiente altimetrico ritagliato, legenda min/max, opacità | assente (solo classi pendenza/esposizione) | nuovo tipo di mappa `quota` |
| Curve di livello configurabili con intervalli compatibili col dato | assente | nuovo servizio `curve.py` (contourpy) |
| Quota di un punto cliccato | assente | nuovo endpoint `/api/v1/quota` |
| Pendenze dei tratti del profilo | solo pendenza massima su passo 5 m | tratti tra i vertici della linea |
| 3D (raster-dem) | assente | ✅ tessere Terrarium dal DTM, vista 3D e ombreggiatura |
| Vincoli PAI/PGRA/paesaggistici | assente | Fase successiva: registro fonti + "Non verificabile" |
| PDF con ortofoto e overlay altimetrico | parziale | Fase successiva |
| Account, progetti, abbonamenti | assente | Fase successiva (solo architettura) |

## 3. Piano di implementazione (in ordine)

1. **Fondamenta + Elevation Insights 2D** (questa iterazione)
   - backend: `mappe.py` (tipo `quota`), `curve.py` (curve di livello), `rotte.py` (`/quota`, `/analisi/curve`), `profilo.py` (tratti, lunghezza senza DTM);
   - frontend: `Landing.tsx`, layout `/app` con `PannelloStrumenti`, `PannelloLivelli`, pannello destro a schede; `MappaTerreno.tsx` esteso con mappe di base, livelli ordinabili, curve, quota puntuale.
2. **3D** ✅ realizzato (8/11/2026): endpoint `/api/v1/tessere/dem/{z}/{x}/{y}.png` (Terrarium, zoom 8–16, cache LRU e
   `Cache-Control`), piramidi nel GeoTIFF (`scripts/aggiungi_piramidi.py`, valori a piena risoluzione verificati
   invariati), terreno 3D e ombreggiatura in MapLibre, esagerazione solo visiva e dichiarata, ripristino vista.
   Fuori dalla Lombardia le tessere valgono 0 m (nessun dato) e l'interfaccia lo dichiara.
3. **Vincoli territoriali**: registro delle fonti (`backend/app/services/vincoli/`), adattatori WMS/WFS/REST per PGRA (servizio `direttiva_alluvioni_2015_wms` già individuato), PAI e vincoli paesaggistici; esito "Non verificabile" quando il dato manca.
4. **Report PDF**: ortofoto con confine, overlay altimetrico e curve, vincoli verificati, elenco fonti con data e risoluzione.
5. **Commerciale**: persistenza (progetti, cronologia), autenticazione e ruoli, confronto lotti; pagamenti solo dopo.

## 4. Fonti per le mappe di base (verifica del 7/11/2026)

| Mappa | Servizio | Esito della verifica |
|---|---|---|
| Satellitare | Regione Lombardia, `BaseMap/ortofoto2015_extra_rl_wm` (MapServer a tessere Web Mercator, fino al livello 19) | ✅ funzionante (circa 0,6 s a tessera), CORS consentito. Ortofoto **AGEA 2015**, rilievo giugno–settembre 2015, GSD 25 cm (45 cm in zona alpina). **Licenza non dichiarata nel servizio**: da confermare con Regione Lombardia (sit_rl@regione.lombardia.it) prima dell'uso commerciale. |
| Satellitare (più recente) | `BaseMap/Ortofoto2021` (ImageServer AGEA 2021, 20 cm) | ❌ al momento della verifica `exportImage` e `GetMap` restituiscono errore o immagine vuota: non utilizzabile. Da riprovare. |
| Stradale | OpenFreeMap (stile Liberty, dati OpenStreetMap) | ✅ già in uso, gratuito con attribuzione. |
| Topografica | Regione Lombardia, `BaseMap/CTR_DBT_WM` (Carta Tecnica Regionale da DBT, Web Mercator, export dinamico) | ✅ funzionante (circa 1 s a tessera). **Licenza non dichiarata nel servizio**: da confermare come sopra. |

Le immagini di questi servizi sono usate **solo come sfondo visivo**: nessun calcolo numerico usa colori o immagini WMS. Tutti i calcoli usano il raster DTM scaricato e verificato.
