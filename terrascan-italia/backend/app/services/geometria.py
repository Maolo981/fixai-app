"""Calcoli geometrici reali su un poligono disegnato dall'utente.

Metodo principale (valori mostrati all'utente)
----------------------------------------------
Superficie e perimetro sono calcolati in modo **geodetico** sull'ellissoide
WGS84 con l'algoritmo di C. F. F. Karney (GeographicLib), tramite
``pyproj.Geod.geometry_area_perimeter``. È il metodo più accurato per
misurare un poligono espresso in coordinate geografiche (lon/lat): non
introduce le deformazioni tipiche di una proiezione cartografica.

Nota: l'ellissoide GRS80 (usato da ETRS89 / RDN2008, il sistema geodetico
nazionale) differisce da WGS84 di circa 0,1 mm sul semiasse minore; per le
superfici di un terreno la differenza è trascurabile.

Valore di controllo
-------------------
Calcoliamo anche superficie e perimetro **proiettati** in UTM fuso 32N
(EPSG:32632), lo stesso sistema del DTM 5x5 di Regione Lombardia. Il valore
proiettato include il fattore di scala della proiezione (0,9996 sul
meridiano centrale), quindi in Lombardia differisce dal geodetico di circa
lo 0,1%. Serve come verifica indipendente e come riferimento per la Fase 2.

Limiti
------
* Il perimetro è la lunghezza totale del confine: bordo esterno più il bordo
  di eventuali fori (aree escluse).
* La superficie è **planimetrica** (proiettata sull'ellissoide), non la
  superficie reale inclinata del terreno: quella richiede il DTM (Fase 2).
* La precisione dipende da quanto accuratamente è stato disegnato il
  perimetro sulla mappa. Non sostituisce un rilievo topografico.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

from pyproj import Geod, Transformer
from shapely.geometry import Polygon, shape
from shapely.validation import explain_validity

# Limite prudenziale sul numero di vertici per evitare richieste abnormi.
MAX_VERTICI = 5000
# Superficie minima considerata un poligono reale (1 cm²).
AREA_MINIMA_M2 = 1e-4

EPSG_UTM32N = 32632

_GEOD = Geod(ellps="WGS84")


class ErroreGeometria(ValueError):
    """Geometria non valida: il messaggio è pensato per l'utente finale."""


@dataclass(frozen=True)
class MisurePoligono:
    area_m2: float
    perimetro_m: float
    area_utm32_m2: float
    perimetro_utm32_m: float
    centroide_lon: float
    centroide_lat: float
    bbox: tuple[float, float, float, float]
    numero_vertici: int

    @property
    def area_ettari(self) -> float:
        return self.area_m2 / 10_000

    @property
    def differenza_utm_percentuale(self) -> float:
        """Scarto relativo tra superficie UTM 32N e superficie geodetica."""
        return (self.area_utm32_m2 - self.area_m2) / self.area_m2 * 100


@lru_cache(maxsize=1)
def _wgs84_to_utm32() -> Transformer:
    return Transformer.from_crs("EPSG:4326", f"EPSG:{EPSG_UTM32N}", always_xy=True)


@lru_cache(maxsize=1)
def _utm32_to_wgs84() -> Transformer:
    return Transformer.from_crs(f"EPSG:{EPSG_UTM32N}", "EPSG:4326", always_xy=True)


def _valida_anello(anello: list, indice: int) -> list[tuple[float, float]]:
    nome = "perimetro esterno" if indice == 0 else f"foro n. {indice}"
    if not isinstance(anello, list) or len(anello) < 4:
        raise ErroreGeometria(
            f"Il {nome} deve avere almeno 3 vertici distinti (4 posizioni con chiusura)."
        )
    punti: list[tuple[float, float]] = []
    for posizione in anello:
        if not isinstance(posizione, (list, tuple)) or len(posizione) < 2:
            raise ErroreGeometria(f"Coordinata non valida nel {nome}.")
        lon, lat = posizione[0], posizione[1]
        if not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in (lon, lat)):
            raise ErroreGeometria(f"Coordinata non numerica nel {nome}.")
        if not (math.isfinite(lon) and math.isfinite(lat)):
            raise ErroreGeometria(f"Coordinata non finita nel {nome}.")
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise ErroreGeometria(
                f"Coordinata fuori intervallo nel {nome}: attese longitudine e latitudine in gradi (WGS84)."
            )
        punti.append((float(lon), float(lat)))
    if punti[0] != punti[-1]:
        raise ErroreGeometria(
            f"Il {nome} non è chiuso: il primo e l'ultimo vertice devono coincidere (GeoJSON RFC 7946)."
        )
    if len(set(punti[:-1])) < 3:
        raise ErroreGeometria(f"Il {nome} deve avere almeno 3 vertici distinti.")
    return punti


def poligono_da_geojson(geometria: dict) -> Polygon:
    """Converte e valida una geometria GeoJSON di tipo Polygon (lon/lat WGS84)."""
    if not isinstance(geometria, dict) or geometria.get("type") != "Polygon":
        raise ErroreGeometria("È richiesta una geometria GeoJSON di tipo 'Polygon'.")
    anelli = geometria.get("coordinates")
    if not isinstance(anelli, list) or not anelli:
        raise ErroreGeometria("La geometria non contiene coordinate.")
    anelli_validati = [_valida_anello(a, i) for i, a in enumerate(anelli)]
    vertici = sum(len(a) - 1 for a in anelli_validati)
    if vertici > MAX_VERTICI:
        raise ErroreGeometria(f"Troppi vertici ({vertici}); il massimo consentito è {MAX_VERTICI}.")

    poligono = Polygon(anelli_validati[0], anelli_validati[1:])
    if not poligono.is_valid:
        motivo = explain_validity(poligono)
        if "Self-intersection" in motivo:
            raise ErroreGeometria(
                "Il perimetro si interseca con se stesso. Ridisegna il terreno senza lati che si incrociano."
            )
        raise ErroreGeometria(f"Il poligono non è valido ({motivo}).")
    return poligono


def misura_poligono(poligono: Polygon) -> MisurePoligono:
    """Calcola superficie, perimetro e dati descrittivi di un poligono lon/lat."""
    area_firmata, _ = _GEOD.geometry_area_perimeter(poligono)
    area = abs(area_firmata)
    # Perimetro = lunghezza totale del confine (bordo esterno + eventuali fori),
    # coerente con il valore UTM di shapely. pyproj conta solo il bordo esterno.
    perimetro = sum(
        _GEOD.line_length(*anello.xy) for anello in (poligono.exterior, *poligono.interiors)
    )
    if area < AREA_MINIMA_M2:
        raise ErroreGeometria("Il poligono ha superficie nulla: i vertici sono allineati o coincidenti.")

    trasformatore = _wgs84_to_utm32()
    esterno_utm = [trasformatore.transform(x, y) for x, y in poligono.exterior.coords]
    fori_utm = [[trasformatore.transform(x, y) for x, y in foro.coords] for foro in poligono.interiors]
    poligono_utm = Polygon(esterno_utm, fori_utm)

    # Il centroide è calcolato in UTM (metrico) e riportato in lon/lat.
    centroide_utm = poligono_utm.centroid
    lon_c, lat_c = _utm32_to_wgs84().transform(centroide_utm.x, centroide_utm.y)

    numero_vertici = len(poligono.exterior.coords) - 1 + sum(len(f.coords) - 1 for f in poligono.interiors)
    return MisurePoligono(
        area_m2=area,
        perimetro_m=perimetro,
        area_utm32_m2=poligono_utm.area,
        perimetro_utm32_m=poligono_utm.length,
        centroide_lon=lon_c,
        centroide_lat=lat_c,
        bbox=tuple(round(v, 7) for v in poligono.bounds),  # type: ignore[arg-type]
        numero_vertici=numero_vertici,
    )


StatoAreaPilota = Literal["interno", "parziale", "esterno"]


def posizione_rispetto_area(poligono: Polygon, area: dict) -> StatoAreaPilota:
    """Indica se il poligono è dentro, a cavallo o fuori dall'area pilota."""
    confine = shape(area)
    if confine.contains(poligono):
        return "interno"
    if confine.intersects(poligono):
        return "parziale"
    return "esterno"
