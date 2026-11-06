# Verifica del dataset "DTM 5X5 – Modello digitale del terreno (ed. 2015)"

Data della verifica: 6 novembre 2026.

**Fonte primaria:** la scheda ufficiale dei metadati ISO 19115/RNDT, scaricata dal catalogo nazionale
(`https://geodati.gov.it/RNDT/csw`, `GetRecordById`, identificativo
`r_lombar:dfc98d60-5f02-4a2b-8113-5ad24cc53a9c`). Data di aggiornamento della scheda: 22/06/2026.

Ogni voce indica se il dato è **verificato** (letto nei metadati) o **da verificare** (non dichiarato, o
controllabile solo sul file scaricato).

## 1. Sintesi

| Voce | Valore | Stato |
|---|---|---|
| Titolo | DTM 5X5 – Modello digitale del terreno (ed. 2015) | Verificato |
| Proprietario | Regione Lombardia (sit_rl@regione.lombardia.it) | Verificato |
| Tipo di dato | Raster a griglia (`grid`), risoluzione 5 m × 5 m | Verificato (titolo e descrizione) |
| Sistema di riferimento | WGS84 / UTM fuso 32N – **EPSG:32632** | Verificato |
| Riferimento delle quote (datum verticale) | Non dichiarato nei metadati | **Da verificare** |
| Formato di distribuzione | Indicato solo come "grid / altro" | **Da verificare** sul file |
| Download | `https://www.cartografia.servizirl.it/download/DTM5_RL.zip` (un unico archivio regionale) | Verificato (link nei metadati) |
| Dimensione del file, valore "nessun dato" (nodata), tipo numerico | Non dichiarati | **Da verificare** sul file |
| Licenza | **Creative Commons Attribuzione 4.0 (CC BY 4.0)** | Verificato |
| Limitazioni di accesso | Nessuna limitazione al pubblico accesso | Verificato |
| Data di riferimento | Revisione 31/12/2015 (dati disponibili a luglio 2015) | Verificato |
| Frequenza di aggiornamento | "Quando necessario" (`asNeeded`) | Verificato |
| Copertura | Riquadro 8,15°–11,94° E, 44,48°–46,93° N (intera Lombardia) | Verificato |

## 2. Modalità di accesso: visualizzazione ≠ dati per i calcoli

| Servizio | Indirizzo | Restituisce le quote numeriche? |
|---|---|---|
| **WMS** (servizio di consultazione) | `https://www.cartografia.servizirl.it/arcgis/services/wms/DTM5_RL_wms/MapServer/WmsServer?` | **No.** Restituisce *immagini* già colorate, adatte solo alla visualizzazione. I colori non sono quote e non possono essere usati per calcolare quota, dislivello o pendenza. |
| **Download ZIP** | `https://www.cartografia.servizirl.it/download/DTM5_RL.zip` | **Sì.** È l'unica fonte dichiarata dei valori altimetrici reali, cella per cella. |
| Visualizzatore web | `https://www.cartografia.servizirl.it/viewer41/map/2D?config=config_dtm5.json` | No, solo consultazione. |

Nei metadati **non è dichiarato alcun servizio WCS** o equivalente che fornisca i valori grezzi via rete.
Per la Fase 2 il dato va quindi **scaricato e ospitato dal nostro backend**.

> Possibile verifica indipendente (da controllare): se il WMS supporta `GetFeatureInfo`, potrebbe restituire
> il valore della cella in un punto ("pixel value"). Sarebbe utile per confrontare a campione le quote lette
> dal file con quelle pubblicate dalla Regione, ma non per i calcoli.

## 3. Come è stato prodotto (lineage) e precisione dichiarata

Dalla descrizione ufficiale:

- **circa l'80% del territorio** deriva dal **Database Topografico regionale (DBT)**: curve di livello
  (equidistanza 10 m), punti quotati, break line, scarpate, argini, viabilità, idrografia. Dai dati è stato
  costruito un modello TIN, poi convertito in griglia a 5 m.
- **rilievi LiDAR** a 1 m × 1 m **lungo le aste dei corsi d'acqua**;
- per **porzioni limitate** prive di altri dati: la precedente edizione del DTM regionale **20 m × 20 m**,
  derivata dalla Carta Tecnica Regionale 1:10.000 del **1982-1994**.

Accuratezza in quota dichiarata per le aree derivate dal DBT:

| Scala di rilievo del DBT | Tipo di area | Accuratezza in quota |
|---|---|---|
| 1:2.000 | aree urbanizzate | 0,30 m |
| 1:5.000 | aree extraurbane intensamente infrastrutturate | 1 m |
| 1:10.000 | aree extraurbane agricole e forestali | 2 m |

## 4. Limitazioni e punti di attenzione

1. **Laghi e invasi:** le quote sono riferite al **livello dell'acqua**, non al fondale.
2. **Precisione non uniforme:** da 0,30 m a 2 m secondo la zona, e peggiore dove è stato usato il vecchio DTM 20 m
   (dati 1982-1994). Nei metadati **non è fornita una mappa** che dica quale fonte è stata usata in ciascuna zona.
3. **Dati del 2015:** non riflettono scavi, riporti, cave o nuove costruzioni successive.
4. **Risoluzione 5 m:** una cella copre 25 m². Su terreni piccoli (es. sotto i 500 m², cioè meno di 20 celle)
   le statistiche sono poco significative; scarpate e muri di contenimento più stretti di 5 m non sono descritti.
5. **DTM, non DSM:** rappresenta il terreno nudo, senza edifici e vegetazione.
6. **Datum verticale non dichiarato:** le quote sono presumibilmente ortometriche (sul livello del mare), come la
   cartografia tecnica regionale, ma **va verificato** prima di dichiararlo nei report.
7. **Incongruenze nei metadati** (da segnalare, non bloccanti):
   - il campo "risoluzione spaziale" riporta `1.0` mentre titolo e descrizione indicano 5 m;
   - il dato è classificato nel tema INSPIRE "Orto immagini" invece di "Elevazione";
   - per la scala 1:10.000 l'accuratezza di 2 m è associata al "level 4", come per la scala 1:2.000 (probabile refuso).
   Faremo fede ai valori letti direttamente dal file scaricato.

## 5. Attribuzione obbligatoria (CC BY 4.0)

Testo proposto per l'interfaccia e per i report:

> Dati altimetrici: DTM 5×5 – Modello digitale del terreno (ed. 2015), © Regione Lombardia,
> licenza CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/legalcode.it). Dati elaborati da TerraScan Italia.

La licenza CC BY 4.0 consente anche l'uso commerciale, a condizione di citare la fonte e di indicare se i dati sono
stati modificati.

## 6. Cosa resta da verificare all'inizio della Fase 2

Non è stato possibile scaricare l'archivio in questa sessione (l'host `www.cartografia.servizirl.it` non era
abilitato nella rete dell'ambiente di sviluppo). Appena scaricato, va controllato e annotato qui:

- [ ] dimensione dell'archivio e impronta SHA-256 (per sapere se il file cambia nel tempo);
- [ ] formato effettivo (GeoTIFF, ASCII Grid, ESRI Grid…), numero di file, suddivisione in fogli;
- [ ] sistema di riferimento letto dal file (atteso EPSG:32632) e dimensione della cella (attesa 5 m);
- [ ] tipo numerico delle quote, unità di misura, valore "nodata";
- [ ] riferimento delle quote (datum verticale), eventualmente chiedendolo a sit_rl@regione.lombardia.it;
- [ ] confronto a campione con punti quotati noti.
