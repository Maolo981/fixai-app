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
    # GetFeatureInfo sul WMS DTM5_RL_wms (6/11/2026) nel punto 9,1919 E 45,4642 N: PixelValue = 119.860001
    x, y = _A_UTM.transform(9.1919, 45.4642)
    with rasterio.open(dtm.percorso) as ds:
        valore = next(ds.sample([(x, y)]))[0]
    assert float(valore) == pytest.approx(119.86, abs=0.01)
