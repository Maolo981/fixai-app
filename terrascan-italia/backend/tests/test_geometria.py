"""Test dei calcoli di superficie e perimetro.

I valori attesi NON sono ricavati dalla stessa funzione sotto test, ma da
riferimenti indipendenti:
* formule analitiche dell'ellissoide (area di un quadrilatero delimitato da
  meridiani e paralleli, lunghezza di archi di meridiano e di parallelo);
* un quadrato di 100 m x 100 m costruito in coordinate UTM 32N;
* la superficie ufficiale ISTAT della Regione Lombardia.
"""

from __future__ import annotations

import math

import pytest
from pyproj import Proj, Transformer
from shapely.geometry import shape

from app.services.area_pilota import geometria_lombardia
from app.services.geometria import (
    ErroreGeometria,
    misura_poligono,
    poligono_da_geojson,
    posizione_rispetto_area,
)

# Parametri dell'ellissoide WGS84
A = 6378137.0
F = 1 / 298.257223563
E2 = F * (2 - F)
E = math.sqrt(E2)
B = A * (1 - F)


def poligono(coordinate: list[list[float]], fori: list[list[list[float]]] | None = None) -> dict:
    return {"type": "Polygon", "coordinates": [coordinate, *(fori or [])]}


def riquadro_densificato(lon1, lat1, lon2, lat2, n=1000) -> list[list[float]]:
    """Quadrilatero lon/lat con lati densificati (i lati seguono meridiani e paralleli)."""
    punti = []
    for i in range(n):
        punti.append([lon1 + (lon2 - lon1) * i / n, lat1])
    for i in range(n):
        punti.append([lon2, lat1 + (lat2 - lat1) * i / n])
    for i in range(n):
        punti.append([lon2 - (lon2 - lon1) * i / n, lat2])
    for i in range(n):
        punti.append([lon1, lat2 - (lat2 - lat1) * i / n])
    punti.append(punti[0])
    return punti


def area_quadrilatero_ellissoide(lon1, lat1, lon2, lat2) -> float:
    """Area esatta tra due meridiani e due paralleli sull'ellissoide (formula autalica)."""

    def q(phi):
        s = math.sin(phi)
        return s / (1 - E2 * s * s) + (1 / (2 * E)) * math.log((1 + E * s) / (1 - E * s))

    dlon = math.radians(lon2 - lon1)
    return 0.5 * B * B * dlon * (q(math.radians(lat2)) - q(math.radians(lat1)))


def arco_meridiano(lat1, lat2, passi=10_000) -> float:
    """Lunghezza dell'arco di meridiano per integrazione numerica (Simpson)."""
    f = lambda phi: A * (1 - E2) / (1 - E2 * math.sin(phi) ** 2) ** 1.5  # noqa: E731
    a, b = math.radians(lat1), math.radians(lat2)
    h = (b - a) / passi
    s = f(a) + f(b)
    for i in range(1, passi):
        s += (4 if i % 2 else 2) * f(a + i * h)
    return s * h / 3


def arco_parallelo(lat, dlon) -> float:
    phi = math.radians(lat)
    return math.radians(dlon) * A * math.cos(phi) / math.sqrt(1 - E2 * math.sin(phi) ** 2)


# ---------------------------------------------------------------- superficie


def test_area_quadrilatero_un_grado_coincide_con_formula_analitica():
    lon1, lat1, lon2, lat2 = 9.0, 45.0, 10.0, 46.0
    misure = misura_poligono(poligono_da_geojson(poligono(riquadro_densificato(lon1, lat1, lon2, lat2))))
    atteso = area_quadrilatero_ellissoide(lon1, lat1, lon2, lat2)
    # Verifica di buon senso: ~111,15 km (1° di meridiano) x ~78,16 km (1° di
    # parallelo a 45,5°N) = ~8.687 km²
    assert atteso == pytest.approx(111_150 * 78_155, rel=1e-3)
    # Scarto relativo ammesso 1e-6, dovuto alla densificazione dei lati

    assert misure.area_m2 == pytest.approx(atteso, rel=1e-6)


def test_perimetro_quadrilatero_coincide_con_archi_di_meridiano_e_parallelo():
    lon1, lat1, lon2, lat2 = 9.0, 45.0, 10.0, 46.0
    misure = misura_poligono(poligono_da_geojson(poligono(riquadro_densificato(lon1, lat1, lon2, lat2))))
    atteso = 2 * arco_meridiano(lat1, lat2) + arco_parallelo(lat1, 1.0) + arco_parallelo(lat2, 1.0)
    assert misure.perimetro_m == pytest.approx(atteso, rel=1e-7)
    # Un grado di meridiano a 45° di latitudine misura circa 111,1 km
    assert arco_meridiano(45.0, 46.0) == pytest.approx(111_150, rel=1e-3)


def quadrato_utm(est: float, nord: float, lato: float) -> list[list[float]]:
    """Quadrato definito in UTM 32N e convertito in lon/lat WGS84."""
    utm_to_wgs = Transformer.from_crs("EPSG:32632", "EPSG:4326", always_xy=True)
    vertici = [(est, nord), (est + lato, nord), (est + lato, nord + lato), (est, nord + lato), (est, nord)]
    return [list(utm_to_wgs.transform(x, y)) for x, y in vertici]


def test_quadrato_di_un_ettaro_in_utm_32n():
    # Vertice vicino a Milano (circa 9,19 E, 45,46 N)
    est, nord, lato = 514_000.0, 5_034_000.0, 100.0
    misure = misura_poligono(poligono_da_geojson(poligono(quadrato_utm(est, nord, lato))))

    # Il valore di controllo in UTM deve restituire esattamente 1 ettaro.
    assert misure.area_utm32_m2 == pytest.approx(10_000.0, abs=1e-3)
    assert misure.perimetro_utm32_m == pytest.approx(400.0, abs=1e-4)

    # Il valore geodetico è 10.000 m² diviso il fattore di scala areale UTM nel punto.
    lon_c, lat_c = Transformer.from_crs("EPSG:32632", "EPSG:4326", always_xy=True).transform(
        est + lato / 2, nord + lato / 2
    )
    fattori = Proj("EPSG:32632").get_factors(lon_c, lat_c)
    assert misure.area_m2 == pytest.approx(10_000.0 / fattori.areal_scale, rel=1e-6)
    assert misure.perimetro_m == pytest.approx(400.0 / fattori.meridional_scale, rel=1e-6)
    assert misure.area_ettari == pytest.approx(misure.area_m2 / 10_000)
    # Vicino al meridiano centrale il fattore di scala è ~0,9996: lo scarto è ~ -0,08%
    assert -0.1 < misure.differenza_utm_percentuale < 0


def test_orientamento_dei_vertici_non_cambia_il_risultato():
    antiorario = quadrato_utm(514_000.0, 5_034_000.0, 250.0)
    orario = list(reversed(antiorario))
    a = misura_poligono(poligono_da_geojson(poligono(antiorario)))
    b = misura_poligono(poligono_da_geojson(poligono(orario)))
    assert a.area_m2 == pytest.approx(b.area_m2, rel=1e-12)
    assert a.perimetro_m == pytest.approx(b.perimetro_m, rel=1e-12)


def test_poligono_con_foro_sottrae_superficie_e_somma_perimetro():
    esterno = quadrato_utm(514_000.0, 5_034_000.0, 200.0)
    foro = list(reversed(quadrato_utm(514_050.0, 5_034_050.0, 100.0)))
    pieno = misura_poligono(poligono_da_geojson(poligono(esterno)))
    solo_foro = misura_poligono(poligono_da_geojson(poligono(foro)))
    con_foro = misura_poligono(poligono_da_geojson(poligono(esterno, [foro])))
    assert con_foro.area_m2 == pytest.approx(pieno.area_m2 - solo_foro.area_m2, rel=1e-9)
    assert con_foro.perimetro_m == pytest.approx(pieno.perimetro_m + solo_foro.perimetro_m, rel=1e-9)
    assert con_foro.numero_vertici == 8


def test_superficie_lombardia_coincide_con_dato_ufficiale_istat():
    # Superficie territoriale ISTAT della Lombardia: circa 23.864 km².
    # Il confine incluso è generalizzato (semplificato), quindi ammettiamo lo 0,2%.
    confine = shape(geometria_lombardia())
    poligono_maggiore = max(confine.geoms, key=lambda g: g.area)
    from pyproj import Geod

    area_totale = abs(Geod(ellps="WGS84").geometry_area_perimeter(confine)[0])
    assert area_totale / 1e6 == pytest.approx(23_864, rel=2e-3)
    assert poligono_maggiore.is_valid


def test_centroide_e_bbox():
    coords = quadrato_utm(514_000.0, 5_034_000.0, 100.0)
    misure = misura_poligono(poligono_da_geojson(poligono(coords)))
    lon_atteso, lat_atteso = Transformer.from_crs("EPSG:32632", "EPSG:4326", always_xy=True).transform(
        514_050.0, 5_034_050.0
    )
    assert misure.centroide_lon == pytest.approx(lon_atteso, abs=1e-9)
    assert misure.centroide_lat == pytest.approx(lat_atteso, abs=1e-9)
    lon_min, lat_min, lon_max, lat_max = misure.bbox
    assert lon_min < misure.centroide_lon < lon_max
    assert lat_min < misure.centroide_lat < lat_max
    assert misure.numero_vertici == 4


# ---------------------------------------------------------------- validazione


@pytest.mark.parametrize(
    ("geometria", "frammento_messaggio"),
    [
        ({"type": "Point", "coordinates": [9, 45]}, "Polygon"),
        ({"type": "Polygon", "coordinates": []}, "coordinate"),
        (poligono([[9, 45], [9.1, 45], [9, 45]]), "almeno 3 vertici"),
        (poligono([[9, 45], [9.1, 45], [9.1, 45.1], [9, 45.1]]), "non è chiuso"),
        (poligono([[9, 45], [9.1, 45], [9.1, 45], [9, 45]]), "almeno 3 vertici distinti"),
        (poligono([[9, 45], [190, 45], [9.1, 45.1], [9, 45]]), "fuori intervallo"),
        (poligono([[9, 45], ["9.1", 45], [9.1, 45.1], [9, 45]]), "non numerica"),
        # "Farfalla": i lati si incrociano
        (poligono([[9, 45], [9.1, 45.1], [9.1, 45], [9, 45.1], [9, 45]]), "interseca con se stesso"),
    ],
)
def test_geometrie_non_valide_sono_rifiutate(geometria, frammento_messaggio):
    with pytest.raises(ErroreGeometria, match=frammento_messaggio):
        poligono_da_geojson(geometria)


def test_vertici_allineati_hanno_superficie_nulla():
    # Vertici sullo stesso meridiano: shapely lo considera non valido o a area nulla
    with pytest.raises(ErroreGeometria):
        misura_poligono(poligono_da_geojson(poligono([[9, 45], [9, 45.1], [9, 45.2], [9, 45]])))


# ---------------------------------------------------------------- area pilota


def test_posizione_rispetto_alla_lombardia():
    lombardia = geometria_lombardia()
    milano = poligono_da_geojson(poligono([[9.18, 45.46], [9.20, 45.46], [9.20, 45.47], [9.18, 45.47], [9.18, 45.46]]))
    torino = poligono_da_geojson(poligono([[7.67, 45.06], [7.69, 45.06], [7.69, 45.07], [7.67, 45.07], [7.67, 45.06]]))
    # Riquadro a cavallo del Ticino (confine Lombardia-Piemonte vicino a Vigevano/Novara)
    a_cavallo = poligono_da_geojson(poligono([[8.6, 45.3], [9.0, 45.3], [9.0, 45.5], [8.6, 45.5], [8.6, 45.3]]))
    assert posizione_rispetto_area(milano, lombardia) == "interno"
    assert posizione_rispetto_area(torino, lombardia) == "esterno"
    assert posizione_rispetto_area(a_cavallo, lombardia) == "parziale"
