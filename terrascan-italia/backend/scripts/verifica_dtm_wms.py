"""Verifica indipendente del DTM installato confrontandolo con il servizio WMS della Regione.

Per un campione casuale di celle valide del nostro file, interroga il servizio WMS
ufficiale di Regione Lombardia (richiesta GetFeatureInfo, che restituisce il valore
della cella, "PixelValue") e confronta le due quote.

Il WMS serve solo per questo controllo a campione: non è usato per i calcoli.

Uso (dalla cartella backend):
    uv run python scripts/verifica_dtm_wms.py --punti 40
"""

from __future__ import annotations

import argparse
import re
import sys
import time
import urllib.parse
import urllib.request

import numpy as np
import rasterio

from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # per importare il pacchetto "app"
from app.config import impostazioni  # noqa: E402

WMS = "https://www.cartografia.servizirl.it/arcgis/services/wms/DTM5_RL_wms/MapServer/WmsServer"
TOLLERANZA_M = 0.01


def quota_wms(x: float, y: float) -> float | None:
    """Valore della cella del DTM in (x, y) UTM 32N secondo il WMS regionale (None = NoData)."""
    # Riquadro di 101 x 101 m a 1 m/pixel centrato sul punto: il pixel centrale cade nella cella.
    parametri = {
        "SERVICE": "WMS",
        "VERSION": "1.3.0",
        "REQUEST": "GetFeatureInfo",
        "LAYERS": "0",
        "QUERY_LAYERS": "0",
        "STYLES": "",
        "CRS": "EPSG:32632",
        "BBOX": f"{x - 50.5},{y - 50.5},{x + 50.5},{y + 50.5}",
        "WIDTH": "101",
        "HEIGHT": "101",
        "I": "50",
        "J": "50",
        "INFO_FORMAT": "text/xml",
    }
    url = f"{WMS}?{urllib.parse.urlencode(parametri)}"
    testo = urllib.request.urlopen(url, timeout=60).read().decode("utf-8", "replace")
    m = re.search(r'PixelValue="([^"]+)"', testo)
    if not m or m.group(1) == "NoData":
        return None
    return float(m.group(1))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--punti", type=int, default=40)
    parser.add_argument("--seme", type=int, default=2015)
    args = parser.parse_args()

    rng = np.random.default_rng(args.seme)
    risultati = []
    with rasterio.open(impostazioni.percorso_dtm) as ds:
        while len(risultati) < args.punti:
            col, riga = int(rng.integers(0, ds.width)), int(rng.integers(0, ds.height))
            valore = ds.read(1, window=((riga, riga + 1), (col, col + 1)), masked=True)[0, 0]
            if np.ma.is_masked(valore):
                continue  # cella fuori dalla Lombardia
            x, y = ds.xy(riga, col)  # centro della cella
            wms = quota_wms(x, y)
            differenza = None if wms is None else wms - float(valore)
            risultati.append((x, y, float(valore), wms, differenza))
            stato = "OK " if differenza is not None and abs(differenza) <= TOLLERANZA_M else "!! "
            print(f"{stato} E {x:.1f} N {y:.1f}  file {float(valore):9.3f}  WMS {wms}  diff {differenza}")
            time.sleep(0.5)  # rispetto per il servizio pubblico

    diff = np.array([r[4] for r in risultati if r[4] is not None])
    print(f"\nPunti confrontati: {len(diff)} su {len(risultati)} (gli altri: WMS senza dato)")
    if len(diff):
        print(f"Differenza massima assoluta: {np.abs(diff).max():.4f} m")
        print(f"Punti entro {TOLLERANZA_M} m: {(np.abs(diff) <= TOLLERANZA_M).sum()} su {len(diff)}")


if __name__ == "__main__":
    main()
