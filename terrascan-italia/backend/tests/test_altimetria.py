"""Test dell'analisi altimetrica su DTM sintetici con risultato noto in modo esatto.

Ogni test crea un piccolo GeoTIFF (UTM 32N, celle 5 m) con una superficie
matematica: per un piano z = a·x + b·y la pendenza vale esattamente
100·sqrt(a² + b²) % e l'esposizione è la direzione opposta al gradiente.
"""

from __future__ import annotations

import math

import numpy as np
import pytest
import rasterio
from pyproj import Transformer
from rasterio.transform import from_origin
from shapely.geometry import Polygon

from app.services.altimetria import (
    AltimetriaNonDisponibile,
    SorgenteDtm,
    pendenza_esposizione_horn,
    settore_esposizione,
)

X0, Y0 = 500_000.0, 5_000_000.0  # angolo Nord-Ovest del raster sintetico (UTM 32N)
CELLA = 5.0
N = 200  # 200 x 200 celle = 1 km x 1 km
NODATA = -3.4028234663852886e38  # stesso valore "nodata" del DTM regionale

_UTM_A_WGS = Transformer.from_crs("EPSG:32632", "EPSG:4326", always_xy=True)
_WGS_A_UTM = Transformer.from_crs("EPSG:4326", "EPSG:32632", always_xy=True)


def crea_dtm(percorso, funzione, epsg=32632, cella=CELLA, nodata_maschera=None):
    """Scrive un GeoTIFF con quote z = funzione(x_est, y_nord) nei centri cella."""
    colonne = X0 + (np.arange(N) + 0.5) * cella
    righe = Y0 - (np.arange(N) + 0.5) * cella
    xx, yy = np.meshgrid(colonne, righe)
    z = funzione(xx - X0, yy - (Y0 - N * cella)).astype(np.float32)
    if nodata_maschera is not None:
        z[nodata_maschera(xx - X0, yy - (Y0 - N * cella))] = NODATA
    with rasterio.open(
        percorso, "w", driver="GTiff", width=N, height=N, count=1, dtype="float32",
        crs=f"EPSG:{epsg}", transform=from_origin(X0, Y0, cella, cella), nodata=NODATA,
    ) as ds:
        ds.write(z, 1)
    return percorso


def quadrato_wgs84(x_min, y_min, x_max, y_max) -> Polygon:
    """Rettangolo definito in metri rispetto all'angolo Sud-Ovest del raster, in lon/lat."""
    sud = Y0 - N * CELLA
    vertici = [(x_min, y_min), (x_max, y_min), (x_max, y_max), (x_min, y_max)]
    return Polygon([_UTM_A_WGS.transform(X0 + x, sud + y) for x, y in vertici])


# Rettangolo allineato ai bordi delle celle: colonne/righe da 20 a 59 (40 x 40 = 1600 celle)
TERRENO = quadrato_wgs84(100.0, 100.0, 300.0, 300.0)


def test_piano_che_sale_verso_est(tmp_path):
    # z = 100 + 0,12·x  ->  pendenza 12 %, il terreno scende verso Ovest
    dtm = SorgenteDtm(crea_dtm(tmp_path / "est.tif", lambda x, y: 100 + 0.12 * x))
    r = dtm.analizza(TERRENO)
    assert r.celle_interne == 1600
    assert r.celle_valide == 1600
    assert r.copertura_percento == 100
    # Centri cella interni: da x = 102,5 m a x = 297,5 m
    assert r.quota_minima == pytest.approx(100 + 0.12 * 102.5, abs=1e-3)
    assert r.quota_massima == pytest.approx(100 + 0.12 * 297.5, abs=1e-3)
    assert r.quota_media == pytest.approx(100 + 0.12 * 200.0, abs=1e-3)
    assert r.dislivello == pytest.approx(0.12 * 195.0, abs=1e-3)
    assert r.pendenza_media_percento == pytest.approx(12.0, abs=1e-3)
    assert r.pendenza_massima_percento == pytest.approx(12.0, abs=1e-3)
    assert r.gradi(r.pendenza_media_percento) == pytest.approx(math.degrees(math.atan(0.12)), abs=1e-4)
    assert r.esposizione_prevalente == "O"
    assert r.esposizione_settori["O"] == pytest.approx(100.0)
    classi = {(da, a): q for da, a, q in r.classi_pendenza}
    assert classi[(10.0, 15.0)] == pytest.approx(100.0)
    assert sum(classi.values()) == pytest.approx(100.0)
    assert r.avvertenze == []


def test_piano_che_sale_verso_nord_e_esposto_a_sud(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "nord.tif", lambda x, y: 300 + 0.25 * y))
    r = dtm.analizza(TERRENO)
    assert r.pendenza_media_percento == pytest.approx(25.0, abs=1e-3)
    assert r.esposizione_prevalente == "S"
    assert r.esposizione_settori["S"] == pytest.approx(100.0)


def test_piano_obliquo_pendenza_e_esposizione(tmp_path):
    # Gradiente (0,066 Est; 0,088 Nord): pendenza = 100·sqrt(0,066² + 0,088²) = 11 %
    # Il terreno scende verso Sud-Ovest: azimut 180° + atan(66/88) = 216,87°
    dtm = SorgenteDtm(crea_dtm(tmp_path / "obliquo.tif", lambda x, y: 50 + 0.066 * x + 0.088 * y))
    r = dtm.analizza(TERRENO)
    assert r.pendenza_media_percento == pytest.approx(11.0, abs=1e-3)
    assert r.esposizione_prevalente == "SO"


def test_terreno_piatto(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "piatto.tif", lambda x, y: np.full_like(x, 197.0)))
    r = dtm.analizza(TERRENO)
    assert r.quota_minima == r.quota_massima == pytest.approx(197.0)
    assert r.dislivello == 0
    assert r.pendenza_massima_percento == 0
    assert r.esposizione_prevalente == "Pianeggiante"
    assert r.esposizione_settori["Pianeggiante"] == pytest.approx(100.0)


def test_posizione_dei_punti_minimo_e_massimo(tmp_path):
    # Un solo "picco" a 500 m in una pianura a 100 m
    picco = (152.5, 247.5)  # centro della cella
    dtm = SorgenteDtm(
        crea_dtm(
            tmp_path / "picco.tif",
            lambda x, y: np.where(np.isclose(x, picco[0]) & np.isclose(y, picco[1]), 500.0, 100.0),
        )
    )
    r = dtm.analizza(TERRENO)
    assert r.quota_massima == 500.0
    x, y = _WGS_A_UTM.transform(r.punto_massimo.lon, r.punto_massimo.lat)
    assert x == pytest.approx(X0 + picco[0], abs=0.01)
    assert y == pytest.approx(Y0 - N * CELLA + picco[1], abs=0.01)


def test_celle_senza_dati_riducono_la_copertura(tmp_path):
    # Metà Ovest del terreno senza dati (x < 200 m)
    dtm = SorgenteDtm(
        crea_dtm(tmp_path / "buchi.tif", lambda x, y: 100 + 0.12 * x, nodata_maschera=lambda x, y: x < 200)
    )
    r = dtm.analizza(TERRENO)
    assert r.celle_valide == 800
    assert r.copertura_percento == pytest.approx(50.0)
    assert r.quota_minima == pytest.approx(100 + 0.12 * 202.5, abs=1e-3)
    assert any("copre solo" in a for a in r.avvertenze)
    # Le celle al confine con i "buchi" non hanno tutti i vicini: niente pendenza
    assert r.celle_con_pendenza == 800 - 40


def test_terreno_senza_alcun_dato(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "vuoto.tif", lambda x, y: x, nodata_maschera=lambda x, y: x >= 0))
    with pytest.raises(AltimetriaNonDisponibile, match="quote valide"):
        dtm.analizza(TERRENO)


def test_terreno_fuori_dal_dtm(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "f.tif", lambda x, y: x))
    with pytest.raises(AltimetriaNonDisponibile, match="fuori"):
        dtm.analizza(quadrato_wgs84(5000, 5000, 5100, 5100))


def test_terreno_piu_piccolo_di_una_cella(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "p.tif", lambda x, y: x))
    # Quadrato di 2 x 2 m attorno all'angolo di una cella: nessun centro cella all'interno
    with pytest.raises(AltimetriaNonDisponibile, match="troppo piccolo"):
        dtm.analizza(quadrato_wgs84(99.0, 99.0, 101.0, 101.0))


def test_poche_celle_producono_avvertenza(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "poche.tif", lambda x, y: 100 + 0.12 * x))
    r = dtm.analizza(quadrato_wgs84(100.0, 100.0, 115.0, 115.0))  # 3 x 3 celle
    assert r.celle_valide == 9
    assert any("poco rappresentative" in a for a in r.avvertenze)


def test_terreno_troppo_esteso(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "g.tif", lambda x, y: x))
    with pytest.raises(AltimetriaNonDisponibile, match="supera"):
        dtm.analizza(quadrato_wgs84(0, 0, 8000, 8000))


def test_file_mancante(tmp_path):
    with pytest.raises(AltimetriaNonDisponibile, match="non è installato"):
        SorgenteDtm(tmp_path / "inesistente.tif")


def test_sistema_di_riferimento_errato(tmp_path):
    with pytest.raises(AltimetriaNonDisponibile, match="EPSG:32633"):
        SorgenteDtm(crea_dtm(tmp_path / "crs.tif", lambda x, y: x, epsg=32633))


def test_risoluzione_errata(tmp_path):
    with pytest.raises(AltimetriaNonDisponibile, match="celle di 20.0"):
        SorgenteDtm(crea_dtm(tmp_path / "res.tif", lambda x, y: x, cella=20.0))


# ---------------------------------------------------------------- funzioni di base


def test_horn_lascia_vuote_le_celle_con_vicini_mancanti():
    z = np.arange(25, dtype=float).reshape(5, 5)
    z[2, 2] = np.nan
    pendenza, esposizione = pendenza_esposizione_horn(z, 5.0, 5.0)
    # Bordi e vicini della cella mancante: nessun valore
    assert np.isnan(pendenza[0]).all() and np.isnan(pendenza[:, 0]).all()
    assert np.isnan(pendenza[1:4, 1:4]).all()


def test_horn_esposizione_azimut():
    y, x = np.mgrid[0:5, 0:5].astype(float)  # y = indice di riga (cresce verso Sud)
    # Piano che sale verso Est: il terreno guarda a Ovest (270°)
    _, esp = pendenza_esposizione_horn(x * 1.0, 1.0, 1.0)
    assert esp[2, 2] == pytest.approx(270.0)
    # Piano che sale verso Sud: il terreno guarda a Nord (0°)
    _, esp = pendenza_esposizione_horn(y * 1.0, 1.0, 1.0)
    assert esp[2, 2] % 360 == pytest.approx(0.0)
    # Piano che sale verso Est e Nord (0,066; 0,088): guarda a Sud-Ovest
    _, esp = pendenza_esposizione_horn(0.066 * x - 0.088 * y, 1.0, 1.0)
    assert esp[2, 2] == pytest.approx(180 + math.degrees(math.atan2(0.066, 0.088)))


def test_settori_esposizione():
    assert list(settore_esposizione(np.array([0, 22.4, 22.6, 90, 180, 225, 270, 337.4, 337.6, 359.9]))) == [
        0, 0, 1, 2, 4, 5, 6, 7, 0, 0,
    ]
