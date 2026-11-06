"""Test degli endpoint HTTP."""

from __future__ import annotations

import httpx
import numpy as np
import pytest
import rasterio
from fastapi.testclient import TestClient
from pyproj import Transformer
from rasterio.transform import from_origin

from app.config import Impostazioni
from app.main import crea_app
from app.services.altimetria import SorgenteDtm
from app.services.geocodifica import ClientGeocodifica

TERRENO_BERGAMO = {
    "type": "Polygon",
    "coordinates": [
        [[9.6690, 45.6940], [9.6705, 45.6940], [9.6705, 45.6950], [9.6690, 45.6950], [9.6690, 45.6940]]
    ],
}


MOTIVO_SENZA_DTM = "Il file del DTM non è installato sul server."


@pytest.fixture()
def client():
    """Client senza DTM: l'altimetria deve risultare non disponibile."""
    with TestClient(crea_app()) as c:
        c.app.state.dtm = None
        c.app.state.motivo_dtm = MOTIVO_SENZA_DTM
        yield c


@pytest.fixture()
def dtm_sintetico(tmp_path):
    """DTM sintetico (UTM 32N, 5 m) attorno al terreno di prova: piano che sale verso Est del 12%."""
    x, y = Transformer.from_crs("EPSG:4326", "EPSG:32632", always_xy=True).transform(9.66975, 45.6945)
    x0, y0 = round(x) - 1000.0, round(y) + 1000.0
    colonne = x0 + (np.arange(400) + 0.5) * 5
    z = np.tile(200 + 0.12 * (colonne - x0), (400, 1)).astype(np.float32)
    percorso = tmp_path / "dtm.tif"
    with rasterio.open(
        percorso, "w", driver="GTiff", width=400, height=400, count=1, dtype="float32",
        crs="EPSG:32632", transform=from_origin(x0, y0, 5, 5), nodata=-3.4028234663852886e38,
    ) as ds:
        ds.write(z, 1)
    return SorgenteDtm(percorso)


@pytest.fixture()
def client_con_dtm(client, dtm_sintetico):
    client.app.state.dtm = dtm_sintetico
    client.app.state.motivo_dtm = None
    return client


def test_salute(client):
    r = client.get("/api/v1/salute")
    assert r.status_code == 200
    assert r.json()["stato"] == "ok"


def test_capacita_dichiara_cosa_non_e_disponibile(client):
    funzioni = {f["chiave"]: f for f in client.get("/api/v1/capacita").json()["funzioni"]}
    assert funzioni["superficie_perimetro"]["stato"] == "implementata"
    assert funzioni["altimetria"]["stato"] == "non_disponibile"
    assert funzioni["altimetria"]["note"] == MOTIVO_SENZA_DTM
    assert funzioni["report_pdf"]["stato"] == "non_disponibile"


def test_capacita_con_dtm(client_con_dtm):
    funzioni = {f["chiave"]: f["stato"] for f in client_con_dtm.get("/api/v1/capacita").json()["funzioni"]}
    assert funzioni["altimetria"] == funzioni["pendenza"] == funzioni["esposizione"] == "implementata"
    assert funzioni["mappa_pendenze"] == funzioni["profilo"] == "implementata"
    assert funzioni["report_pdf"] == "non_disponibile"


def test_area_pilota_restituisce_geojson(client):
    dati = client.get("/api/v1/area-pilota").json()
    assert dati["type"] == "FeatureCollection"
    assert dati["features"][0]["properties"]["nome"] == "Lombardia"


def test_analisi_geometria_valida(client):
    r = client.post("/api/v1/analisi/geometria", json={"geometria": TERRENO_BERGAMO})
    assert r.status_code == 200
    dati = r.json()
    # Circa 117 m x 111 m = ~1,3 ha
    assert 12_500 < dati["superficie"]["m2"] < 13_500
    assert dati["superficie"]["ettari"] == pytest.approx(dati["superficie"]["m2"] / 10_000)
    assert 440 < dati["perimetro"]["m"] < 470
    assert dati["area_pilota"] == {"nome": "Lombardia", "stato": "interno"}
    assert dati["controllo_utm32"]["epsg"] == 32632
    # Senza DTM nessun dato altimetrico inventato
    alt = dati["altimetria"]
    assert alt["disponibile"] is False
    assert alt["messaggio"] == "Dati altimetrici non disponibili"
    assert alt["motivo"] == MOTIVO_SENZA_DTM
    assert alt["quote"] is None and alt["pendenza"] is None and alt["esposizione"] is None
    assert "non sostituiscono" in dati["nota_legale"]
    assert dati["avvertenze"] == []


def test_analisi_fuori_lombardia_produce_avvertenza(client):
    torino = {
        "type": "Polygon",
        "coordinates": [[[7.67, 45.06], [7.68, 45.06], [7.68, 45.07], [7.67, 45.07], [7.67, 45.06]]],
    }
    dati = client.post("/api/v1/analisi/geometria", json={"geometria": torino}).json()
    assert dati["area_pilota"]["stato"] == "esterno"
    assert dati["avvertenze"]


def test_analisi_geometria_non_valida_risponde_422_in_italiano(client):
    farfalla = {
        "type": "Polygon",
        "coordinates": [[[9, 45], [9.1, 45.1], [9.1, 45], [9, 45.1], [9, 45]]],
    }
    r = client.post("/api/v1/analisi/geometria", json={"geometria": farfalla})
    assert r.status_code == 422
    assert "interseca" in r.json()["detail"]


def test_ricerca_con_servizio_simulato(client):
    risposta = [{"lat": "45.85", "lon": "9.39", "display_name": "Lecco, Lombardia, Italia", "type": "town"}]
    http = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=risposta)))
    client.app.state.geocodifica = ClientGeocodifica(Impostazioni(), http=http)
    r = client.get("/api/v1/ricerca", params={"q": "Lecco"})
    assert r.status_code == 200
    dati = r.json()
    assert dati["risultati"][0]["nome"].startswith("Lecco")
    assert "OpenStreetMap" in dati["attribuzione"]


def test_ricerca_servizio_non_disponibile_risponde_503(client):
    http = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(429)))
    client.app.state.geocodifica = ClientGeocodifica(Impostazioni(), http=http)
    r = client.get("/api/v1/ricerca", params={"q": "Pavia"})
    assert r.status_code == 503
    assert "non disponibile" in r.json()["detail"]


def test_ricerca_query_troppo_corta(client):
    assert client.get("/api/v1/ricerca", params={"q": "a"}).status_code == 422


def test_analisi_altimetrica_con_dtm(client_con_dtm):
    dati = client_con_dtm.post("/api/v1/analisi/geometria", json={"geometria": TERRENO_BERGAMO}).json()
    alt = dati["altimetria"]
    assert alt["disponibile"] is True
    assert alt["pendenza"]["media_percento"] == pytest.approx(12.0, abs=1e-3)
    assert alt["pendenza"]["media_gradi"] == pytest.approx(6.843, abs=1e-3)
    assert alt["esposizione"]["prevalente"] == "O"
    # Il terreno è largo ~117 m in direzione Est-Ovest: dislivello ~ 0,12 x 112 m
    assert 12 < alt["quote"]["dislivello"] < 14.5
    assert alt["quote"]["minima"] < alt["quote"]["media"] < alt["quote"]["massima"]
    # Il punto più basso è a Ovest di quello più alto
    assert alt["quote"]["punto_minimo"]["lon"] < alt["quote"]["punto_massimo"]["lon"]
    assert alt["celle"]["copertura_percento"] == 100
    # Circa 13.000 m² / 25 m² per cella
    assert 480 < alt["celle"]["interne"] < 560
    assert "CC BY 4.0" in alt["fonte"]["attribuzione"]
    assert sum(c["percentuale_celle"] for c in alt["pendenza"]["classi"]) == pytest.approx(100)


def test_analisi_fuori_copertura_dtm(client_con_dtm):
    torino = {
        "type": "Polygon",
        "coordinates": [[[7.67, 45.06], [7.68, 45.06], [7.68, 45.07], [7.67, 45.07], [7.67, 45.06]]],
    }
    alt = client_con_dtm.post("/api/v1/analisi/geometria", json={"geometria": torino}).json()["altimetria"]
    assert alt["disponibile"] is False
    assert "fuori" in alt["motivo"]


LINEA_BERGAMO = {"type": "LineString", "coordinates": [[9.6690, 45.6945], [9.6705, 45.6945]]}


def test_mappa_pendenze_senza_dtm(client):
    r = client.post("/api/v1/analisi/mappa", json={"geometria": TERRENO_BERGAMO, "tipo": "pendenza"})
    assert r.status_code == 200
    dati = r.json()
    assert dati["disponibile"] is False
    assert dati["immagine_png_base64"] is None


def test_mappa_pendenze_con_dtm(client_con_dtm):
    dati = client_con_dtm.post(
        "/api/v1/analisi/mappa", json={"geometria": TERRENO_BERGAMO, "tipo": "pendenza"}
    ).json()
    assert dati["disponibile"] is True
    import base64

    assert base64.b64decode(dati["immagine_png_base64"])[:8] == b"\x89PNG\r\n\x1a\n"
    assert len(dati["coordinate"]) == 4
    voci = {v["etichetta"]: v["percentuale_celle"] for v in dati["legenda"]}
    assert voci["10–15 %"] == pytest.approx(100)


def test_mappa_esposizioni_con_dtm(client_con_dtm):
    dati = client_con_dtm.post(
        "/api/v1/analisi/mappa", json={"geometria": TERRENO_BERGAMO, "tipo": "esposizione"}
    ).json()
    assert {v["etichetta"]: v["percentuale_celle"] for v in dati["legenda"]}["Ovest"] == pytest.approx(100)


def test_mappa_tipo_non_valido(client_con_dtm):
    r = client_con_dtm.post("/api/v1/analisi/mappa", json={"geometria": TERRENO_BERGAMO, "tipo": "colori"})
    assert r.status_code == 422


def test_profilo_con_dtm(client_con_dtm):
    dati = client_con_dtm.post("/api/v1/analisi/profilo", json={"geometria": LINEA_BERGAMO}).json()
    assert dati["disponibile"] is True
    # Linea Ovest -> Est di ~117 m su un piano che sale del 12 % verso Est
    assert 115 < dati["lunghezza_m"] < 119
    assert dati["salita_m"] == pytest.approx(0.12 * dati["lunghezza_m"], rel=2e-3)
    assert dati["discesa_m"] == pytest.approx(0, abs=1e-6)
    assert dati["punti"][0]["distanza_m"] == 0
    assert "bilineare" in dati["metodo"]


def test_profilo_senza_dtm_e_linea_non_valida(client):
    dati = client.post("/api/v1/analisi/profilo", json={"geometria": LINEA_BERGAMO}).json()
    assert dati["disponibile"] is False and dati["punti"] == []
    r = client.post("/api/v1/analisi/profilo", json={"geometria": {"type": "LineString", "coordinates": [[9, 45]]}})
    assert r.status_code == 422
