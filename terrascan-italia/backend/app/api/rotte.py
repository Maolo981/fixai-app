"""Endpoint HTTP dell'API v1."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request
from shapely.geometry import Polygon

from app import __version__
from app.api.schemi import (
    AreaPilota,
    CelleDtm,
    Centroide,
    ClassePendenza,
    ControlloUtm,
    Esposizione,
    FonteDtm,
    LocalitaTrovata,
    Pendenza,
    Perimetro,
    PuntoQuota,
    Quote,
    RichiestaGeometria,
    RichiestaMappa,
    RichiestaProfilo,
    RispostaMappa,
    RispostaProfilo,
    VoceLegenda,
    PuntoProfilo as PuntoProfiloSchema,
    RispostaAnalisiGeometria,
    RispostaCapacita,
    RispostaRicerca,
    SettoreEsposizione,
    StatoAltimetria,
    StatoFunzione,
    Superficie,
)
from app.services.altimetria import (
    SOGLIA_PIANEGGIANTE_PERCENTO,
    AltimetriaNonDisponibile,
    RisultatoAltimetria,
    SorgenteDtm,
)
from app.services.area_pilota import NOME_AREA_PILOTA, confine_lombardia, geometria_lombardia
from app.services.geocodifica import ATTRIBUZIONE_OSM, ServizioRicercaNonDisponibile
from app.services.mappe import crea_mappa
from app.services.profilo import PASSO_M, calcola_profilo
from app.services.geometria import (
    ErroreGeometria,
    linea_da_geojson,
    misura_poligono,
    poligono_da_geojson,
    posizione_rispetto_area,
)

router = APIRouter(prefix="/api/v1")

MESSAGGIO_ALTIMETRIA_ASSENTE = "Dati altimetrici non disponibili"
NOTA_QUOTE = (
    "Quote in metri lette dal DTM 5x5 di Regione Lombardia (ed. 2015), centri cella interni al perimetro. "
    "Sui laghi la quota è quella del livello dell'acqua."
)
METODO_PENDENZA = (
    "Metodo di Horn su finestra 3x3 (come GDAL/QGIS), celle di 5 m. Classi descrittive generiche, non normative."
)
METODO_ESPOSIZIONE = (
    "Direzione verso cui scende il terreno, metodo di Horn, 8 settori di 45°. "
    f"Celle con pendenza inferiore al {SOGLIA_PIANEGGIANTE_PERCENTO:g}% considerate pianeggianti."
)


def _funzioni(dtm: SorgenteDtm | None, motivo_dtm: str | None) -> list[StatoFunzione]:
    altimetria_attiva = dtm is not None
    nota_dtm = "DTM 5x5 di Regione Lombardia (ed. 2015)." if altimetria_attiva else (motivo_dtm or "")
    stato = "implementata" if altimetria_attiva else "non_disponibile"
    return [
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
        StatoFunzione(chiave="altimetria", nome="Quote e dislivello", stato=stato, note=nota_dtm),
        StatoFunzione(chiave="pendenza", nome="Pendenza", stato=stato, note=nota_dtm),
        StatoFunzione(chiave="esposizione", nome="Esposizione dei versanti", stato=stato, note=nota_dtm),
        StatoFunzione(chiave="mappa_pendenze", nome="Mappe di pendenze ed esposizioni", stato=stato, note=nota_dtm),
        StatoFunzione(chiave="profilo", nome="Profilo altimetrico", stato=stato, note=nota_dtm),
        StatoFunzione(
            chiave="report_pdf",
            nome="Report PDF",
            stato="non_disponibile",
            note="Previsto nella Fase 4.",
        ),
    ]


def _altimetria(dtm: SorgenteDtm | None, motivo_dtm: str | None, poligono: Polygon) -> StatoAltimetria:
    if dtm is None:
        return StatoAltimetria(disponibile=False, messaggio=MESSAGGIO_ALTIMETRIA_ASSENTE, motivo=motivo_dtm)
    try:
        r: RisultatoAltimetria = dtm.analizza(poligono)
    except AltimetriaNonDisponibile as exc:
        return StatoAltimetria(disponibile=False, messaggio=MESSAGGIO_ALTIMETRIA_ASSENTE, motivo=str(exc))

    d = dtm.descrizione
    return StatoAltimetria(
        disponibile=True,
        messaggio="Analisi altimetrica eseguita con dati reali",
        quote=Quote(
            minima=r.quota_minima,
            massima=r.quota_massima,
            media=r.quota_media,
            dislivello=r.dislivello,
            punto_minimo=PuntoQuota(**vars(r.punto_minimo)),
            punto_massimo=PuntoQuota(**vars(r.punto_massimo)),
            nota=NOTA_QUOTE,
        ),
        pendenza=Pendenza(
            media_percento=r.pendenza_media_percento,
            media_gradi=r.gradi(r.pendenza_media_percento),
            massima_percento=r.pendenza_massima_percento,
            massima_gradi=r.gradi(r.pendenza_massima_percento),
            classi=[
                ClassePendenza(da_percento=da, a_percento=None if a == float("inf") else a, percentuale_celle=q)
                for da, a, q in r.classi_pendenza
            ],
            metodo=METODO_PENDENZA,
        ),
        esposizione=Esposizione(
            prevalente=r.esposizione_prevalente,
            settori=[SettoreEsposizione(settore=k, percentuale_celle=v) for k, v in r.esposizione_settori.items()],
            soglia_pianeggiante_percento=SOGLIA_PIANEGGIANTE_PERCENTO,
            metodo=METODO_ESPOSIZIONE,
        ),
        celle=CelleDtm(
            interne=r.celle_interne,
            valide=r.celle_valide,
            con_pendenza=r.celle_con_pendenza,
            copertura_percento=r.copertura_percento,
            dimensione_m=r.dimensione_cella_m,
        ),
        fonte=FonteDtm(
            nome=d.nome,
            edizione=d.edizione,
            proprietario=d.proprietario,
            licenza=d.licenza,
            attribuzione=d.attribuzione,
            precisione_dichiarata=d.precisione_dichiarata,
        ),
        avvertenze=r.avvertenze,
    )


@router.get("/salute", summary="Verifica che il servizio sia attivo")
def salute(request: Request) -> dict:
    return {
        "stato": "ok",
        "versione": __version__,
        "fase": 3,
        "dtm_disponibile": request.app.state.dtm is not None,
    }


@router.get("/capacita", response_model=RispostaCapacita, summary="Funzioni disponibili e non disponibili")
def capacita(request: Request) -> RispostaCapacita:
    return RispostaCapacita(fase=3, funzioni=_funzioni(request.app.state.dtm, request.app.state.motivo_dtm))


@router.get("/area-pilota", summary="Confine GeoJSON dell'area pilota (Lombardia)")
def area_pilota() -> dict:
    return confine_lombardia()


@router.post(
    "/analisi/geometria",
    response_model=RispostaAnalisiGeometria,
    summary="Superficie, perimetro e (se disponibile) analisi altimetrica reale di un poligono",
)
def analisi_geometria(richiesta: RichiestaGeometria, request: Request) -> RispostaAnalisiGeometria:
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
            "Il terreno è fuori dalla Lombardia: superficie e perimetro sono validi, ma le analisi "
            "altimetriche sono disponibili solo nell'area pilota."
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
        altimetria=_altimetria(request.app.state.dtm, request.app.state.motivo_dtm, poligono),
        avvertenze=avvertenze,
    )


NOTA_MAPPA = (
    "Ogni pixel è una cella del DTM (5 x 5 m) il cui centro cade nel terreno; stessi valori dell'analisi. "
    "Classi di pendenza descrittive, non normative."
)
METODO_PROFILO = (
    f"Campioni ogni {PASSO_M:g} m lungo la linea, quota per interpolazione bilineare tra i centri delle 4 celle "
    "più vicine del DTM 5x5; distanze geodetiche (WGS84). Salita e discesa cumulate sono indicative."
)


@router.post("/analisi/mappa", response_model=RispostaMappa, summary="Mappa delle pendenze o delle esposizioni")
def analisi_mappa(richiesta: RichiestaMappa, request: Request) -> RispostaMappa:
    try:
        poligono = poligono_da_geojson(richiesta.geometria)
    except ErroreGeometria as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    dtm: SorgenteDtm | None = request.app.state.dtm
    if dtm is None:
        return RispostaMappa(
            disponibile=False, messaggio=MESSAGGIO_ALTIMETRIA_ASSENTE, motivo=request.app.state.motivo_dtm,
            tipo=richiesta.tipo,
        )
    try:
        m = crea_mappa(dtm, poligono, richiesta.tipo)
    except AltimetriaNonDisponibile as exc:
        return RispostaMappa(
            disponibile=False, messaggio=MESSAGGIO_ALTIMETRIA_ASSENTE, motivo=str(exc), tipo=richiesta.tipo
        )
    return RispostaMappa(
        disponibile=True,
        messaggio="Mappa calcolata con dati reali",
        tipo=m.tipo,
        immagine_png_base64=m.png_base64,
        coordinate=m.coordinate,
        larghezza=m.larghezza,
        altezza=m.altezza,
        legenda=[VoceLegenda(etichetta=v.etichetta, colore=v.colore, percentuale_celle=v.percentuale_celle)
                 for v in m.legenda],
        celle_colorate=m.celle_colorate,
        nota=NOTA_MAPPA,
        attribuzione=dtm.descrizione.attribuzione,
    )


@router.post("/analisi/profilo", response_model=RispostaProfilo, summary="Profilo altimetrico lungo una linea")
def analisi_profilo(richiesta: RichiestaProfilo, request: Request) -> RispostaProfilo:
    try:
        linea = linea_da_geojson(richiesta.geometria)
    except ErroreGeometria as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    dtm: SorgenteDtm | None = request.app.state.dtm
    if dtm is None:
        return RispostaProfilo(
            disponibile=False, messaggio=MESSAGGIO_ALTIMETRIA_ASSENTE, motivo=request.app.state.motivo_dtm
        )
    try:
        p = calcola_profilo(dtm, linea)
    except AltimetriaNonDisponibile as exc:
        return RispostaProfilo(disponibile=False, messaggio=MESSAGGIO_ALTIMETRIA_ASSENTE, motivo=str(exc))
    return RispostaProfilo(
        disponibile=True,
        messaggio="Profilo calcolato con dati reali",
        punti=[PuntoProfiloSchema(**vars(pt)) for pt in p.punti],
        lunghezza_m=p.lunghezza_m,
        lunghezza_inclinata_m=p.lunghezza_inclinata_m,
        quota_minima=p.quota_minima,
        quota_massima=p.quota_massima,
        quota_iniziale=p.quota_iniziale,
        quota_finale=p.quota_finale,
        salita_m=p.salita_m,
        discesa_m=p.discesa_m,
        pendenza_media_percento=p.pendenza_media_percento,
        pendenza_massima_percento=p.pendenza_massima_percento,
        copertura_percento=p.copertura_percento,
        passo_m=p.passo_m,
        metodo=METODO_PROFILO,
        avvertenze=p.avvertenze,
        attribuzione=dtm.descrizione.attribuzione,
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
