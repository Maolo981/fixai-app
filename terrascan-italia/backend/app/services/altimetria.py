"""Analisi altimetrica reale con il DTM 5x5 di Regione Lombardia (ed. 2015).

Cosa calcola, per il terreno disegnato:
* quota minima, massima e media, dislivello, posizione dei punti più basso e più alto;
* pendenza media e massima e distribuzione per classi di pendenza;
* esposizione dei versanti (verso quale direzione scende il terreno).

Metodo
------
* Il poligono (lon/lat WGS84) viene convertito in UTM 32N (EPSG:32632), lo stesso
  sistema del DTM. Il DTM non viene mai ricampionato né riproiettato.
* Si legge solo la porzione di raster che contiene il terreno, più una cella di
  margine (serve al calcolo della pendenza sui bordi).
* Sono considerate "interne" le celle il cui **centro** cade dentro il perimetro.
* Pendenza ed esposizione: metodo di Horn (1981) su finestra 3x3, lo stesso usato da
  GDAL e QGIS. Una cella senza tutti gli 8 vicini validi non ha pendenza.
* Le statistiche di pendenza ed esposizione sono calcolate cella per cella; le
  percentuali sono riferite al numero di celle (ogni cella vale 25 m²).

Nessun valore viene stimato: se il DTM non è disponibile, se il terreno è fuori
copertura o non contiene celle valide viene sollevata ``AltimetriaNonDisponibile``.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import numpy as np
import rasterio
import shapely
from pyproj import Transformer
from rasterio.features import geometry_mask
from rasterio.windows import Window, from_bounds
from shapely.geometry import Polygon

EPSG_DTM = 32632
RISOLUZIONE_ATTESA_M = 5.0
# Oltre questa superficie l'analisi richiederebbe troppa memoria e tempo per una
# risposta interattiva (50 km² = 2 milioni di celle).
AREA_MASSIMA_M2 = 50_000_000.0
# Sotto questo numero di celle le statistiche sono poco rappresentative.
MIN_CELLE_SIGNIFICATIVE = 20
# Sotto questa pendenza l'esposizione non è significativa: la cella è "pianeggiante".
SOGLIA_PIANEGGIANTE_PERCENTO = 1.0
# Classi di pendenza (%) descrittive e generiche, NON normative: si possono
# modificare per esigenze specifiche (meccanizzazione agricola, edilizia, ecc.).
LIMITI_CLASSI_PENDENZA = (0.0, 5.0, 10.0, 15.0, 20.0, 30.0, 50.0, math.inf)
SETTORI_ESPOSIZIONE = ("N", "NE", "E", "SE", "S", "SO", "O", "NO")


class AltimetriaNonDisponibile(Exception):
    """L'analisi altimetrica non può essere eseguita; il messaggio spiega perché."""


@dataclass(frozen=True)
class DescrizioneDtm:
    nome: str
    edizione: str
    proprietario: str
    licenza: str
    attribuzione: str
    precisione_dichiarata: str


DTM_LOMBARDIA = DescrizioneDtm(
    nome="DTM 5X5 - Modello digitale del terreno",
    edizione="2015",
    proprietario="Regione Lombardia",
    licenza="CC BY 4.0",
    attribuzione=(
        "Dati altimetrici: DTM 5x5 - Modello digitale del terreno (ed. 2015), © Regione Lombardia, "
        "licenza CC BY 4.0. Dati elaborati da TerraScan Italia."
    ),
    precisione_dichiarata=(
        "Accuratezza in quota dichiarata: 0,30 m nelle aree urbanizzate, 1 m nelle aree extraurbane "
        "infrastrutturate, 2 m nelle aree agricole e forestali; peggiore dove deriva dal precedente DTM 20 m."
    ),
)


@dataclass(frozen=True)
class Punto:
    lon: float
    lat: float
    quota: float


@dataclass(frozen=True)
class RisultatoAltimetria:
    quota_minima: float
    quota_massima: float
    quota_media: float
    dislivello: float
    punto_minimo: Punto
    punto_massimo: Punto
    pendenza_media_percento: float
    pendenza_massima_percento: float
    pendenza_minima_percento: float
    classi_pendenza: list[tuple[float, float, float]]  # (da %, a %, quota % di celle)
    esposizione_prevalente: str
    esposizione_settori: dict[str, float]  # settore -> % di celle, incluso "Pianeggiante"
    celle_interne: int
    celle_valide: int
    celle_con_pendenza: int
    dimensione_cella_m: float
    avvertenze: list[str] = field(default_factory=list)

    @property
    def copertura_percento(self) -> float:
        return self.celle_valide / self.celle_interne * 100

    @staticmethod
    def gradi(percento: float) -> float:
        return math.degrees(math.atan(percento / 100))


# ------------------------------------------------------------------ calcolo


def pendenza_esposizione_horn(z: np.ndarray, cella_x: float, cella_y: float) -> tuple[np.ndarray, np.ndarray]:
    """Pendenza (%) ed esposizione (gradi da Nord in senso orario) con il metodo di Horn.

    ``z`` è una griglia con la prima riga a Nord (convenzione dei raster); i valori
    mancanti sono NaN. Le celle di bordo e quelle con un vicino mancante restano NaN.
    L'esposizione indica la direzione verso cui il terreno scende (0 = Nord, 90 = Est).
    """
    pendenza = np.full(z.shape, np.nan)
    esposizione = np.full(z.shape, np.nan)
    if z.shape[0] < 3 or z.shape[1] < 3:
        return pendenza, esposizione
    a, b, c = z[:-2, :-2], z[:-2, 1:-1], z[:-2, 2:]
    d, f = z[1:-1, :-2], z[1:-1, 2:]
    g, h, i = z[2:, :-2], z[2:, 1:-1], z[2:, 2:]
    dz_est = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * cella_x)
    # Derivata verso Sud (le righe crescono verso Sud)
    dz_sud = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * cella_y)
    pendenza[1:-1, 1:-1] = np.hypot(dz_est, dz_sud) * 100
    # Direzione di discesa = -gradiente; azimut = atan2(componente Est, componente Nord)
    esposizione[1:-1, 1:-1] = np.degrees(np.arctan2(-dz_est, dz_sud)) % 360
    # Il metodo di Horn non usa la cella centrale: se manca la sua quota,
    # la cella non deve avere pendenza (stesso comportamento di GDAL).
    mancanti = np.isnan(z)
    pendenza[mancanti] = np.nan
    esposizione[mancanti] = np.nan
    return pendenza, esposizione


def settore_esposizione(gradi: np.ndarray) -> np.ndarray:
    """Indice del settore (0=N, 1=NE, ... 7=NO) per ciascun azimut."""
    return (((gradi + 22.5) % 360) // 45).astype(int)


@lru_cache(maxsize=1)
def _wgs84_a_utm() -> Transformer:
    return Transformer.from_crs("EPSG:4326", f"EPSG:{EPSG_DTM}", always_xy=True)


@lru_cache(maxsize=1)
def _utm_a_wgs84() -> Transformer:
    return Transformer.from_crs(f"EPSG:{EPSG_DTM}", "EPSG:4326", always_xy=True)


def _in_utm(poligono: Polygon) -> Polygon:
    t = _wgs84_a_utm()

    def converti(xy: np.ndarray) -> np.ndarray:
        x, y = t.transform(xy[:, 0], xy[:, 1])
        return np.column_stack([x, y])

    return shapely.transform(poligono, converti)


@dataclass(frozen=True)
class FinestraDtm:
    """Porzione del DTM letta in memoria (quote in metri, NaN dove manca il dato)."""

    z: np.ndarray
    trasformazione: rasterio.Affine
    cella_x: float
    cella_y: float


@dataclass(frozen=True)
class GriglieTerreno:
    finestra: FinestraDtm
    interne: np.ndarray  # True per le celle il cui centro è dentro il perimetro
    valide: np.ndarray  # interne e con quota
    pendenza: np.ndarray  # %
    esposizione: np.ndarray  # gradi da Nord


class SorgenteDtm:
    """Accesso in sola lettura al file del DTM, con verifica delle sue caratteristiche."""

    def __init__(
        self,
        percorso: Path,
        descrizione: DescrizioneDtm = DTM_LOMBARDIA,
        epsg_atteso: int = EPSG_DTM,
        risoluzione_attesa_m: float = RISOLUZIONE_ATTESA_M,
    ) -> None:
        self.percorso = Path(percorso)
        self.descrizione = descrizione
        if not self.percorso.is_file():
            raise AltimetriaNonDisponibile(
                "Il file del DTM non è installato sul server (vedi backend/scripts/prepara_dtm.py)."
            )
        try:
            with rasterio.open(self.percorso) as ds:
                epsg = ds.crs.to_epsg() if ds.crs else None
                rx, ry = ds.res
                self.bounds = ds.bounds
                conteggio = ds.count
        except rasterio.errors.RasterioError as exc:
            raise AltimetriaNonDisponibile(f"Il file del DTM non è leggibile ({exc}).") from exc
        if epsg != epsg_atteso:
            raise AltimetriaNonDisponibile(
                f"Il DTM ha sistema di riferimento EPSG:{epsg}, atteso EPSG:{epsg_atteso}."
            )
        if not (math.isclose(rx, risoluzione_attesa_m) and math.isclose(ry, risoluzione_attesa_m)):
            raise AltimetriaNonDisponibile(
                f"Il DTM ha celle di {rx} x {ry} m, attese {risoluzione_attesa_m} x {risoluzione_attesa_m} m."
            )
        if conteggio != 1:
            raise AltimetriaNonDisponibile("Il DTM deve avere una sola banda di quote.")
        self.risoluzione_m = rx

    def leggi_finestra(self, limiti_utm: tuple[float, float, float, float], margine: int = 1) -> FinestraDtm:
        """Legge le quote del riquadro UTM indicato (più un margine in celle); nodata -> NaN."""
        with rasterio.open(self.percorso) as ds:
            finestra = (
                from_bounds(*limiti_utm, transform=ds.transform).round_offsets(op="floor").round_lengths(op="ceil")
            )
            finestra = Window(
                finestra.col_off - margine,
                finestra.row_off - margine,
                finestra.width + 2 * margine + 1,
                finestra.height + 2 * margine + 1,
            ).intersection(Window(0, 0, ds.width, ds.height))
            dati = ds.read(1, window=finestra, masked=True)
            trasformazione = ds.window_transform(finestra)
            cella_x, cella_y = ds.res
        z = dati.astype(np.float64).filled(np.nan)
        z[~np.isfinite(z)] = np.nan
        return FinestraDtm(z=z, trasformazione=trasformazione, cella_x=cella_x, cella_y=cella_y)

    def controlla_copertura(self, geometria_utm) -> None:
        b = self.bounds
        if not geometria_utm.intersects(shapely.box(b.left, b.bottom, b.right, b.top)):
            raise AltimetriaNonDisponibile("Il terreno è fuori dall'area coperta dal DTM della Lombardia.")

    def griglie(self, poligono_wgs84: Polygon) -> GriglieTerreno:
        """Quote, pendenza, esposizione e maschera delle celle interne per il terreno.

        È la base comune dell'analisi (Fase 2) e delle mappe (Fase 3): stessi dati, stesso metodo.
        """
        poligono = _in_utm(poligono_wgs84)
        if poligono.area > AREA_MASSIMA_M2:
            raise AltimetriaNonDisponibile(
                f"Il terreno supera {AREA_MASSIMA_M2 / 1e6:.0f} km²: l'analisi altimetrica è limitata a "
                "superfici inferiori."
            )
        self.controlla_copertura(poligono)
        f = self.leggi_finestra(poligono.bounds)
        interne = geometry_mask(
            [poligono], out_shape=f.z.shape, transform=f.trasformazione, all_touched=False, invert=True
        )
        if not interne.any():
            raise AltimetriaNonDisponibile(
                "Il terreno è troppo piccolo: non contiene il centro di nessuna cella del DTM (5 x 5 m)."
            )
        valide = interne & np.isfinite(f.z)
        if not valide.any():
            raise AltimetriaNonDisponibile("Il DTM non contiene quote valide all'interno del terreno.")
        pendenza, esposizione = pendenza_esposizione_horn(f.z, f.cella_x, f.cella_y)
        return GriglieTerreno(finestra=f, interne=interne, valide=valide, pendenza=pendenza, esposizione=esposizione)

    def analizza(self, poligono_wgs84: Polygon) -> RisultatoAltimetria:
        g = self.griglie(poligono_wgs84)
        z, interne, valide = g.finestra.z, g.interne, g.valide
        pendenza, esposizione = g.pendenza, g.esposizione
        trasformazione, cella_x = g.finestra.trasformazione, g.finestra.cella_x
        celle_interne = int(interne.sum())
        celle_valide = int(valide.sum())
        quote = z[valide]
        con_pendenza = interne & np.isfinite(pendenza)
        celle_con_pendenza = int(con_pendenza.sum())

        avvertenze: list[str] = []
        if celle_valide < celle_interne:
            avvertenze.append(
                f"Il DTM copre solo il {celle_valide / celle_interne * 100:.1f}% del terreno: "
                "le statistiche si riferiscono alla parte coperta."
            )
        if celle_valide < MIN_CELLE_SIGNIFICATIVE:
            avvertenze.append(
                f"Il terreno contiene solo {celle_valide} celle del DTM: le statistiche sono poco rappresentative."
            )

        def punto(indice_piatto_valido: int) -> Punto:
            righe, colonne = np.nonzero(valide)
            r, c = righe[indice_piatto_valido], colonne[indice_piatto_valido]
            x, y = rasterio.transform.xy(trasformazione, r, c, offset="center")
            lon, lat = _utm_a_wgs84().transform(x, y)
            return Punto(lon=lon, lat=lat, quota=float(z[r, c]))

        if celle_con_pendenza:
            p = pendenza[con_pendenza]
            pend_media, pend_max, pend_min = float(p.mean()), float(p.max()), float(p.min())
            classi = []
            for da, a in zip(LIMITI_CLASSI_PENDENZA[:-1], LIMITI_CLASSI_PENDENZA[1:]):
                quota = float(((p >= da) & (p < a)).sum()) / p.size * 100
                classi.append((da, a, quota))
            e = esposizione[con_pendenza]
            pianeggiante = p < SOGLIA_PIANEGGIANTE_PERCENTO
            settori = settore_esposizione(e[~pianeggiante])
            distribuzione = {
                nome: float((settori == i).sum()) / p.size * 100 for i, nome in enumerate(SETTORI_ESPOSIZIONE)
            }
            distribuzione["Pianeggiante"] = float(pianeggiante.sum()) / p.size * 100
            prevalente = max(distribuzione, key=distribuzione.__getitem__)
        else:
            raise AltimetriaNonDisponibile(
                "Il terreno è troppo piccolo o al margine del DTM: la pendenza non è calcolabile."
            )

        return RisultatoAltimetria(
            quota_minima=float(quote.min()),
            quota_massima=float(quote.max()),
            quota_media=float(quote.mean()),
            dislivello=float(quote.max() - quote.min()),
            punto_minimo=punto(int(np.argmin(quote))),
            punto_massimo=punto(int(np.argmax(quote))),
            pendenza_media_percento=pend_media,
            pendenza_massima_percento=pend_max,
            pendenza_minima_percento=pend_min,
            classi_pendenza=classi,
            esposizione_prevalente=prevalente,
            esposizione_settori=distribuzione,
            celle_interne=celle_interne,
            celle_valide=celle_valide,
            celle_con_pendenza=celle_con_pendenza,
            dimensione_cella_m=cella_x,
            avvertenze=avvertenze,
        )
