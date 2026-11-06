# Proposta – Fase 3: mappa delle pendenze e profilo altimetrico

> **Stato: realizzata** (6/11/2026). Mappe tematiche servite come immagine PNG georeferenziata (un pixel per
> cella), profilo con grafico SVG. Verificata su dati reali: profilo piatto a 198 m sul Lago di Como, versante
> vitato sopra Sondrio esposto a Sud per il 97% delle celle.

## Obiettivo

Visualizzare sul terreno disegnato i dati già calcolati nella Fase 2:

1. **Mappa delle pendenze**: le celle del DTM (5 × 5 m) dentro il perimetro, colorate per classe di pendenza
   (le stesse classi del pannello), sovrapposte alla mappa e con legenda.
2. **Mappa delle esposizioni** (facoltativa, utile per i terreni agricoli): le celle colorate per settore.
3. **Profilo altimetrico**: l'utente traccia una linea (es. lungo la massima pendenza o una strada di accesso) e
   ottiene il grafico quota/distanza, con pendenza di ogni tratto, lunghezza reale e dislivello positivo e negativo.

## Come

- Backend: endpoint che restituisce per il terreno un raster PNG georeferenziato (o le celle come GeoJSON) generato
  dalle stesse matrici della Fase 2: nessun nuovo calcolo, solo rappresentazione.
- Profilo: campionamento lungo la linea ogni 5 m (passo pari alla cella), interpolazione bilineare dichiarata;
  test con piani sintetici (profilo rettilineo atteso) e confronto con il WMS su punti reali.
- Frontend: livello sovrapposto in MapLibre con opacità regolabile; grafico del profilo leggero (SVG), senza
  librerie pesanti.

## Fuori dalla Fase 3

Report PDF (Fase 4), login, pagamenti, altre regioni.
