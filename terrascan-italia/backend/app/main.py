"""Applicazione FastAPI di TerraScan Italia.

Avvio in sviluppo (dalla cartella backend):
    uv run uvicorn app.main:app --reload

Documentazione interattiva dell'API: http://127.0.0.1:8000/docs
"""

from __future__ import annotations

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.api.rotte import router
from app.config import CARTELLA_FRONTEND_DIST, impostazioni
from app.services.geocodifica import ClientGeocodifica


@asynccontextmanager
async def ciclo_di_vita(app: FastAPI):
    async with httpx.AsyncClient(timeout=impostazioni.nominatim_timeout_s) as http:
        app.state.geocodifica = ClientGeocodifica(impostazioni, http=http)
        yield


def crea_app() -> FastAPI:
    app = FastAPI(
        title="TerraScan Italia API",
        version=__version__,
        description=(
            "Analisi preliminari dei terreni. Fase 1: superficie e perimetro reali. "
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
        app.mount("/", StaticFiles(directory=CARTELLA_FRONTEND_DIST, html=True), name="frontend")
    return app


app = crea_app()
