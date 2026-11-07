"""Tessere di elevazione (raster-dem, codifica Terrarium) generate dal DTM 5x5 per la vista 3D.

Uso esclusivamente VISIVO: il rilievo 3D e l'ombreggiatura in MapLibre. Nessun calcolo
tecnico usa queste tessere (i calcoli leggono il DTM a piena risoluzione in UTM 32N).

Metodo
------
* Per la tessera z/x/y in Web Mercator (EPSG:3857, 256 x 256 px) si calcola il riquadro
  corrispondente in UTM 32N e si legge solo quella finestra del DTM, alla risoluzione
  adatta (le piramidi del file evitano di leggere milioni di celle a zoom bassi).
* La finestra viene riproiettata in EPSG:3857 con interpolazione bilineare.
* Codifica Terrarium: quota = (R * 256 + G + B / 256) - 32768, risoluzione 1/256 m.
* Dove il DTM non ha dati (fuori dalla Lombardia) la quota è posta a 0 m: in quelle
  zone il 3D non rappresenta il terreno reale, e l'interfaccia lo dichiara.
"""

from __future__ import annotations

import math
import warnings
from collections import OrderedDict
from threading import Lock

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.errors import NotGeoreferencedWarning
from rasterio.io import MemoryFile
from rasterio.transform import from_bounds
from rasterio.warp import reproject, transform_bounds
from rasterio.windows import Window
from rasterio.windows import from_bounds as finestra_da_limiti

from app.services.altimetria import SorgenteDtm

DIMENSIONE = 256
ZOOM_MINIMO = 8
ZOOM_MASSIMO = 16
MEZZO_MONDO = 20037508.342789244  # metri, EPSG:3857


class TesseraNonValida(ValueError):
    pass


def limiti_tessera(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    """Limiti (ovest, sud, est, nord) in EPSG:3857 della tessera XYZ."""
    if not (0 <= z <= 24) or not (0 <= x < 2**z) or not (0 <= y < 2**z):
        raise TesseraNonValida(f"Tessera {z}/{x}/{y} inesistente.")
    lato = 2 * MEZZO_MONDO / 2**z
    ovest = -MEZZO_MONDO + x * lato
    nord = MEZZO_MONDO - y * lato
    return ovest, nord - lato, ovest + lato, nord


def codifica_terrarium(quote: np.ndarray) -> np.ndarray:
    """Quote (m, NaN = senza dato -> 0 m) in un array RGB uint8 3 x H x W (Terrarium)."""
    q = np.where(np.isfinite(quote), quote, 0.0)
    v = np.clip(q + 32768.0, 0, 65535.99)
    r = np.floor(v / 256)
    g = np.floor(v - r * 256)
    b = np.round((v - r * 256 - g) * 256)
    # Arrotondamento che "trabocca" su 256 -> riporto sulla componente superiore
    riporto = b >= 256
    b[riporto] = 0
    g[riporto] += 1
    riporto_g = g >= 256
    g[riporto_g] = 0
    r[riporto_g] += 1
    return np.stack([r, g, b]).astype(np.uint8)


def decodifica_terrarium(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[i].astype(np.float64) for i in range(3))
    return r * 256 + g + b / 256 - 32768


def quote_tessera(sorgente: SorgenteDtm, z: int, x: int, y: int) -> np.ndarray | None:
    """Quote (m) della tessera 256 x 256 in EPSG:3857; None se il DTM non la copre affatto."""
    if not (ZOOM_MINIMO <= z <= ZOOM_MASSIMO):
        raise TesseraNonValida(f"Zoom {z} fuori dall'intervallo {ZOOM_MINIMO}-{ZOOM_MASSIMO}.")
    limiti = limiti_tessera(z, x, y)
    lato = limiti[2] - limiti[0]
    pixel = lato / DIMENSIONE
    # Riquadro in UTM 32N con un margine di 2 pixel per l'interpolazione ai bordi
    margine = 2 * pixel
    limiti_utm = transform_bounds(
        "EPSG:3857", "EPSG:32632",
        limiti[0] - margine, limiti[1] - margine, limiti[2] + margine, limiti[3] + margine,
        densify_pts=21,
    )
    b = sorgente.bounds
    if limiti_utm[0] >= b.right or limiti_utm[2] <= b.left or limiti_utm[1] >= b.top or limiti_utm[3] <= b.bottom:
        return None

    # Risoluzione al suolo della tessera (il fattore di scala di Web Mercator è 1/cos(lat))
    lat_centro = math.degrees(math.atan(math.sinh(((limiti[1] + limiti[3]) / 2) / 6378137.0)))
    risoluzione_suolo = pixel * math.cos(math.radians(lat_centro))
    lettura = max(sorgente.risoluzione_m, risoluzione_suolo / 2)  # 2x sovracampionamento

    with rasterio.open(sorgente.percorso) as ds:
        finestra = (
            finestra_da_limiti(*limiti_utm, transform=ds.transform)
            .round_offsets(op="floor")
            .round_lengths(op="ceil")
            .intersection(Window(0, 0, ds.width, ds.height))
        )
        fattore = lettura / sorgente.risoluzione_m
        forma = (max(1, math.ceil(finestra.height / fattore)), max(1, math.ceil(finestra.width / fattore)))
        # Con forma ridotta GDAL usa automaticamente le piramidi del file
        dati = ds.read(1, window=finestra, out_shape=forma, masked=True, resampling=Resampling.average)
        t = ds.window_transform(finestra)
        trasf_lettura = t @ t.scale(finestra.width / forma[1], finestra.height / forma[0])

    sorgente_quote = dati.astype(np.float64).filled(np.nan)
    destinazione = np.full((DIMENSIONE, DIMENSIONE), np.nan)
    reproject(
        source=sorgente_quote,
        destination=destinazione,
        src_transform=trasf_lettura,
        src_crs="EPSG:32632",
        src_nodata=np.nan,
        dst_transform=from_bounds(*limiti, DIMENSIONE, DIMENSIONE),
        dst_crs="EPSG:3857",
        dst_nodata=np.nan,
        resampling=Resampling.bilinear,
    )
    if not np.isfinite(destinazione).any():
        return None
    return destinazione


def png_rgb(rgb: np.ndarray) -> bytes:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", NotGeoreferencedWarning)
        with MemoryFile() as memoria:
            with memoria.open(driver="PNG", width=rgb.shape[2], height=rgb.shape[1], count=3, dtype="uint8") as f:
                f.write(rgb)
            return memoria.read()


class CacheTessere:
    """Piccola cache LRU in memoria delle tessere già generate (thread-safe)."""

    def __init__(self, capienza: int = 1024) -> None:
        self._dati: OrderedDict[tuple[int, int, int], bytes | None] = OrderedDict()
        self._capienza = capienza
        self._lock = Lock()

    def ottieni(self, sorgente: SorgenteDtm, z: int, x: int, y: int) -> bytes | None:
        chiave = (z, x, y)
        with self._lock:
            if chiave in self._dati:
                self._dati.move_to_end(chiave)
                return self._dati[chiave]
        quote = quote_tessera(sorgente, z, x, y)
        contenuto = None if quote is None else png_rgb(codifica_terrarium(quote))
        with self._lock:
            self._dati[chiave] = contenuto
            while len(self._dati) > self._capienza:
                self._dati.popitem(last=False)
        return contenuto
