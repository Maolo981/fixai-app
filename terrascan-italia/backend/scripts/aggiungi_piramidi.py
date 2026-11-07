"""Aggiunge al DTM le piramidi (overview) usate dalla vista 3D a zoom bassi.

Le piramidi sono copie a risoluzione ridotta (media delle celle) salvate dentro lo
stesso GeoTIFF: NON modificano i valori della banda a piena risoluzione, che resta
quella verificata e usata per tutti i calcoli.

Uso (dalla cartella backend):
    uv run python scripts/aggiungi_piramidi.py
"""

from __future__ import annotations

import hashlib
import sys
import time
from pathlib import Path

import rasterio
from rasterio.enums import Resampling

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import impostazioni  # noqa: E402

LIVELLI = [2, 4, 8, 16, 32, 64]


def impronta_campione(percorso: Path) -> str:
    """Impronta di alcune finestre a piena risoluzione, per verificare che restino identiche."""
    h = hashlib.sha256()
    with rasterio.open(percorso) as ds:
        for col, riga in ((11000, 26472), (20000, 20000), (30000, 10000), (5000, 35000)):
            h.update(ds.read(1, window=((riga, riga + 512), (col, col + 512))).tobytes())
    return h.hexdigest()


def main() -> None:
    percorso = Path(impostazioni.percorso_dtm)
    with rasterio.open(percorso) as ds:
        if ds.overviews(1):
            print(f"Piramidi già presenti: {ds.overviews(1)}")
            return
    prima = impronta_campione(percorso)
    inizio = time.monotonic()
    with rasterio.Env(COMPRESS_OVERVIEW="DEFLATE", PREDICTOR_OVERVIEW=3, GDAL_NUM_THREADS="ALL_CPUS"):
        with rasterio.open(percorso, "r+") as ds:
            ds.build_overviews(LIVELLI, Resampling.average)
            ds.update_tags(ns="rio_overview", resampling="average")
    dopo = impronta_campione(percorso)
    if prima != dopo:
        raise SystemExit("ATTENZIONE: i valori a piena risoluzione sono cambiati!")
    print(f"Piramidi {LIVELLI} create in {time.monotonic() - inizio:.0f} s; valori originali invariati.")


if __name__ == "__main__":
    main()
