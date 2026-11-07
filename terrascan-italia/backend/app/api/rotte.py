"""Endpoint HTTP dell'API v1."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response
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
    RichiestaCurve,
    RispostaCurve,
    RispostaQuota,
    IntervalloCurve as IntervalloCurveSchema,
    ScalaQuota as ScalaQuotaSchema,
    TappaScala,
    TrattoProfilo as TrattoProfiloSchema,
    RichiestaReport,
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
from app.services.curve import INTERVALLO_MINIMO_M, calcola_curve
from app.services.tessere_dem import CacheTessere, TesseraNonValida
from app.services.profilo import PASSO_M, calcola_profilo, lunghezza_geodetica, quota_punto
from app.services.report import CampiUtente, DatiReport, genera_pdf
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
        StatoFunzione(chiave="mappa_quota", nome="Mappa altimetrica e curve di livello", stato=stato, note=nota_dtm),
        StatoFunzione(chiave="quota_punto", nome="Quota di un punto", stato=stato, note=nota_dtm),
        StatoFunzione(chiave="mappa_pendenze", nome="Mappe di pendenze ed esposizioni", stato=stato, note=nota_dtm),
        StatoFunzione(
            chiave="vista_3d",
            nome="Vista 3D del terreno",
            stato=stato,
            note=(nota_dtm + " Solo visualizzazione: i calcoli usano il DTM a piena risoluzione.").strip(),
        ),
        StatoFunzione(chiave="profilo", nome="Profilo altimetrico", stato=stato, note=nota_dtm),
        StatoFunzione(
            chiave="report_pdf",
            nome="Report PDF",
            stato="implementata",
            note="Generato dal server con i soli risultati calcolati; sezioni senza dati dichiarate tali.",
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
        "fase": 4,
        "dtm_disponibile": request.app.state.dtm is not None,
    }


@router.get("/capacita", response_model=RispostaCapacita, summary="Funzioni disponibili e non disponibili")
def capacita(request: Request) -> RispostaCapacita:
    return RispostaCapacita(fase=4, funzioni=_funzioni(request.app.state.dtm, request.app.state.motivo_dtm))


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
        return calcola_analisi(poligono, request.app.state.dtm, request.app.state.motivo_dtm)
    except ErroreGeometria as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def calcola_analisi(
    poligono: Polygon, dtm: SorgenteDtm | None, motivo_dtm: str | None
) -> RispostaAnalisiGeometria:
    """Analisi completa del terreno (usata dall'API e dal report PDF). Solleva ErroreGeometria."""
    misure = misura_poligono(poligono)
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
        altimetria=_altimetria(dtm, motivo_dtm, poligono),
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
        scala=ScalaQuotaSchema(
            minima=m.scala.minima,
            massima=m.scala.massima,
            tappe=[TappaScala(quota=q, colore=c) for q, c in m.scala.tappe],
            nota="Scala relativa al lotto: i colori vanno dalla quota minima (blu) alla massima (rosso).",
        ) if m.scala else None,
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
    # La lunghezza (misura di distanza) è geodetica e non dipende dal DTM.
    lunghezza = lunghezza_geodetica(linea)
    if dtm is None:
        return RispostaProfilo(
            disponibile=False, messaggio=MESSAGGIO_ALTIMETRIA_ASSENTE, motivo=request.app.state.motivo_dtm,
            lunghezza_m=lunghezza,
        )
    try:
        p = calcola_profilo(dtm, linea)
    except AltimetriaNonDisponibile as exc:
        return RispostaProfilo(
            disponibile=False, messaggio=MESSAGGIO_ALTIMETRIA_ASSENTE, motivo=str(exc), lunghezza_m=lunghezza
        )
    return RispostaProfilo(
        disponibile=True,
        messaggio="Profilo calcolato con dati reali",
        punti=[PuntoProfiloSchema(**vars(pt)) for pt in p.punti],
        tratti=[TrattoProfiloSchema(**vars(t)) for t in p.tratti],
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


@router.post(
    "/report",
    summary="Report PDF dell'analisi del terreno",
    response_class=Response,
    responses={200: {"content": {"application/pdf": {}}}},
)
def report_pdf(richiesta: RichiestaReport, request: Request) -> Response:
    """Ricalcola tutto sul server (nessun valore arriva dal browser) e restituisce il PDF."""
    try:
        poligono = poligono_da_geojson(richiesta.geometria)
        linea = linea_da_geojson(richiesta.linea) if richiesta.linea else None
        analisi = calcola_analisi(poligono, request.app.state.dtm, request.app.state.motivo_dtm)
    except ErroreGeometria as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    dtm: SorgenteDtm | None = request.app.state.dtm
    dati = DatiReport(
        poligono=poligono,
        analisi=analisi,
        linea=linea,
        campi=CampiUtente(**richiesta.campi.model_dump()),
    )
    if dtm is not None and analisi.altimetria.disponibile:
        dati.mappa_pendenze = crea_mappa(dtm, poligono, "pendenza")
        dati.mappa_esposizioni = crea_mappa(dtm, poligono, "esposizione")
    if linea is not None:
        if dtm is None:
            dati.motivo_profilo = request.app.state.motivo_dtm
        else:
            try:
                dati.profilo = calcola_profilo(dtm, linea)
            except AltimetriaNonDisponibile as exc:
                dati.motivo_profilo = str(exc)
    contenuto = genera_pdf(dati)
    return Response(
        content=contenuto,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="terrascan-report-{dati.codice}.pdf"'},
    )


METODO_CURVE = (
    "Isolinee (marching squares, contourpy) sulle quote ai centri delle celle del DTM 5x5, ritagliate sul lotto. "
    f"Intervalli inferiori a {INTERVALLO_MINIMO_M:g} m esclusi: l'accuratezza dichiarata arriva a 2 m."
)


@router.post("/analisi/curve", response_model=RispostaCurve, summary="Curve di livello del lotto")
def analisi_curve(richiesta: RichiestaCurve, request: Request) -> RispostaCurve:
    try:
        poligono = poligono_da_geojson(richiesta.geometria)
    except ErroreGeometria as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    dtm: SorgenteDtm | None = request.app.state.dtm
    if dtm is None:
        return RispostaCurve(disponibile=False, messaggio=MESSAGGIO_ALTIMETRIA_ASSENTE,
                             motivo=request.app.state.motivo_dtm)
    try:
        c = calcola_curve(dtm, poligono, richiesta.intervallo_m)
    except AltimetriaNonDisponibile as exc:
        return RispostaCurve(disponibile=False, messaggio="Curve di livello non disponibili", motivo=str(exc))
    return RispostaCurve(
        disponibile=True,
        messaggio="Curve di livello calcolate con dati reali",
        intervallo_m=c.intervallo_m,
        intervalli=[IntervalloCurveSchema(**vars(i)) for i in c.intervalli],
        quota_minima=c.quota_minima,
        quota_massima=c.quota_massima,
        numero_curve=c.numero_curve,
        geojson=c.geojson,
        metodo=METODO_CURVE,
        attribuzione=dtm.descrizione.attribuzione,
    )


@router.get("/quota", response_model=RispostaQuota, summary="Quota stimata in un punto")
def quota(
    request: Request,
    lon: float = Query(..., ge=-180, le=180),
    lat: float = Query(..., ge=-90, le=90),
) -> RispostaQuota:
    dtm: SorgenteDtm | None = request.app.state.dtm
    if dtm is None:
        return RispostaQuota(disponibile=False, messaggio=MESSAGGIO_ALTIMETRIA_ASSENTE,
                             motivo=request.app.state.motivo_dtm, lon=lon, lat=lat)
    try:
        q = quota_punto(dtm, lon, lat)
    except AltimetriaNonDisponibile as exc:
        return RispostaQuota(disponibile=False, messaggio=MESSAGGIO_ALTIMETRIA_ASSENTE, motivo=str(exc),
                             lon=lon, lat=lat)
    return RispostaQuota(
        disponibile=True,
        messaggio="Quota stimata dal DTM",
        lon=lon,
        lat=lat,
        quota_m=q.quota_m,
        quota_cella_m=q.quota_cella_m,
        est_utm=q.est_utm,
        nord_utm=q.nord_utm,
        metodo="Interpolazione bilineare tra i centri delle 4 celle (5 x 5 m) più vicine.",
        precisione=dtm.descrizione.precisione_dichiarata,
        attribuzione=dtm.descrizione.attribuzione,
    )


_CACHE_TESSERE = CacheTessere()


@router.get(
    "/tessere/dem/{z}/{x}/{y}.png",
    summary="Tessera di elevazione Terrarium per la vista 3D (solo visualizzazione)",
    response_class=Response,
    responses={200: {"content": {"image/png": {}}}, 204: {"description": "Nessun dato DTM nella tessera"}},
)
def tessera_dem(z: int, x: int, y: int, request: Request) -> Response:
    dtm: SorgenteDtm | None = request.app.state.dtm
    if dtm is None:
        raise HTTPException(status_code=503, detail=request.app.state.motivo_dtm or MESSAGGIO_ALTIMETRIA_ASSENTE)
    try:
        contenuto = _CACHE_TESSERE.ottieni(dtm, z, x, y)
    except TesseraNonValida as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    cache = {"Cache-Control": "public, max-age=86400"}
    if contenuto is None:
        return Response(status_code=204, headers=cache)
    return Response(content=contenuto, media_type="image/png", headers=cache)


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
