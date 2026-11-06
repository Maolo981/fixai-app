"""Scarica e prepara il DTM 5x5 di Regione Lombardia (ed. 2015) per TerraScan Italia.

Passaggi (ripetibili; i passaggi già completati vengono saltati):
1. scarica l'archivio ufficiale DTM5_RL.zip (circa 3,1 GB), riprendendo un download interrotto;
2. ne calcola l'impronta SHA-256;
3. estrae il raster in formato ERDAS IMAGINE (DTM5_RL.img + DTM5_RL.ige, circa 8,3 GB);
4. controlla sistema di riferimento, dimensione cella, dimensioni e tipo di dato;
5. lo converte in un GeoTIFF a blocchi compresso SENZA PERDITA (nessun ricampionamento
   né riproiezione: i valori restano identici, cella per cella);
6. confronta a campione (o integralmente con --verifica-completa) i valori dei due file;
7. scrive un file .json con la provenienza del dato.

Uso (dalla cartella backend):
    uv run python scripts/prepara_dtm.py
    uv run python scripts/prepara_dtm.py --zip /percorso/DTM5_RL.zip   # archivio già scaricato

Spazio su disco necessario durante la preparazione: circa 15 GB; al termine si possono
cancellare l'archivio e i file estratti (opzione --pulisci) e restano circa 3-4 GB.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import rasterio
import rasterio.shutil
from rasterio.windows import Window

URL_DTM = "https://www.cartografia.servizirl.it/download/DTM5_RL.zip"
METADATI_UFFICIALI = (
    "https://geodati.gov.it/geoportale/visualizzazione-metadati/scheda-metadati"
    "?metadataid=r_lombar%3Adfc98d60-5f02-4a2b-8113-5ad24cc53a9c"
)
CARTELLA_BACKEND = Path(__file__).resolve().parents[1]
CARTELLA_DTM = CARTELLA_BACKEND / "dati-dtm"
FILE_FINALE = CARTELLA_DTM / "dtm5_lombardia_2015.tif"

# Caratteristiche attese, verificate sul file ufficiale il 6/11/2026.
ATTESO = {"epsg": 32632, "risoluzione": 5.0, "larghezza": 46533, "altezza": 44400, "dtype": "float32"}


def scarica(destinazione: Path) -> None:
    destinazione.parent.mkdir(parents=True, exist_ok=True)
    richiesta = urllib.request.Request(URL_DTM, method="HEAD")
    with urllib.request.urlopen(richiesta, timeout=60) as r:
        totale = int(r.headers["Content-Length"])
    gia = destinazione.stat().st_size if destinazione.exists() else 0
    if gia == totale:
        print(f"Archivio già scaricato ({totale / 1e9:.2f} GB).")
        return
    print(f"Scaricamento di {totale / 1e9:.2f} GB da {URL_DTM} (ripresa da {gia / 1e9:.2f} GB)…")
    richiesta = urllib.request.Request(URL_DTM, headers={"Range": f"bytes={gia}-"})
    inizio = time.monotonic()
    with urllib.request.urlopen(richiesta, timeout=120) as r, open(destinazione, "ab") as f:
        while blocco := r.read(4 << 20):
            f.write(blocco)
            gia += len(blocco)
            velocita = (gia / 1e6) / max(time.monotonic() - inizio, 1e-3)
            print(f"\r  {gia / totale * 100:5.1f}%  {velocita:5.1f} MB/s", end="", flush=True)
    print()
    if destinazione.stat().st_size != totale:
        raise SystemExit("Scaricamento incompleto: rilanciare lo script per riprenderlo.")


def sha256(percorso: Path) -> str:
    h = hashlib.sha256()
    with open(percorso, "rb") as f:
        while blocco := f.read(16 << 20):
            h.update(blocco)
    return h.hexdigest()


def estrai(archivio: Path, cartella: Path) -> Path:
    img = cartella / "DTM5_RL.img"
    with zipfile.ZipFile(archivio) as z:
        for nome in ("DTM5_RL.img", "DTM5_RL.ige"):
            info = z.getinfo(nome)
            uscita = cartella / nome
            if uscita.exists() and uscita.stat().st_size == info.file_size:
                print(f"{nome} già estratto.")
                continue
            print(f"Estrazione di {nome} ({info.file_size / 1e9:.2f} GB)…")
            z.extract(info, cartella)  # zipfile verifica anche il CRC32
    return img


def controlla(percorso: Path) -> dict:
    with rasterio.open(percorso) as ds:
        trovato = {
            "epsg": ds.crs.to_epsg() if ds.crs else None,
            "risoluzione": ds.res[0],
            "larghezza": ds.width,
            "altezza": ds.height,
            "dtype": ds.dtypes[0],
        }
        info = {
            **trovato,
            "nodata": ds.nodata,
            "bounds": list(ds.bounds),
            "transform": list(ds.transform)[:6],
            "driver": ds.driver,
        }
    differenze = {k: (v, trovato[k]) for k, v in ATTESO.items() if trovato[k] != v}
    if differenze:
        raise SystemExit(f"Il file non ha le caratteristiche attese (atteso, trovato): {differenze}")
    print(f"Controllo superato: {info}")
    return info


def converti(sorgente: Path, destinazione: Path) -> None:
    destinazione.parent.mkdir(parents=True, exist_ok=True)
    print(f"Conversione in GeoTIFF compresso senza perdita: {destinazione}…")
    inizio = time.monotonic()
    temporaneo = destinazione.with_suffix(".tmp.tif")
    with rasterio.Env(GDAL_CACHEMAX=1024, GDAL_NUM_THREADS="ALL_CPUS"):
        rasterio.shutil.copy(
            sorgente,
            temporaneo,
            driver="GTiff",
            TILED="YES",
            BLOCKXSIZE=512,
            BLOCKYSIZE=512,
            COMPRESS="DEFLATE",
            PREDICTOR=3,  # predittore per numeri in virgola mobile
            ZLEVEL=6,
            BIGTIFF="YES",
            NUM_THREADS="ALL_CPUS",
        )
    temporaneo.replace(destinazione)
    print(f"  completata in {time.monotonic() - inizio:.0f} s, {destinazione.stat().st_size / 1e9:.2f} GB")


def verifica(originale: Path, convertito: Path, completa: bool, campioni: int = 300) -> int:
    """Confronta i valori dei due raster; restituisce il numero di celle confrontate."""
    confrontate = 0
    with rasterio.open(originale) as a, rasterio.open(convertito) as b:
        if (a.crs, a.transform, a.width, a.height, a.nodata) != (b.crs, b.transform, b.width, b.height, b.nodata):
            raise SystemExit("Georeferenziazione o nodata diversi dopo la conversione.")
        if completa:
            finestre = [Window(0, r, a.width, min(512, a.height - r)) for r in range(0, a.height, 512)]
        else:
            rng = np.random.default_rng(2015)
            finestre = [
                Window(int(rng.integers(0, a.width - 512)), int(rng.integers(0, a.height - 512)), 512, 512)
                for _ in range(campioni)
            ]
        for i, w in enumerate(finestre, 1):
            va, vb = a.read(1, window=w), b.read(1, window=w)
            if not np.array_equal(va, vb, equal_nan=True):
                raise SystemExit(f"Valori diversi nella finestra {w}: conversione NON valida.")
            confrontate += va.size
            print(f"\r  verifica {i}/{len(finestre)}", end="", flush=True)
    print(f"\n  {confrontate:,} celle identiche.")
    return confrontate


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--zip", type=Path, help="archivio DTM5_RL.zip già scaricato")
    parser.add_argument("--lavoro", type=Path, default=CARTELLA_DTM / "originale", help="cartella di lavoro")
    parser.add_argument("--verifica-completa", action="store_true", help="confronta tutte le celle (lento)")
    parser.add_argument("--pulisci", action="store_true", help="al termine cancella archivio e file estratti")
    args = parser.parse_args()

    args.lavoro.mkdir(parents=True, exist_ok=True)
    archivio = args.zip or args.lavoro / "DTM5_RL.zip"
    if not args.zip:
        scarica(archivio)
    print("Calcolo dell'impronta SHA-256…")
    impronta = sha256(archivio)
    print(f"  {impronta}")

    img = estrai(archivio, args.lavoro)
    info = controlla(img)
    converti(img, FILE_FINALE)
    celle = verifica(img, FILE_FINALE, args.verifica_completa)

    provenienza = {
        "dataset": "DTM 5X5 - Modello digitale del terreno (ed. 2015)",
        "proprietario": "Regione Lombardia",
        "licenza": "CC BY 4.0",
        "metadati_ufficiali": METADATI_UFFICIALI,
        "url_download": URL_DTM,
        "archivio_sha256": impronta,
        "archivio_byte": archivio.stat().st_size,
        "formato_originale": "ERDAS IMAGINE (.img + .ige)",
        "caratteristiche": info,
        "conversione": "GeoTIFF a blocchi 512x512, DEFLATE + PREDICTOR=3, senza ricampionamento",
        "celle_verificate_identiche": celle,
        "verifica_completa": args.verifica_completa,
        "preparato_il": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    FILE_FINALE.with_suffix(".json").write_text(json.dumps(provenienza, indent=2, ensure_ascii=False), "utf-8")
    print(f"Provenienza scritta in {FILE_FINALE.with_suffix('.json')}")

    if args.pulisci:
        for nome in ("DTM5_RL.img", "DTM5_RL.ige"):
            (args.lavoro / nome).unlink(missing_ok=True)
        if not args.zip:
            archivio.unlink(missing_ok=True)
        print("File temporanei cancellati.")
    print(f"\nDTM pronto: {FILE_FINALE}\nRiavvia il backend per attivare l'analisi altimetrica.")


if __name__ == "__main__":
    sys.exit(main())
