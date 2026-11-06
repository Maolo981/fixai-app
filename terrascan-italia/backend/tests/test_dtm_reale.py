"""Test sul DTM reale di Regione Lombardia (saltati se il file non è installato).

I valori attesi provengono da fonti indipendenti dal nostro codice:
* la quota restituita dal servizio WMS ufficiale della Regione (GetFeatureInfo);
* il livello dei laghi: per i metadati, sui laghi il DTM riporta il livello dell'acqua,
  quindi il terreno deve risultare piatto alla quota nota del lago.
"""

from __future__ import annotations

import pytest
import rasterio
from pyproj import Transformer
from shapely.geometry import Polygon

from app.config import impostazioni
from app.services.altimetria import SorgenteDtm

pytestmark = pytest.mark.skipif(
    not impostazioni.percorso_dtm.is_file(), reason="DTM reale non installato (scripts/prepara_dtm.py)"
)

_A_UTM = Transformer.from_crs("EPSG:4326", "EPSG:32632", always_xy=True)
_A_WGS = Transformer.from_crs("EPSG:32632", "EPSG:4326", always_xy=True)


def quadrato(lon: float, lat: float, lato_m: float) -> Polygon:
    x, y = _A_UTM.transform(lon, lat)
    m = lato_m / 2
    return Polygon([_A_WGS.transform(x + dx, y + dy) for dx, dy in [(-m, -m), (m, -m), (m, m), (-m, m)]])


@pytest.fixture(scope="module")
def dtm():
    return SorgenteDtm(impostazioni.percorso_dtm)


def test_caratteristiche_del_file(dtm):
    with rasterio.open(dtm.percorso) as ds:
        assert ds.crs.to_epsg() == 32632
        assert ds.res == (5.0, 5.0)
        assert (ds.width, ds.height) == (46533, 44400)
        assert ds.dtypes[0] == "float32"


def test_piazza_duomo_milano_coincide_con_wms_regionale(dtm):
    # Cella del DTM che contiene piazza del Duomo (9,1919 E 45,4642 N): riga 26472, colonna 11000,
    # centro E 515004,3694 N 5034538,7481. GetFeatureInfo sul WMS ufficiale DTM5_RL_wms nel centro
    # della cella (6/11/2026): PixelValue = 119.790001
    x, y = _A_UTM.transform(9.1919, 45.4642)
    with rasterio.open(dtm.percorso) as ds:
        assert ds.index(x, y) == (26472, 11000)
        valore = ds.read(1, window=((26472, 26473), (11000, 11001)))[0, 0]
    assert float(valore) == pytest.approx(119.79, abs=0.01)


@pytest.mark.parametrize(
    ("lago", "lon", "lat", "livello_noto_m"),
    [
        # Livelli medi nominali dei laghi (m s.l.m.), fonte indipendente dal DTM.
        ("Como", 9.272, 45.997, 198.0),
        ("Garda", 10.62, 45.55, 65.0),
        ("Lugano", 9.10, 46.02, 271.0),
        ("Varese", 8.73, 45.81, 238.0),
    ],
)
def test_laghi_piatti_alla_quota_nota_sul_livello_del_mare(dtm, lago, lon, lat, livello_noto_m):
    r = dtm.analizza(quadrato(lon, lat, 200))
    # Sui laghi il DTM riporta il livello dell'acqua: superficie perfettamente piatta...
    assert r.dislivello < 0.05, lago
    assert r.pendenza_massima_percento < 0.1
    assert r.esposizione_prevalente == "Pianeggiante"
    # ...alla quota nota del lago entro l'accuratezza dichiarata (2 m). Questo conferma anche
    # che le quote sono riferite al livello del mare (le quote ellissoidiche sarebbero ~47 m più alte).
    assert r.quota_media == pytest.approx(livello_noto_m, abs=2.0), lago


def test_analisi_di_un_terreno_reale_in_pianura(dtm):
    # Zona agricola/produttiva vicino a Treviglio (BG): pianura, quote intorno a 120 m
    r = dtm.analizza(quadrato(9.6105, 45.5135, 300))
    assert r.celle_valide == r.celle_interne == 3600
    assert 110 < r.quota_minima <= r.quota_media <= r.quota_massima < 130
    assert r.pendenza_media_percento < 5


def test_profilo_sul_lago_di_como_e_piatto(dtm):
    from shapely.geometry import LineString

    from app.services.profilo import calcola_profilo

    x, y = _A_UTM.transform(9.272, 45.997)
    linea = LineString([_A_WGS.transform(x - 100, y), _A_WGS.transform(x + 100, y)])
    p = calcola_profilo(dtm, linea)
    assert p.copertura_percento == 100
    assert all(pt.quota_m == pytest.approx(198.0, abs=0.05) for pt in p.punti)
    assert p.salita_m < 0.05 and p.discesa_m < 0.05


def test_mappa_pendenze_reale_valtellina(dtm):
    from app.services.mappe import crea_mappa

    m = crea_mappa(dtm, quadrato(9.885, 46.179, 150), "esposizione")
    voci = {v.etichetta: v.percentuale_celle for v in m.legenda}
    # Versante vitato sopra Sondrio: esposizione prevalente a Sud
    assert max(voci, key=voci.get) == "Sud"
