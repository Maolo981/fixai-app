# Proposta – Fase 4: report PDF professionale

## Obiettivo

Un pulsante **"Scarica report PDF"** che produce un documento pronto da allegare a una pratica o da consegnare a
un cliente, con **solo i risultati realmente calcolati** (le sezioni non disponibili sono dichiarate come tali).

## Contenuto proposto (A4, 3-5 pagine)

1. **Intestazione**: TerraScan Italia, data e ora, codice univoco del report, eventuale riferimento inserito
   dall'utente (committente, località, foglio/particella scritti a mano: non verificati).
2. **Inquadramento**: mappa del terreno con perimetro, scala grafica e freccia del Nord; coordinate del centroide.
3. **Misure**: superficie (m², ettari, formato catastale ha/are/ca), perimetro, vertici con coordinate.
4. **Altimetria**: quote minima/massima/media, dislivello, pendenza media e massima, classi di pendenza,
   esposizione con rosa dei venti.
5. **Mappe**: mappa delle pendenze e delle esposizioni con legenda.
6. **Profilo altimetrico** (se tracciato): grafico e dati.
7. **Fonti, metodi e limiti**: DTM 5×5 Regione Lombardia ed. 2015 (CC BY 4.0) con accuratezza dichiarata,
   metodi di calcolo, verifiche eseguite, **avvertenza** che le analisi sono preliminari e non sostituiscono un
   rilievo tecnico certificato.

## Come

- Generazione **lato server** (Python) a partire dagli stessi risultati dell'API, così il PDF è riproducibile.
- Libreria proposta: **WeasyPrint** (HTML + CSS → PDF): impaginazione curata con lo stesso stile dell'app.
  Alternativa più leggera da installare: **ReportLab**. Da valutare la facilità di installazione su Windows.
- Mappa nel PDF: immagine statica generata dal server (perimetro e celle del DTM), senza dipendere dalle tile
  del browser.
- Test: il PDF contiene i numeri attesi (estrazione del testo), le sezioni non disponibili riportano
  "Dati altimetrici non disponibili", e l'avvertenza è sempre presente.

## Decisioni che spettano a te

1. Logo e dati aziendali da mettere in intestazione (per ora "TerraScan Italia").
2. Campi liberi da far compilare all'utente prima del download (committente, riferimento pratica, note).
3. WeasyPrint (resa migliore) o ReportLab (installazione più semplice).
