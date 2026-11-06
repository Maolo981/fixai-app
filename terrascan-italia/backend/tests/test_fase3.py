"""Test della Fase 3: mappe tematiche e profilo altimetrico, su DTM sintetici."""

from __future__ import annotations

import io
import math

import numpy as np
import pytest
import rasterio
from pyproj import Geod, Transformer
from shapely.geometry import LineString

from app.services.altimetria import AltimetriaNonDisponibile, FinestraDtm, SorgenteDtm
from app.services.geometria import ErroreGeometria, linea_da_geojson
from app.services.mappe import COLORI_ESPOSIZIONE, COLORI_PENDENZA, crea_mappa
from app.services.profilo import PASSO_M, calcola_profilo, quota_bilineare
from tests.test_altimetria import CELLA, N, TERRENO, X0, Y0, crea_dtm

_UTM_A_WGS = Transformer.from_crs("EPSG:32632", "EPSG:4326", always_xy=True)
SUD = Y0 - N * CELLA


def linea_wgs84(*punti_m: tuple[float, float]) -> LineString:
    """Linea con vertici in metri rispetto all'angolo Sud-Ovest del raster sintetico."""
    return LineString([_UTM_A_WGS.transform(X0 + x, SUD + y) for x, y in punti_m])


def leggi_png(contenuto: bytes) -> np.ndarray:
    import warnings

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", rasterio.errors.NotGeoreferencedWarning)
        with rasterio.open(io.BytesIO(contenuto)) as ds:
            return ds.read()


def rgb(colore: str) -> list[int]:
    return [int(colore[i : i + 2], 16) for i in (1, 3, 5)]


# ---------------------------------------------------------------- mappe


def test_mappa_pendenze_di_un_piano(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "piano.tif", lambda x, y: 100 + 0.12 * x))
    mappa = crea_mappa(dtm, TERRENO, "pendenza")
    immagine = leggi_png(mappa.png)
    assert immagine.shape == (4, mappa.altezza, mappa.larghezza)
    # 40 x 40 celle colorate (quelle interne), tutte nella classe 10–15 %
    assert mappa.celle_colorate == 1600
    opache = immagine[3] == 255
    assert opache.sum() == 1600
    colori = {tuple(immagine[:3, r, c]) for r, c in zip(*np.nonzero(opache))}
    assert colori == {tuple(rgb(COLORI_PENDENZA[2]))}
    voci = {v.etichetta: v.percentuale_celle for v in mappa.legenda}
    assert voci["10–15 %"] == pytest.approx(100.0)
    assert voci["oltre 50 %"] == 0


def test_mappa_esposizioni_di_un_piano_esposto_a_sud(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "nord.tif", lambda x, y: 300 + 0.25 * y))
    mappa = crea_mappa(dtm, TERRENO, "esposizione")
    immagine = leggi_png(mappa.png)
    opache = immagine[3] == 255
    colori = {tuple(immagine[:3, r, c]) for r, c in zip(*np.nonzero(opache))}
    assert colori == {tuple(rgb(COLORI_ESPOSIZIONE["S"]))}
    assert {v.etichetta: v.percentuale_celle for v in mappa.legenda}["Sud"] == pytest.approx(100.0)


def test_angoli_della_mappa_georeferenziati(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "g.tif", lambda x, y: x * 0.1))
    mappa = crea_mappa(dtm, TERRENO, "pendenza")
    a_utm = Transformer.from_crs("EPSG:4326", "EPSG:32632", always_xy=True)
    alto_sx = a_utm.transform(*mappa.coordinate[0])
    basso_dx = a_utm.transform(*mappa.coordinate[2])
    # Gli angoli devono cadere sui bordi delle celle del DTM (multipli di 5 m dall'origine)
    for valore, origine in ((alto_sx[0], X0), (basso_dx[0], X0), (alto_sx[1], Y0), (basso_dx[1], Y0)):
        assert ((valore - origine) / CELLA) == pytest.approx(round((valore - origine) / CELLA), abs=1e-6)
    assert (basso_dx[0] - alto_sx[0]) / CELLA == pytest.approx(mappa.larghezza, abs=1e-6)
    assert (alto_sx[1] - basso_dx[1]) / CELLA == pytest.approx(mappa.altezza, abs=1e-6)


# ---------------------------------------------------------------- interpolazione


def test_quota_bilineare_esatta_sui_centri_e_tra_le_celle():
    z = np.array([[10.0, 20.0], [30.0, 40.0]])
    t = rasterio.transform.from_origin(0, 10, 5, 5)  # centri: (2,5;7,5) (7,5;7,5) (2,5;2,5) (7,5;2,5)
    f = FinestraDtm(z=z, trasformazione=t, cella_x=5, cella_y=5)
    x = np.array([2.5, 7.5, 5.0, 5.0, 100.0])
    y = np.array([7.5, 2.5, 5.0, 7.5, 5.0])
    q = quota_bilineare(f, x, y)
    assert q[0] == pytest.approx(10.0)
    assert q[1] == pytest.approx(40.0)
    assert q[2] == pytest.approx(25.0)  # centro dei 4 centri cella: media
    assert q[3] == pytest.approx(15.0)  # a metà tra 10 e 20
    assert np.isnan(q[4])  # fuori dalla finestra


def test_quota_bilineare_senza_vicino_resta_vuota():
    z = np.array([[10.0, np.nan], [30.0, 40.0]])
    f = FinestraDtm(z=z, trasformazione=rasterio.transform.from_origin(0, 10, 5, 5), cella_x=5, cella_y=5)
    assert np.isnan(quota_bilineare(f, np.array([5.0]), np.array([5.0]))[0])


# ---------------------------------------------------------------- profilo


def test_profilo_su_un_piano_in_salita_verso_est(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "est.tif", lambda x, y: 100 + 0.12 * x))
    # Linea Ovest -> Est lunga 500 m, a metà raster
    p = calcola_profilo(dtm, linea_wgs84((200, 500), (700, 500)))
    assert p.copertura_percento == 100
    assert p.quota_iniziale == pytest.approx(100 + 0.12 * 200, abs=1e-3)
    assert p.quota_finale == pytest.approx(100 + 0.12 * 700, abs=1e-3)
    assert p.salita_m == pytest.approx(0.12 * 500, abs=1e-3)
    assert p.discesa_m == pytest.approx(0, abs=1e-6)
    assert math.copysign(1, p.discesa_m) == 1  # mai "-0"
    # Il primo campione è a 0 m, gli altri ogni 5 m (in UTM): 101 punti
    assert len(p.punti) == 101
    # Le distanze sono geodetiche: differiscono da quelle UTM per il fattore di scala (~0,9996)
    assert p.lunghezza_m == pytest.approx(500, rel=2e-3)
    assert p.pendenza_media_percento == pytest.approx(12.0 * 500 / p.lunghezza_m, rel=1e-6)
    assert p.lunghezza_inclinata_m == pytest.approx(p.lunghezza_m * math.sqrt(1 + (60 / p.lunghezza_m) ** 2), rel=1e-6)
    quote = [pt.quota_m for pt in p.punti]
    assert quote == sorted(quote)


def test_profilo_andata_e_ritorno(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "ar.tif", lambda x, y: 100 + 0.12 * x))
    p = calcola_profilo(dtm, linea_wgs84((200, 500), (700, 500), (300, 500)))
    assert p.salita_m == pytest.approx(60.0, abs=1e-3)
    assert p.discesa_m == pytest.approx(48.0, abs=1e-3)
    assert p.quota_massima == pytest.approx(100 + 0.12 * 700, abs=1e-3)


def test_profilo_parzialmente_senza_dati(tmp_path):
    dtm = SorgenteDtm(
        crea_dtm(tmp_path / "buchi.tif", lambda x, y: 100 + 0.12 * x, nodata_maschera=lambda x, y: x > 450)
    )
    p = calcola_profilo(dtm, linea_wgs84((200, 500), (700, 500)))
    assert 40 < p.copertura_percento < 55
    assert p.punti[-1].quota_m is None
    assert p.quota_finale is None
    assert any("copre" in a for a in p.avvertenze)


def test_profilo_fuori_dal_dtm_e_linea_troppo_lunga(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "f.tif", lambda x, y: x))
    with pytest.raises(AltimetriaNonDisponibile, match="fuori"):
        calcola_profilo(dtm, linea_wgs84((5000, 5000), (5100, 5000)))
    with pytest.raises(AltimetriaNonDisponibile, match="limitato"):
        calcola_profilo(dtm, linea_wgs84((0, 0), (25_000, 0)))
    with pytest.raises(AltimetriaNonDisponibile, match="più corta"):
        calcola_profilo(dtm, linea_wgs84((100, 100), (102, 100)))


def test_distanze_del_profilo_sono_geodetiche(tmp_path):
    dtm = SorgenteDtm(crea_dtm(tmp_path / "d.tif", lambda x, y: np.full_like(x, 50.0)))
    linea = linea_wgs84((100, 100), (900, 900))
    p = calcola_profilo(dtm, linea)
    lon, lat = linea.xy
    atteso = Geod(ellps="WGS84").line_length(lon, lat)
    assert p.lunghezza_m == pytest.approx(atteso, rel=1e-9)
    assert p.salita_m == pytest.approx(0, abs=1e-9)
    assert p.discesa_m == pytest.approx(0, abs=1e-9)
    assert p.punti[1].distanza_m == pytest.approx(PASSO_M, rel=2e-3)


@pytest.mark.parametrize(
    ("geometria", "messaggio"),
    [
        ({"type": "Polygon", "coordinates": []}, "LineString"),
        ({"type": "LineString", "coordinates": [[9, 45]]}, "almeno 2"),
        ({"type": "LineString", "coordinates": [[9, 45], [9, 45]]}, "distinti"),
        ({"type": "LineString", "coordinates": [[9, 45], [200, 45]]}, "fuori intervallo"),
    ],
)
def test_linee_non_valide(geometria, messaggio):
    with pytest.raises(ErroreGeometria, match=messaggio):
        linea_da_geojson(geometria)
