"""Test delle tessere di elevazione per la vista 3D (solo visualizzazione)."""

from __future__ import annotations

import io
import math
import warnings

import numpy as np
import pytest
import rasterio
from pyproj import Transformer

from app.services.tessere_dem import (
    TesseraNonValida,
    codifica_terrarium,
    decodifica_terrarium,
    limiti_tessera,
    quote_tessera,
)
from tests.test_api import client, client_con_dtm, dtm_sintetico  # noqa: F401

DA_3857_A_UTM = Transformer.from_crs("EPSG:3857", "EPSG:32632", always_xy=True)


def tessera_di(lon: float, lat: float, z: int) -> tuple[int, int]:
    n = 2**z
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
    return x, y


def quota_attesa_piano(dtm, x3857: float, y3857: float) -> float:
    """Quota del piano sintetico di test_api: 200 + 0,12 * (Est - origine)."""
    est, _ = DA_3857_A_UTM.transform(x3857, y3857)
    return 200 + 0.12 * (est - dtm.bounds.left)


def test_codifica_terrarium_andata_e_ritorno():
    quote = np.array([[-12.5, 0.0, 119.79], [592.3, 4024.98, 65.0]])
    decodificate = decodifica_terrarium(codifica_terrarium(quote))
    assert np.allclose(decodificate, quote, atol=1 / 512)
    # Senza dato -> 0 m (dichiarato in interfaccia)
    assert decodifica_terrarium(codifica_terrarium(np.array([[np.nan]])))[0, 0] == 0


def test_limiti_tessera():
    o, s, e, n = limiti_tessera(0, 0, 0)
    assert o == pytest.approx(-20037508.34, abs=0.01) and n == pytest.approx(20037508.34, abs=0.01)
    with pytest.raises(TesseraNonValida):
        limiti_tessera(3, 8, 0)


def test_quote_della_tessera_su_un_piano_sono_esatte(dtm_sintetico):
    z = 16
    tx, ty = tessera_di(9.66975, 45.6945, z)
    quote = quote_tessera(dtm_sintetico, z, tx, ty)
    assert quote is not None and quote.shape == (256, 256)
    o, s, e, n = limiti_tessera(z, tx, ty)
    passo = (e - o) / 256
    for riga in (40, 128, 210):
        for colonna in (40, 128, 210):
            x = o + (colonna + 0.5) * passo
            y = n - (riga + 0.5) * passo
            assert quote[riga, colonna] == pytest.approx(quota_attesa_piano(dtm_sintetico, x, y), abs=0.01)


def test_tessera_fuori_dal_dtm_e_zoom_non_ammesso(dtm_sintetico):
    assert quote_tessera(dtm_sintetico, 12, *tessera_di(7.68, 45.07, 12)) is None  # Torino
    with pytest.raises(TesseraNonValida, match="Zoom"):
        quote_tessera(dtm_sintetico, 5, 16, 11)


def test_api_tessera(client_con_dtm, dtm_sintetico):
    tx, ty = tessera_di(9.66975, 45.6945, 16)
    r = client_con_dtm.get(f"/api/v1/tessere/dem/16/{tx}/{ty}.png")
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"
    assert "max-age" in r.headers["cache-control"]
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", rasterio.errors.NotGeoreferencedWarning)
        with rasterio.open(io.BytesIO(r.content)) as png:
            rgb = png.read()
    quote = decodifica_terrarium(rgb)
    o, s, e, n = limiti_tessera(16, tx, ty)
    passo = (e - o) / 256
    attesa = quota_attesa_piano(dtm_sintetico, o + 128.5 * passo, n - 128.5 * passo)
    assert quote[128, 128] == pytest.approx(attesa, abs=0.01)
    # Fuori copertura: nessun contenuto; tessera inesistente: 404
    assert client_con_dtm.get("/api/v1/tessere/dem/12/{}/{}.png".format(*tessera_di(7.68, 45.07, 12))).status_code == 204
    assert client_con_dtm.get("/api/v1/tessere/dem/12/99999/1.png").status_code == 404


def test_api_tessera_senza_dtm(client):
    assert client.get("/api/v1/tessere/dem/12/2157/1468.png").status_code == 503
