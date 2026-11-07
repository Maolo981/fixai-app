"""Applicazione FastAPI di TerraScan Italia.

Avvio in sviluppo (dalla cartella backend):
    uv run uvicorn app.main:app --reload

Documentazione interattiva dell'API: http://127.0.0.1:8000/docs
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.api.rotte import router
from app.config import CARTELLA_FRONTEND_DIST, impostazioni
from app.services.altimetria import AltimetriaNonDisponibile, SorgenteDtm
from app.services.geocodifica import ClientGeocodifica

log = logging.getLogger("terrascan")


def carica_dtm(app: FastAPI) -> None:
    """Apre e verifica il DTM; se manca o non è valido l'altimetria resta disattivata."""
    try:
        app.state.dtm = SorgenteDtm(impostazioni.percorso_dtm)
        app.state.motivo_dtm = None
        log.info("DTM caricato: %s", impostazioni.percorso_dtm)
    except AltimetriaNonDisponibile as exc:
        app.state.dtm = None
        app.state.motivo_dtm = str(exc)
        log.warning("Analisi altimetrica disattivata: %s", exc)


@asynccontextmanager
async def ciclo_di_vita(app: FastAPI):
    carica_dtm(app)
    async with httpx.AsyncClient(timeout=impostazioni.nominatim_timeout_s) as http:
        app.state.geocodifica = ClientGeocodifica(impostazioni, http=http)
        yield


def crea_app() -> FastAPI:
    app = FastAPI(
        title="TerraScan Italia API",
        version=__version__,
        description=(
            "Analisi preliminari dei terreni. Superficie, perimetro e analisi altimetrica reali (DTM 5x5 Regione Lombardia). "
            "Le analisi non sostituiscono un rilievo tecnico certificato."
        ),
        lifespan=ciclo_di_vita,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=impostazioni.origini_cors,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    app.include_router(router)

    # Se il frontend è stato compilato (npm run build), viene servito
    # direttamente da questo server: basta un solo comando per l'avvio.
    if CARTELLA_FRONTEND_DIST.is_dir():
        indice = CARTELLA_FRONTEND_DIST / "index.html"

        # L'applicazione GIS vive su /app (la landing su /): stessa pagina, scelta lato client.
        @app.get("/app", include_in_schema=False)
        @app.get("/app/{percorso:path}", include_in_schema=False)
        def applicazione(percorso: str = "") -> FileResponse:
            return FileResponse(indice)

        app.mount("/", StaticFiles(directory=CARTELLA_FRONTEND_DIST, html=True), name="frontend")
    return app


app = crea_app()
