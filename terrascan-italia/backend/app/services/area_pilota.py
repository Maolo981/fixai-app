"""Area pilota della Fase 1: confine della Regione Lombardia (fonte ISTAT)."""

from __future__ import annotations

import json
from functools import lru_cache

from app.config import CARTELLA_DATI

NOME_AREA_PILOTA = "Lombardia"
ATTRIBUZIONE_CONFINE = "Confine regionale: ISTAT, confini amministrativi 01/01/2024 (generalizzati), CC BY 3.0 IT"


@lru_cache(maxsize=1)
def confine_lombardia() -> dict:
    """Restituisce la FeatureCollection GeoJSON del confine (WGS84)."""
    with open(CARTELLA_DATI / "lombardia.geojson", encoding="utf-8") as f:
        return json.load(f)


def geometria_lombardia() -> dict:
    return confine_lombardia()["features"][0]["geometry"]
