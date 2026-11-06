"""Test del report PDF (Fase 4): si legge il testo del PDF generato."""

from __future__ import annotations

from io import BytesIO

import pypdf
import pytest

from app.services.report import numero, salita_discesa, superficie_catastale
from tests.test_api import TERRENO_BERGAMO, client, client_con_dtm, dtm_sintetico  # noqa: F401 (fixture)

LINEA = {"type": "LineString", "coordinates": [[9.6690, 45.6945], [9.6705, 45.6945]]}


def estrai_testo(contenuto: bytes) -> tuple[list[str], str]:
    pagine = [pagina.extract_text() or "" for pagina in pypdf.PdfReader(BytesIO(contenuto)).pages]
    return pagine, "\n".join(pagine)


def scarica(client, **corpo):
    risposta = client.post("/api/v1/report", json={"geometria": TERRENO_BERGAMO, **corpo})
    assert risposta.status_code == 200, risposta.text
    assert risposta.headers["content-type"] == "application/pdf"
    assert risposta.content.startswith(b"%PDF")
    return risposta


def test_formattazione_italiana():
    assert numero(12345.678) == "12.346"
    assert numero(9115.2) == "9.115"
    assert numero(1234.5, 1) == "1.234,5"
    assert numero(-0.00001, 1) == "0,0"
    assert superficie_catastale(12345.6) == "1 ha 23 are 46 ca"
    assert salita_discesa(60.0, 0.0) == "+60,0 m / 0,0 m"
    assert salita_discesa(12.34, 5.0) == "+12,3 m / -5,0 m"


def test_report_senza_dtm_dichiara_i_dati_non_disponibili(client):
    risposta = scarica(client)
    assert 'filename="terrascan-report-TS-' in risposta.headers["content-disposition"]
    pagine, testo = estrai_testo(risposta.content)
    analisi = client.post("/api/v1/analisi/geometria", json={"geometria": TERRENO_BERGAMO}).json()
    # La superficie nel PDF è quella calcolata dal server, in formato italiano
    assert f"{numero(analisi['superficie']['m2'])} m²" in testo
    assert "Dati altimetrici non disponibili" in testo
    assert "Quota minima" not in testo
    assert "Profilo altimetrico" not in testo  # nessuna linea richiesta
    # Avvertenza a piè di pagina su ogni pagina e avvertenza legale finale
    assert all("non sostituisce un rilievo" in p for p in pagine)
    assert "non sostituiscono un rilievo topografico" in testo


def test_report_completo_con_dtm_e_profilo(client_con_dtm):
    risposta = scarica(client_con_dtm, linea=LINEA)
    _, testo = estrai_testo(risposta.content)
    for atteso in (
        "Analisi altimetrica",
        "Quota minima",
        "Pendenza media",
        "12,0 %",  # piano sintetico al 12 %
        "Ovest",
        "Mappa delle pendenze",
        "Mappa delle esposizioni",
        "Profilo altimetrico (A-B)",
        "Coordinate dei vertici",
        "CC BY 4.0",
    ):
        assert atteso in testo, atteso
    assert "Dati altimetrici non disponibili" not in testo


def test_profilo_fuori_copertura_dichiarato(client_con_dtm):
    torino = {"type": "LineString", "coordinates": [[7.67, 45.06], [7.68, 45.06]]}
    _, testo = estrai_testo(scarica(client_con_dtm, linea=torino).content)
    assert "Profilo altimetrico (A-B)" in testo
    assert "fuori dall'area coperta" in testo


def test_campi_utente_non_diventano_markup(client):
    campi = {"committente": "Az. Agricola <b>Rossi</b> & figli", "riferimento": "Pratica 12/2026", "note": ""}
    _, testo = estrai_testo(scarica(client, campi=campi).content)
    assert "<b>Rossi</b> & figli" in testo
    assert "Pratica 12/2026" in testo
    assert "non verificati" in testo


@pytest.mark.parametrize(
    "corpo",
    [
        {"geometria": {"type": "Point", "coordinates": [9, 45]}},
        {"geometria": TERRENO_BERGAMO, "linea": {"type": "LineString", "coordinates": [[9, 45]]}},
        {"geometria": TERRENO_BERGAMO, "campi": {"note": "x" * 601}},
    ],
)
def test_richieste_non_valide(client, corpo):
    assert client.post("/api/v1/report", json=corpo).status_code == 422
