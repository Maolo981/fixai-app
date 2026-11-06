"""Configurazione del backend tramite variabili d'ambiente.

Tutte le variabili hanno un valore predefinito adatto allo sviluppo locale.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

CARTELLA_APP = Path(__file__).resolve().parent
CARTELLA_DATI = CARTELLA_APP / "data"
CARTELLA_FRONTEND_DIST = CARTELLA_APP.parents[1] / "frontend" / "dist"
# File del DTM preparato con scripts/prepara_dtm.py (non incluso nel repository).
PERCORSO_DTM_PREDEFINITO = CARTELLA_APP.parent / "dati-dtm" / "dtm5_lombardia_2015.tif"


def _lista(valore: str) -> list[str]:
    return [v.strip() for v in valore.split(",") if v.strip()]


@dataclass(frozen=True)
class Impostazioni:
    # Origini autorizzate a chiamare l'API dal browser (CORS).
    origini_cors: list[str] = field(
        default_factory=lambda: _lista(
            os.getenv(
                "TERRASCAN_CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173",
            )
        )
    )
    # Servizio di geocodifica (ricerca località). Nominatim/OpenStreetMap
    # richiede un User-Agent che identifichi l'applicazione e al massimo
    # 1 richiesta al secondo: https://operations.osmfoundation.org/policies/nominatim/
    nominatim_url: str = os.getenv(
        "TERRASCAN_NOMINATIM_URL", "https://nominatim.openstreetmap.org/search"
    )
    nominatim_user_agent: str = os.getenv(
        "TERRASCAN_NOMINATIM_USER_AGENT", "TerraScanItalia/0.1 (fase-1 sviluppo)"
    )
    # Indirizzo email facoltativo, consigliato da Nominatim per uso intensivo.
    nominatim_email: str | None = os.getenv("TERRASCAN_NOMINATIM_EMAIL") or None
    nominatim_timeout_s: float = float(os.getenv("TERRASCAN_NOMINATIM_TIMEOUT", "10"))
    # Percorso del DTM 5x5 di Regione Lombardia in formato GeoTIFF.
    percorso_dtm: Path = Path(os.getenv("TERRASCAN_DTM_PATH", str(PERCORSO_DTM_PREDEFINITO)))


impostazioni = Impostazioni()
