# Proposta – Fase 2: integrazione dei dati altimetrici reali

## Obiettivo

Per il terreno disegnato, calcolare con il **DTM 5×5 di Regione Lombardia** (ed. 2015):

- quota minima, quota massima e quota media;
- dislivello (massima − minima);
- pendenza media e massima (in gradi e in percentuale) e distribuzione per classi di pendenza;
- percentuale del terreno coperta da dati validi.

Se il terreno è fuori dalla Lombardia, troppo piccolo o coperto da celle senza dati, il pannello continua a mostrare
**"Dati altimetrici non disponibili"**, con il motivo.

Restano fuori dalla Fase 2 (proposte come fasi successive): mappa colorata delle pendenze e profilo altimetrico
(Fase 3), report PDF (Fase 4).

## Passaggi proposti

### 2.1 – Acquisizione e controllo del dato (prima di scrivere codice di calcolo)

1. Abilitare nell'ambiente di sviluppo l'host `www.cartografia.servizirl.it`.
2. Scaricare `DTM5_RL.zip`, registrare dimensione e impronta SHA-256.
3. Ispezionare il file con `rasterio`/GDAL e completare la lista "da verificare" in
   [dati-dtm-lombardia.md](dati-dtm-lombardia.md) (formato, EPSG, cella, nodata, tipo numerico, datum verticale).
4. Convertire il dato, **senza ricampionarlo né riproiettarlo**, in un unico **Cloud Optimized GeoTIFF**
   (compressione senza perdita, tile interne, panoramiche): permette di leggere solo la piccola porzione
   necessaria per ogni terreno, in pochi millisecondi.
   Script ripetibile: `backend/scripts/prepara_dtm.py`.

Stima da confermare sul file: ~23.900 km² / 25 m² ≈ 955 milioni di celle → circa 3,8 GB non compressi in
virgola mobile a 32 bit, presumibilmente 1-2 GB compressi. Il file **non** va nel repository Git: va su un disco
del server o su uno storage di oggetti.

### 2.2 – Servizio di analisi altimetrica (backend)

- Nuovo modulo `app/services/altimetria.py` (Python, `rasterio` + `numpy`).
- Il poligono viene convertito in UTM 32N (EPSG:32632, lo stesso sistema del DTM).
- Viene letta solo la finestra del raster che contiene il terreno, con una cella di margine.
- **Quote:** statistiche sulle celle il cui centro cade dentro il perimetro, escludendo i "nodata".
- **Pendenza:** metodo di Horn (lo stesso di GDAL/QGIS) sulla griglia a 5 m, calcolato prima del ritaglio per
  non falsare i bordi.
- Nella risposta: fonte, edizione, licenza, numero di celle usate, copertura e precisione dichiarata (0,3-2 m),
  oltre all'avvertenza che si tratta di analisi preliminari.
- Endpoint: il campo `altimetria` della risposta attuale passa da "non disponibile" a valori reali, e `/capacita`
  dichiara la funzione come implementata solo se il file DTM è effettivamente presente e leggibile.

### 2.3 – Test

- **Raster sintetici con risultato noto in modo esatto:** piano inclinato `z = a·x + b·y` (pendenza nota per via
  analitica), terreno piatto (pendenza zero), gradino (quota minima e massima note), celle nodata.
- Poligoni a cavallo del bordo del DTM, fuori copertura, più piccoli di una cella.
- Controllo che sistema di riferimento e dimensione della cella del file siano quelli attesi (il servizio si rifiuta
  di calcolare se non lo sono).
- **Verifica su dati reali:** confronto a campione delle quote con punti quotati noti e, se il WMS lo consente, con i
  valori di cella pubblicati dalla Regione (`GetFeatureInfo`).

### 2.4 – Interfaccia

- La scheda "Analisi altimetrica" mostra i valori reali, la fonte del dato, la copertura e la precisione dichiarata
  per la zona.
- Messaggi chiari quando il dato non è disponibile (fuori regione, terreno troppo piccolo, celle mancanti).

## Terreni agricoli

La Fase 1 funziona già anche per i terreni agricoli: superficie in m², ettari e nel formato catastale
ettari / are / centiare. Con lo stesso DTM della Fase 2 si possono ricavare informazioni utili per l'agricoltura
**senza aggiungere altre fonti di dati**:

- **classi di pendenza** con soglie configurabili (per esempio per valutare la meccanizzazione o il rischio di
  erosione). Le soglie le scegliamo insieme a un agronomo o in base ai disciplinari di riferimento: non le invento;
- **esposizione** (verso quale punto cardinale è rivolto il versante): importante per vigneti, frutteti e
  coltivazioni in collina e montagna. Si calcola dal DTM come la pendenza; è un'aggiunta piccola che possiamo
  includere nella Fase 2, se sei d'accordo.

Più avanti si potrebbero integrare altri dati regionali, da verificare con lo stesso metodo usato per il DTM
(formato, accesso, licenza, aggiornamento): uso del suolo, carta dei suoli e particelle catastali.

## Decisioni che spettano a te

1. **Dove ospitare il DTM** (1-2 GB stimati): sul tuo computer per lo sviluppo; per la messa online, un server
   o uno storage di oggetti (es. un bucket S3 compatibile). Possiamo decidere più avanti.
2. **Ambito della Fase 2:** confermi che mappa delle pendenze e profilo altimetrico vadano nella Fase 3? Vuoi includere subito l'esposizione dei versanti per i terreni agricoli?
3. **Rete dell'ambiente di sviluppo:** autorizzare l'host `www.cartografia.servizirl.it` per scaricare il DTM.
