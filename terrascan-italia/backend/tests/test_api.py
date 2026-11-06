"""Test degli endpoint HTTP."""

from __future__ import annotations

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Impostazioni
from app.main import crea_app
from app.services.geocodifica import ClientGeocodifica

TERRENO_BERGAMO = {
    "type": "Polygon",
    "coordinates": [
        [[9.6690, 45.6940], [9.6705, 45.6940], [9.6705, 45.6950], [9.6690, 45.6950], [9.6690, 45.6940]]
    ],
}


@pytest.fixture()
def client():
    with TestClient(crea_app()) as c:
        yield c


def test_salute(client):
    r = client.get("/api/v1/salute")
    assert r.status_code == 200
    assert r.json()["stato"] == "ok"


def test_capacita_dichiara_cosa_non_e_disponibile(client):
    funzioni = {f["chiave"]: f["stato"] for f in client.get("/api/v1/capacita").json()["funzioni"]}
    assert funzioni["superficie_perimetro"] == "implementata"
    assert funzioni["altimetria"] == "non_disponibile"
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
    # Nessun dato altimetrico inventato
    assert dati["altimetria"] == {"disponibile": False, "messaggio": "Dati altimetrici non disponibili"}
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
