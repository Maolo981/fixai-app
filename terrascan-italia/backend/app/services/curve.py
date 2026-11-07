"""Curve di livello del lotto, calcolate dal DTM 5x5 (Elevation Insights).

Metodo
------
* Stessa griglia dell'analisi altimetrica (``SorgenteDtm.griglie``): quote ai centri
  cella, celle NoData escluse (le curve si interrompono dove manca il dato).
* Isolinee con l'algoritmo marching squares di ``contourpy`` (il motore di Matplotlib),
  interpolazione lineare tra centri cella.
* Le linee sono ritagliate sul perimetro del lotto e restituite in lon/lat WGS84.

Intervalli ammessi
------------------
Gli intervalli inferiori a ``INTERVALLO_MINIMO_M`` (2 m) non sono proposti: l'accuratezza
in quota dichiarata dalla Regione arriva a 2 m nelle aree agricole e forestali, e circa
l'80% del DTM deriva da curve di livello con equidistanza 10 m. Curve più fitte
suggerirebbero una precisione che il dato non ha.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import contourpy
import numpy as np
from shapely.geometry import LineString, Polygon

from app.services.altimetria import AltimetriaNonDisponibile, SorgenteDtm, _in_utm, _utm_a_wgs84

INTERVALLI_CANDIDATI = (1.0, 2.0, 5.0, 10.0, 20.0, 25.0, 50.0, 100.0)
INTERVALLO_MINIMO_M = 2.0
MAX_LIVELLI = 60
LIVELLI_IDEALI = 20
MAX_VERTICI = 200_000
# Ogni quante curve una è "direttrice" (più marcata, come nelle carte tecniche)
OGNI_DIRETTRICE = 5


@dataclass(frozen=True)
class IntervalloCurve:
    metri: float
    livelli: int
    ammesso: bool
    motivo: str | None = None


@dataclass(frozen=True)
class RisultatoCurve:
    intervallo_m: float
    intervalli: list[IntervalloCurve]
    quota_minima: float
    quota_massima: float
    geojson: dict  # FeatureCollection di MultiLineString con proprietà quota/direttrice
    numero_curve: int


def _livelli(minima: float, massima: float, intervallo: float) -> list[float]:
    primo = math.ceil(minima / intervallo) * intervallo
    livelli = []
    quota = primo
    while quota <= massima + 1e-9 and len(livelli) <= MAX_LIVELLI + 1:
        livelli.append(round(quota, 6))
        quota += intervallo
    return livelli


def valuta_intervalli(minima: float, massima: float) -> list[IntervalloCurve]:
    risultato = []
    for metri in INTERVALLI_CANDIDATI:
        n = len(_livelli(minima, massima, metri))
        if metri < INTERVALLO_MINIMO_M:
            motivo = "Inferiore all'accuratezza in quota dichiarata del DTM (fino a 2 m)."
        elif massima - minima < metri or n == 0:
            # Su terreni (quasi) piatti una curva coincidente con la superficie disegnerebbe solo rumore
            motivo = f"Il dislivello del lotto ({massima - minima:.1f} m) è minore dell'intervallo."
        elif n > MAX_LIVELLI:
            motivo = f"Troppe curve ({n}) per una lettura chiara."
        else:
            motivo = None
        risultato.append(IntervalloCurve(metri=metri, livelli=min(n, MAX_LIVELLI + 1), ammesso=motivo is None, motivo=motivo))
    return risultato


def intervallo_consigliato(intervalli: list[IntervalloCurve]) -> float | None:
    ammessi = [i for i in intervalli if i.ammesso]
    if not ammessi:
        return None
    entro_ideale = [i for i in ammessi if i.livelli <= LIVELLI_IDEALI]
    return (entro_ideale or ammessi)[0].metri


def calcola_curve(sorgente: SorgenteDtm, poligono_wgs84: Polygon, intervallo: float | None) -> RisultatoCurve:
    g = sorgente.griglie(poligono_wgs84)
    z = g.finestra.z
    minima, massima = float(z[g.valide].min()), float(z[g.valide].max())
    intervalli = valuta_intervalli(minima, massima)
    if intervallo is None:
        intervallo = intervallo_consigliato(intervalli)
        if intervallo is None:
            raise AltimetriaNonDisponibile(
                "Il lotto è quasi pianeggiante: nessun intervallo di curve compatibile con l'accuratezza del DTM."
            )
    scelto = next((i for i in intervalli if math.isclose(i.metri, intervallo)), None)
    if scelto is None or not scelto.ammesso:
        motivo = scelto.motivo if scelto else "Intervallo non previsto."
        raise AltimetriaNonDisponibile(f"Intervallo di {intervallo:g} m non disponibile: {motivo}")

    t = g.finestra.trasformazione
    altezza, larghezza = z.shape
    colonne = t.c + (np.arange(larghezza) + 0.5) * t.a
    righe = t.f + (np.arange(altezza) + 0.5) * t.e
    xx, yy = np.meshgrid(colonne, righe)
    # Le celle fuori dal lotto restano valide per il calcolo (le linee si ritagliano dopo),
    # quelle NoData sono mascherate.
    generatore = contourpy.contour_generator(
        xx, yy, np.ma.masked_invalid(z), line_type=contourpy.LineType.Separate, corner_mask=True
    )
    poligono = _in_utm(poligono_wgs84)
    a_wgs = _utm_a_wgs84()
    features = []
    vertici = 0
    for quota in _livelli(minima, massima, intervallo):
        tratti = []
        for linea in generatore.lines(quota):
            if len(linea) < 2:
                continue
            ritagliata = LineString(linea).intersection(poligono)
            for parte in getattr(ritagliata, "geoms", [ritagliata]):
                if isinstance(parte, LineString) and not parte.is_empty and len(parte.coords) >= 2:
                    xs, ys = parte.xy
                    lon, lat = a_wgs.transform(np.asarray(xs), np.asarray(ys))
                    tratti.append([[round(a, 7), round(b, 7)] for a, b in zip(lon, lat)])
                    vertici += len(xs)
        if vertici > MAX_VERTICI:
            raise AltimetriaNonDisponibile("Troppe curve da disegnare: scegli un intervallo più ampio.")
        if tratti:
            features.append({
                "type": "Feature",
                "properties": {
                    "quota": quota,
                    "direttrice": math.isclose(quota % (intervallo * OGNI_DIRETTRICE), 0, abs_tol=1e-6)
                    or math.isclose(quota % (intervallo * OGNI_DIRETTRICE), intervallo * OGNI_DIRETTRICE, abs_tol=1e-6),
                },
                "geometry": {"type": "MultiLineString", "coordinates": tratti},
            })
    return RisultatoCurve(
        intervallo_m=intervallo,
        intervalli=intervalli,
        quota_minima=minima,
        quota_massima=massima,
        geojson={"type": "FeatureCollection", "features": features},
        numero_curve=len(features),
    )

