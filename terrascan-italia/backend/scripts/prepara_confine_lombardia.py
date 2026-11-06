"""Prepara il confine della Lombardia (area pilota) in GeoJSON WGS84.

Fonte: ISTAT - Confini delle unità amministrative a fini statistici al
1 gennaio 2024, versione generalizzata (file Reg01012024_g_WGS84.shp,
sistema di riferimento WGS84 / UTM 32N, EPSG:32632). Licenza CC BY 3.0 IT.
https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/2024/Limiti01012024_g.zip

Uso (dalla cartella backend):
    uv run python scripts/prepara_confine_lombardia.py <percorso/Reg01012024_g_WGS84.shp>

Il risultato viene scritto in app/data/lombardia.geojson ed è già incluso
nel repository: rieseguire lo script serve solo per aggiornare il confine.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import shapefile  # pyshp
import shapely
from pyproj import Transformer
from shapely.geometry import mapping, shape

CODICE_REGIONE_LOMBARDIA = 3
# Tolleranza di semplificazione in metri (in UTM 32N). Il confine serve solo
# per la visualizzazione e per l'avviso "fuori area pilota", non per misure.
TOLLERANZA_SEMPLIFICAZIONE_M = 50.0


def _trasforma(transformer: Transformer, xy):
    """Converte un array Nx2 di coordinate UTM 32N in lon/lat WGS84."""
    import numpy as np

    lon, lat = transformer.transform(xy[:, 0], xy[:, 1])
    return np.column_stack([lon, lat])


OUTPUT = Path(__file__).resolve().parents[1] / "app" / "data" / "lombardia.geojson"


def main(percorso_shp: str) -> None:
    reader = shapefile.Reader(percorso_shp)
    nomi_campi = [f[0] for f in reader.fields[1:]]
    for record, forma in zip(reader.records(), reader.shapes()):
        attributi = dict(zip(nomi_campi, record))
        if int(attributi["COD_REG"]) != CODICE_REGIONE_LOMBARDIA:
            continue
        geometria_utm = shape(forma.__geo_interface__)
        geometria_utm = geometria_utm.simplify(TOLLERANZA_SEMPLIFICAZIONE_M, preserve_topology=True)
        utm_to_wgs84 = Transformer.from_crs("EPSG:32632", "EPSG:4326", always_xy=True)
        geometria = shapely.transform(geometria_utm, lambda xy: _trasforma(utm_to_wgs84, xy))

        def arrotonda(coords):
            if isinstance(coords[0], (int, float)):
                return [round(coords[0], 6), round(coords[1], 6)]
            return [arrotonda(c) for c in coords]

        geo = mapping(geometria)
        feature = {
            "type": "Feature",
            "properties": {
                "nome": attributi["DEN_REG"],
                "codice_istat": int(attributi["COD_REG"]),
                "fonte": "ISTAT - Confini amministrativi 01/01/2024 (generalizzati), CC BY 3.0 IT",
                "semplificazione_m": TOLLERANZA_SEMPLIFICAZIONE_M,
            },
            "geometry": {"type": geo["type"], "coordinates": arrotonda(geo["coordinates"])},
        }
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(
            json.dumps({"type": "FeatureCollection", "features": [feature]}, separators=(",", ":")),
            encoding="utf-8",
        )
        print(f"Scritto {OUTPUT} ({OUTPUT.stat().st_size / 1024:.0f} KB)")
        return
    raise SystemExit("Regione Lombardia non trovata nello shapefile")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
