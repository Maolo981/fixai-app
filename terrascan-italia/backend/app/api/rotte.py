"""Endpoint HTTP dell'API v1."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from app import __version__
from app.api.schemi import (
    AreaPilota,
    Centroide,
    ControlloUtm,
    LocalitaTrovata,
    Perimetro,
    RichiestaGeometria,
    RispostaAnalisiGeometria,
    RispostaCapacita,
    RispostaRicerca,
    StatoAltimetria,
    StatoFunzione,
    Superficie,
)
from app.services.area_pilota import NOME_AREA_PILOTA, confine_lombardia, geometria_lombardia
from app.services.geocodifica import ATTRIBUZIONE_OSM, ServizioRicercaNonDisponibile
from app.services.geometria import (
    ErroreGeometria,
    misura_poligono,
    poligono_da_geojson,
    posizione_rispetto_area,
)

router = APIRouter(prefix="/api/v1")

MESSAGGIO_ALTIMETRIA = "Dati altimetrici non disponibili"

FUNZIONI = [
    StatoFunzione(
        chiave="superficie_perimetro",
        nome="Superficie e perimetro",
        stato="implementata",
        note="Calcolo geodetico sull'ellissoide WGS84 (GeographicLib/pyproj), con controllo in UTM 32N.",
    ),
    StatoFunzione(
        chiave="ricerca_localita",
        nome="Ricerca località",
        stato="implementata",
        note="Nominatim / OpenStreetMap, limitata all'area pilota Lombardia.",
    ),
    StatoFunzione(
        chiave="altimetria",
        nome="Quote, dislivello e pendenza",
        stato="non_disponibile",
        note="Prevista nella Fase 2 con il DTM 5x5 di Regione Lombardia.",
    ),
    StatoFunzione(
        chiave="mappa_pendenze",
        nome="Mappa delle pendenze e profilo altimetrico",
        stato="non_disponibile",
        note="Prevista dopo l'integrazione del DTM.",
    ),
    StatoFunzione(
        chiave="report_pdf",
        nome="Report PDF",
        stato="non_disponibile",
        note="Prevista in una fase successiva.",
    ),
]


@router.get("/salute", summary="Verifica che il servizio sia attivo")
def salute() -> dict:
    return {"stato": "ok", "versione": __version__, "fase": 1}


@router.get("/capacita", response_model=RispostaCapacita, summary="Funzioni disponibili e non disponibili")
def capacita() -> RispostaCapacita:
    return RispostaCapacita(fase=1, funzioni=FUNZIONI)


@router.get("/area-pilota", summary="Confine GeoJSON dell'area pilota (Lombardia)")
def area_pilota() -> dict:
    return confine_lombardia()


@router.post(
    "/analisi/geometria",
    response_model=RispostaAnalisiGeometria,
    summary="Superficie e perimetro reali di un poligono",
)
def analisi_geometria(richiesta: RichiestaGeometria) -> RispostaAnalisiGeometria:
    try:
        poligono = poligono_da_geojson(richiesta.geometria)
        misure = misura_poligono(poligono)
    except ErroreGeometria as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    stato = posizione_rispetto_area(poligono, geometria_lombardia())
    avvertenze: list[str] = []
    if stato == "parziale":
        avvertenze.append(
            "Il terreno è solo in parte all'interno della Lombardia, area pilota del servizio."
        )
    elif stato == "esterno":
        avvertenze.append(
            "Il terreno è fuori dalla Lombardia: superficie e perimetro sono validi, ma le future "
            "analisi altimetriche saranno disponibili solo nell'area pilota."
        )

    return RispostaAnalisiGeometria(
        superficie=Superficie(
            m2=misure.area_m2,
            ettari=misure.area_ettari,
            metodo="Geodetico su ellissoide WGS84 (algoritmo di Karney, GeographicLib via pyproj)",
        ),
        perimetro=Perimetro(
            m=misure.perimetro_m,
            metodo="Somma delle linee geodetiche tra i vertici, ellissoide WGS84",
        ),
        controllo_utm32=ControlloUtm(
            epsg=32632,
            descrizione="WGS84 / UTM fuso 32N (stesso sistema del DTM 5x5 di Regione Lombardia)",
            area_m2=misure.area_utm32_m2,
            perimetro_m=misure.perimetro_utm32_m,
            differenza_area_percentuale=misure.differenza_utm_percentuale,
        ),
        centroide=Centroide(lon=misure.centroide_lon, lat=misure.centroide_lat),
        bbox=list(misure.bbox),
        numero_vertici=misure.numero_vertici,
        area_pilota=AreaPilota(nome=NOME_AREA_PILOTA, stato=stato),
        altimetria=StatoAltimetria(disponibile=False, messaggio=MESSAGGIO_ALTIMETRIA),
        avvertenze=avvertenze,
    )


@router.get("/ricerca", response_model=RispostaRicerca, summary="Cerca una località in Lombardia")
async def ricerca(
    request: Request,
    q: str = Query(..., min_length=2, max_length=200, description="Nome della località o indirizzo"),
) -> RispostaRicerca:
    client = request.app.state.geocodifica
    try:
        risultati = await client.cerca(q.strip())
    except ServizioRicercaNonDisponibile as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Ricerca località temporaneamente non disponibile. {exc}",
        ) from exc
    return RispostaRicerca(
        query=q,
        risultati=[LocalitaTrovata(**r.come_dict()) for r in risultati],
        attribuzione=ATTRIBUZIONE_OSM,
    )
