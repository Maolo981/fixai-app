"""Mappe tematiche del terreno (Fase 3): pendenze ed esposizioni, cella per cella.

Non introduce nuovi calcoli: colora le stesse griglie usate dall'analisi della
Fase 2 (``SorgenteDtm.griglie``). Ogni pixel dell'immagine è una cella del DTM
(5 x 5 m); le celle fuori dal perimetro o senza valore sono trasparenti.

L'immagine è allineata alla griglia UTM 32N del DTM: per sovrapporla alla mappa
web si forniscono le coordinate lon/lat dei suoi 4 angoli.
"""

from __future__ import annotations

import base64
import warnings
from dataclasses import dataclass
from typing import Literal

import numpy as np
import rasterio
from rasterio.errors import NotGeoreferencedWarning
from rasterio.enums import Resampling
from rasterio.features import geometry_mask
from rasterio.io import MemoryFile
from rasterio.warp import reproject
from shapely.geometry import Polygon

from app.services.altimetria import (
    LIMITI_CLASSI_PENDENZA,
    SETTORI_ESPOSIZIONE,
    SOGLIA_PIANEGGIANTE_PERCENTO,
    SorgenteDtm,
    _in_utm,
    _utm_a_wgs84,
    settore_esposizione,
)

TipoMappa = Literal["quota", "pendenza", "esposizione"]

# Altimetria: gradiente a spettro completo dal punto più basso (viola) al più alto (rosso) del lotto.
# Le tappe sono interpolate linearmente in RGB; la scala è relativa al singolo lotto.
GRADIENTE_QUOTA = (
    (0.00, "#8a2be2"),
    (0.16, "#3b4cdb"),
    (0.33, "#1fb5e8"),
    (0.50, "#2ecc71"),
    (0.66, "#e9e33a"),
    (0.83, "#f59331"),
    (1.00, "#e03131"),
)
# Fattore di sovracampionamento per la resa sfumata della mappa altimetrica (5 m -> 1,25 m)
SOVRACAMPIONAMENTO_QUOTA = 4
LATO_MASSIMO_IMMAGINE = 2048
TAPPE_LEGENDA_QUOTA = 5

# Pendenza: dal verde (pianeggiante) al rosso scuro (molto ripido), una tinta per classe.
COLORI_PENDENZA = ("#1a9850", "#91cf60", "#d9ef8b", "#fee08b", "#fc8d59", "#d73027", "#7f0000")
# Esposizione: ruota dei colori (convenzione usuale delle carte delle esposizioni).
COLORI_ESPOSIZIONE = {
    "N": "#e41a1c",
    "NE": "#ff7f00",
    "E": "#ffd92f",
    "SE": "#4daf4a",
    "S": "#00bcd4",
    "SO": "#377eb8",
    "O": "#3f2fb5",
    "NO": "#c51b8a",
}
COLORE_PIANEGGIANTE = "#bdbdbd"
NOMI_SETTORI = {
    "N": "Nord", "NE": "Nord-Est", "E": "Est", "SE": "Sud-Est",
    "S": "Sud", "SO": "Sud-Ovest", "O": "Ovest", "NO": "Nord-Ovest",
}


def _rgb(colore: str) -> tuple[int, int, int]:
    return int(colore[1:3], 16), int(colore[3:5], 16), int(colore[5:7], 16)


@dataclass(frozen=True)
class VoceLegenda:
    etichetta: str
    colore: str
    percentuale_celle: float


@dataclass(frozen=True)
class ScalaQuota:
    """Scala della mappa altimetrica: quote (m) agli estremi e alle tappe intermedie."""

    minima: float
    massima: float
    tappe: list[tuple[float, str]]  # (quota m, colore)


@dataclass(frozen=True)
class MappaTematica:
    tipo: TipoMappa
    png: bytes
    larghezza: int
    altezza: int
    # Angoli [lon, lat]: alto-sinistra, alto-destra, basso-destra, basso-sinistra
    coordinate: list[list[float]]
    legenda: list[VoceLegenda]
    celle_colorate: int
    # Estensione dell'immagine in UTM 32N: (ovest, sud, est, nord) in metri
    limiti_utm: tuple[float, float, float, float] = (0.0, 0.0, 0.0, 0.0)
    scala: ScalaQuota | None = None

    @property
    def png_base64(self) -> str:
        return base64.b64encode(self.png).decode("ascii")


def _etichetta_classe(da: float, a: float) -> str:
    return f"oltre {da:g} %" if a == float("inf") else f"{da:g}–{a:g} %"


def classi_colore(tipo: TipoMappa, pendenza: np.ndarray, esposizione: np.ndarray) -> tuple[np.ndarray, list]:
    """Indice di classe per cella (-1 = nessun colore) e voci (etichetta, colore)."""
    indici = np.full(pendenza.shape, -1, dtype=int)
    validi = np.isfinite(pendenza)
    if tipo == "pendenza":
        voci = []
        for i, (da, a) in enumerate(zip(LIMITI_CLASSI_PENDENZA[:-1], LIMITI_CLASSI_PENDENZA[1:])):
            indici[validi & (pendenza >= da) & (pendenza < a)] = i
            voci.append((_etichetta_classe(da, a), COLORI_PENDENZA[i]))
        return indici, voci
    pianeggiante = validi & (pendenza < SOGLIA_PIANEGGIANTE_PERCENTO)
    inclinate = validi & ~pianeggiante
    indici[inclinate] = settore_esposizione(esposizione[inclinate])
    indici[pianeggiante] = len(SETTORI_ESPOSIZIONE)
    voci = [(NOMI_SETTORI[s], COLORI_ESPOSIZIONE[s]) for s in SETTORI_ESPOSIZIONE]
    voci.append((f"Pianeggiante (< {SOGLIA_PIANEGGIANTE_PERCENTO:g} %)", COLORE_PIANEGGIANTE))
    return indici, voci


def colori_gradiente(valori: np.ndarray) -> np.ndarray:
    """Colori RGB (N x 3, uint8) per valori normalizzati 0..1 lungo il gradiente altimetrico."""
    posizioni = np.array([p for p, _ in GRADIENTE_QUOTA])
    componenti = np.array([_rgb(c) for _, c in GRADIENTE_QUOTA], dtype=float)
    v = np.clip(valori, 0.0, 1.0)
    return np.stack([np.interp(v, posizioni, componenti[:, k]) for k in range(3)], axis=-1).round().astype(np.uint8)


def _scala_quota(minima: float, massima: float) -> ScalaQuota:
    escursione = massima - minima
    frazioni = np.linspace(0, 1, TAPPE_LEGENDA_QUOTA)
    tappe = [
        (minima + f * escursione, "#{:02x}{:02x}{:02x}".format(*colori_gradiente(np.array([f]))[0]))
        for f in frazioni
    ]
    return ScalaQuota(minima=minima, massima=massima, tappe=tappe)


def _immagine_quota_sfumata(g, poligono_utm) -> tuple[np.ndarray, rasterio.Affine, ScalaQuota]:
    """Mappa altimetrica sfumata: quote del DTM interpolate (bilineare) su una griglia più fine.

    La scala (minimo/massimo) è quella delle celle reali interne al lotto, come nelle statistiche;
    l'interpolazione serve solo alla resa visiva e il bordo segue il perimetro disegnato.
    """
    z = g.finestra.z
    minima, massima = float(z[g.valide].min()), float(z[g.valide].max())
    altezza, larghezza = z.shape
    fattore = max(1, min(SOVRACAMPIONAMENTO_QUOTA, LATO_MASSIMO_IMMAGINE // max(altezza, larghezza)))
    t = g.finestra.trasformazione
    t_fine = t @ rasterio.Affine.scale(1 / fattore)
    fine = np.full((altezza * fattore, larghezza * fattore), np.nan)
    reproject(
        source=z,
        destination=fine,
        src_transform=t,
        src_crs="EPSG:32632",
        src_nodata=np.nan,
        dst_transform=t_fine,
        dst_crs="EPSG:32632",
        dst_nodata=np.nan,
        resampling=Resampling.bilinear,
    )
    dentro = geometry_mask([poligono_utm], out_shape=fine.shape, transform=t_fine, invert=True) & np.isfinite(fine)
    escursione = massima - minima
    valori = fine[dentro]
    normalizzate = (valori - minima) / escursione if escursione > 0 else np.full(valori.size, 0.5)
    colori = colori_gradiente(normalizzate)
    rgba = np.zeros((4, *fine.shape), dtype=np.uint8)
    for k in range(3):
        rgba[k][dentro] = colori[:, k]
    rgba[3][dentro] = 255
    return rgba, t_fine, _scala_quota(minima, massima)


def crea_mappa(sorgente: SorgenteDtm, poligono_wgs84: Polygon, tipo: TipoMappa) -> MappaTematica:
    g = sorgente.griglie(poligono_wgs84)
    altezza, larghezza = g.finestra.z.shape
    rgba = np.zeros((4, altezza, larghezza), dtype=np.uint8)
    t = g.finestra.trasformazione
    legenda: list[VoceLegenda] = []
    scala: ScalaQuota | None = None
    if tipo == "quota":
        rgba, t, scala = _immagine_quota_sfumata(g, _in_utm(poligono_wgs84))
        altezza, larghezza = rgba.shape[1:]
        totale = int(g.valide.sum())  # celle reali del DTM nel lotto
        voci = []
        indici = np.full((altezza, larghezza), -1)
    else:
        indici, voci = classi_colore(tipo, g.pendenza, g.esposizione)
        indici[~g.interne] = -1
        totale = int((indici >= 0).sum())
    for i, (etichetta, colore) in enumerate(voci):
        maschera = indici == i
        r, gr, b = _rgb(colore)
        rgba[0][maschera], rgba[1][maschera], rgba[2][maschera] = r, gr, b
        rgba[3][maschera] = 255
        legenda.append(
            VoceLegenda(etichetta, colore, float(maschera.sum()) / totale * 100 if totale else 0.0)
        )

    # Il PNG non contiene la georeferenziazione: viaggia a parte, come coordinate dei 4 angoli.
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", NotGeoreferencedWarning)
        with MemoryFile() as memoria:
            with memoria.open(driver="PNG", width=larghezza, height=altezza, count=4, dtype="uint8") as png:
                png.write(rgba)
            contenuto = memoria.read()

    def angolo(colonna: int, riga: int) -> tuple[float, float]:
        return t.c + colonna * t.a + riga * t.b, t.f + colonna * t.d + riga * t.e

    angoli_utm = [angolo(0, 0), angolo(larghezza, 0), angolo(larghezza, altezza), angolo(0, altezza)]
    a_wgs = _utm_a_wgs84()
    coordinate = [list(a_wgs.transform(x, y)) for x, y in angoli_utm]
    return MappaTematica(
        tipo=tipo,
        png=contenuto,
        larghezza=larghezza,
        altezza=altezza,
        coordinate=coordinate,
        legenda=legenda,
        celle_colorate=totale,
        limiti_utm=(angoli_utm[0][0], angoli_utm[2][1], angoli_utm[2][0], angoli_utm[0][1]),
        scala=scala,
    )
