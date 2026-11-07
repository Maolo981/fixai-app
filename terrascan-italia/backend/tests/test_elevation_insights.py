"""Test di Elevation Insights: gradiente altimetrico, curve di livello, quota puntuale, tratti del profilo."""

from __future__ import annotations

import io
import math
import warnings

import numpy as np
import pytest
import rasterio
from pyproj import Transformer

from app.services.altimetria import AltimetriaNonDisponibile, SorgenteDtm
from app.services.curve import calcola_curve, intervallo_consigliato, valuta_intervalli
from app.services.mappe import GRADIENTE_QUOTA, crea_mappa
from app.services.profilo import calcola_profilo, quota_punto
from tests.test_altimetria import CELLA, N, TERRENO, X0, Y0, crea_dtm, quadrato_wgs84
from tests.test_api import TERRENO_BERGAMO, client, client_con_dtm, dtm_sintetico  # noqa: F401
from tests.test_fase3 import linea_wgs84

A_UTM = Transformer.from_crs("EPSG:4326", "EPSG:32632", always_xy=True)
A_WGS = Transformer.from_crs("EPSG:32632", "EPSG:4326", always_xy=True)
SUD = Y0 - N * CELLA


def piano(tmp_path, nome="piano.tif", **kw):
    return SorgenteDtm(crea_dtm(tmp_path / nome, lambda x, y: 100 + 0.12 * x, **kw))


def rgba(png: bytes) -> np.ndarray:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", rasterio.errors.NotGeoreferencedWarning)
        with rasterio.open(io.BytesIO(png)) as ds:
            return ds.read()


def hex_rgb(colore: str) -> tuple[int, int, int]:
    return tuple(int(colore[i : i + 2], 16) for i in (1, 3, 5))


# ------------------------------------------------------------------ gradiente altimetrico


def test_gradiente_altimetrico_va_dal_minimo_al_massimo(tmp_path):
    m = crea_mappa(piano(tmp_path), TERRENO, "quota")
    # La scala coincide con le quote reali delle celle interne (x = 102,5 ... 297,5 m)
    assert m.scala.minima == pytest.approx(100 + 0.12 * 102.5, abs=1e-3)
    assert m.scala.massima == pytest.approx(100 + 0.12 * 297.5, abs=1e-3)
    assert len(m.scala.tappe) == 5
    assert m.scala.tappe[0][1] == GRADIENTE_QUOTA[0][1]
    assert m.scala.tappe[-1][1] == GRADIENTE_QUOTA[-1][1]
    img = rgba(m.png)
    opache = np.argwhere(img[3] == 255)
    assert len(opache) == 1600 == m.celle_colorate
    righe, colonne = opache[:, 0], opache[:, 1]
    sx, dx = colonne.min(), colonne.max()
    r = righe[0]
    # Bordo Ovest (più basso) = primo colore del gradiente, bordo Est (più alto) = ultimo
    assert tuple(img[:3, r, sx]) == hex_rgb(GRADIENTE_QUOTA[0][1])
    assert tuple(img[:3, r, dx]) == hex_rgb(GRADIENTE_QUOTA[-1][1])
    # Fuori dal lotto: trasparente
    assert img[3, 0, 0] == 0


def test_gradiente_su_terreno_piatto(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "p.tif", lambda x, y: np.full_like(x, 197.0)))
    m = crea_mappa(dtm, TERRENO, "quota")
    assert m.scala.minima == m.scala.massima == pytest.approx(197.0)


# ------------------------------------------------------------------ curve di livello


def test_intervalli_ammessi_rispettano_accuratezza_e_leggibilita():
    intervalli = {i.metri: i for i in valuta_intervalli(112.3, 135.7)}
    assert not intervalli[1.0].ammesso and "accuratezza" in intervalli[1.0].motivo
    assert intervalli[2.0].ammesso and intervalli[2.0].livelli == 11  # 114, 116, ... 134
    assert intervalli[5.0].livelli == 5  # 115 ... 135
    assert not intervalli[100.0].ammesso  # nessuna curva nel dislivello
    assert intervallo_consigliato(list(intervalli.values())) == 2.0
    # Grande dislivello: 2 m darebbero troppe curve
    grande = {i.metri: i for i in valuta_intervalli(400, 900)}
    assert not grande[2.0].ammesso and "Troppe" in grande[2.0].motivo
    assert grande[25.0].ammesso and grande[25.0].livelli == 21
    # 25 m darebbe 21 curve (oltre le 20 ideali): si consiglia 50 m
    assert intervallo_consigliato(list(grande.values())) == 50.0


def test_curve_di_un_piano_sono_rette_alla_posizione_esatta(tmp_path):
    c = calcola_curve(piano(tmp_path), TERRENO, 5.0)
    quote = [f["properties"]["quota"] for f in c.geojson["features"]]
    assert quote == [115.0, 120.0, 125.0, 130.0, 135.0]
    for f in c.geojson["features"]:
        atteso_x = X0 + (f["properties"]["quota"] - 100) / 0.12
        for tratto in f["geometry"]["coordinates"]:
            for lon, lat in tratto:
                x, y = A_UTM.transform(lon, lat)
                assert x == pytest.approx(atteso_x, abs=0.01)
                assert SUD + 100 - 0.01 <= y <= SUD + 300 + 0.01  # ritagliate sul lotto
    direttrici = [f["properties"]["quota"] for f in c.geojson["features"] if f["properties"]["direttrice"]]
    assert direttrici == [125.0]


def test_curve_intervallo_automatico_e_non_ammesso(tmp_path):
    dtm = piano(tmp_path)
    assert calcola_curve(dtm, TERRENO, None).intervallo_m == 2.0
    with pytest.raises(AltimetriaNonDisponibile, match="accuratezza"):
        calcola_curve(dtm, TERRENO, 1.0)


def test_curve_su_terreno_piatto_non_disponibili(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "piatto.tif", lambda x, y: np.full_like(x, 65.0)))
    with pytest.raises(AltimetriaNonDisponibile, match="pianeggiante"):
        calcola_curve(dtm, TERRENO, None)


def test_curve_si_interrompono_dove_manca_il_dato(tmp_path):
    dtm = piano(tmp_path, "buchi.tif", nodata_maschera=lambda x, y: y > 200)
    c = calcola_curve(dtm, TERRENO, 5.0)
    for f in c.geojson["features"]:
        for tratto in f["geometry"]["coordinates"]:
            for lon, lat in tratto:
                _, y = A_UTM.transform(lon, lat)
                assert y <= SUD + 200 + CELLA  # solo nella metà con dati


# ------------------------------------------------------------------ quota puntuale


def test_quota_puntuale_bilineare_esatta_su_un_piano(tmp_path):
    dtm = piano(tmp_path)
    x, y = X0 + 333.3, SUD + 444.4
    lon, lat = A_WGS.transform(x, y)
    q = quota_punto(dtm, lon, lat)
    assert q.quota_m == pytest.approx(100 + 0.12 * 333.3, abs=1e-3)
    # Valore della cella che contiene il punto (centro a x = 332,5)
    assert q.quota_cella_m == pytest.approx(100 + 0.12 * 332.5, abs=1e-3)
    assert q.est_utm == pytest.approx(x, abs=1e-3)


def test_quota_puntuale_fuori_copertura_o_senza_dato(tmp_path):
    dtm = piano(tmp_path, "nd.tif", nodata_maschera=lambda x, y: x > 500)
    with pytest.raises(AltimetriaNonDisponibile, match="fuori"):
        quota_punto(dtm, *A_WGS.transform(X0 - 500, SUD + 100))
    with pytest.raises(AltimetriaNonDisponibile, match="non ha dati"):
        quota_punto(dtm, *A_WGS.transform(X0 + 700, SUD + 100))


# ------------------------------------------------------------------ tratti del profilo


def test_tratti_del_profilo_tra_i_vertici(tmp_path):
    dtm = piano(tmp_path)
    p = calcola_profilo(dtm, linea_wgs84((200, 500), (500, 500), (500, 800), (300, 800)))
    assert len(p.tratti) == 3
    salita, piano_nord, discesa = p.tratti
    assert salita.dislivello_m == pytest.approx(0.12 * 300, abs=1e-3)
    assert salita.pendenza_percento == pytest.approx(12.0, rel=2e-3)  # scala UTM ~0,9996
    assert piano_nord.dislivello_m == pytest.approx(0, abs=1e-3)
    assert discesa.pendenza_percento == pytest.approx(-12.0, rel=2e-3)
    assert salita.da_m == 0 and discesa.a_m == pytest.approx(p.lunghezza_m, rel=1e-9)


# ------------------------------------------------------------------ API


def test_api_curve_e_quota(client_con_dtm):
    r = client_con_dtm.post("/api/v1/analisi/curve", json={"geometria": TERRENO_BERGAMO}).json()
    assert r["disponibile"] is True and r["numero_curve"] > 0
    assert any(i["metri"] == 1.0 and not i["ammesso"] for i in r["intervalli"])
    assert r["geojson"]["type"] == "FeatureCollection"
    q = client_con_dtm.get("/api/v1/quota", params={"lon": 9.6697, "lat": 45.6945}).json()
    assert q["disponibile"] is True and 200 < q["quota_m"] < 400
    fuori = client_con_dtm.get("/api/v1/quota", params={"lon": 7.68, "lat": 45.07}).json()
    assert fuori["disponibile"] is False and "fuori" in fuori["motivo"]
    m = client_con_dtm.post("/api/v1/analisi/mappa", json={"geometria": TERRENO_BERGAMO, "tipo": "quota"}).json()
    assert m["scala"]["minima"] < m["scala"]["massima"] and len(m["scala"]["tappe"]) == 5


def test_api_senza_dtm_niente_valori(client):
    assert client.post("/api/v1/analisi/curve", json={"geometria": TERRENO_BERGAMO}).json()["disponibile"] is False
    q = client.get("/api/v1/quota", params={"lon": 9.67, "lat": 45.69}).json()
    assert q["disponibile"] is False and q["quota_m"] is None
    # La distanza della linea è geodetica: disponibile anche senza DTM
    linea = {"type": "LineString", "coordinates": [[9.6690, 45.6945], [9.6705, 45.6945]]}
    p = client.post("/api/v1/analisi/profilo", json={"geometria": linea}).json()
    assert p["disponibile"] is False and 115 < p["lunghezza_m"] < 119


def test_quota_parametri_non_validi(client):
    assert client.get("/api/v1/quota", params={"lon": 200, "lat": 45}).status_code == 422
    assert client.post("/api/v1/analisi/curve", json={"geometria": TERRENO_BERGAMO, "intervallo_m": -5}).status_code == 422


def test_quadrato_helper_coerente():
    # Controllo di coerenza dell'helper dei test (usato sopra)
    poligono = quadrato_wgs84(0, 0, 10, 10)
    x, y = A_UTM.transform(*poligono.exterior.coords[0])
    assert x == pytest.approx(X0, abs=1e-6) and y == pytest.approx(SUD, abs=1e-6)
    assert math.isclose(CELLA, 5.0)
