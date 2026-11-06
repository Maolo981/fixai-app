"""Schemi (Pydantic) di richieste e risposte dell'API."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

AVVERTENZA_LEGALE = (
    "Le analisi di TerraScan Italia sono preliminari e indicative: non sostituiscono "
    "un rilievo topografico o una perizia tecnica eseguiti da un professionista abilitato."
)


class RichiestaGeometria(BaseModel):
    geometria: dict[str, Any] = Field(
        description="Geometria GeoJSON di tipo Polygon, coordinate [longitudine, latitudine] WGS84.",
        examples=[
            {
                "type": "Polygon",
                "coordinates": [[[9.67, 45.69], [9.671, 45.69], [9.671, 45.691], [9.67, 45.691], [9.67, 45.69]]],
            }
        ],
    )


class Superficie(BaseModel):
    m2: float
    ettari: float
    metodo: str


class Perimetro(BaseModel):
    m: float
    metodo: str


class ControlloUtm(BaseModel):
    epsg: int
    descrizione: str
    area_m2: float
    perimetro_m: float
    differenza_area_percentuale: float


class Centroide(BaseModel):
    lon: float
    lat: float


class AreaPilota(BaseModel):
    nome: str
    stato: Literal["interno", "parziale", "esterno"]


class PuntoQuota(BaseModel):
    lon: float
    lat: float
    quota: float


class Quote(BaseModel):
    minima: float
    massima: float
    media: float
    dislivello: float
    punto_minimo: PuntoQuota
    punto_massimo: PuntoQuota
    nota: str


class ClassePendenza(BaseModel):
    da_percento: float
    a_percento: float | None = Field(description="None = nessun limite superiore")
    percentuale_celle: float


class Pendenza(BaseModel):
    media_percento: float
    media_gradi: float
    massima_percento: float
    massima_gradi: float
    classi: list[ClassePendenza]
    metodo: str


class SettoreEsposizione(BaseModel):
    settore: str
    percentuale_celle: float


class Esposizione(BaseModel):
    prevalente: str
    settori: list[SettoreEsposizione]
    soglia_pianeggiante_percento: float
    metodo: str


class CelleDtm(BaseModel):
    interne: int
    valide: int
    con_pendenza: int
    copertura_percento: float
    dimensione_m: float


class FonteDtm(BaseModel):
    nome: str
    edizione: str
    proprietario: str
    licenza: str
    attribuzione: str
    precisione_dichiarata: str


class StatoAltimetria(BaseModel):
    disponibile: bool
    messaggio: str
    motivo: str | None = None
    quote: Quote | None = None
    pendenza: Pendenza | None = None
    esposizione: Esposizione | None = None
    celle: CelleDtm | None = None
    fonte: FonteDtm | None = None
    avvertenze: list[str] = []


class RispostaAnalisiGeometria(BaseModel):
    superficie: Superficie
    perimetro: Perimetro
    controllo_utm32: ControlloUtm
    centroide: Centroide
    bbox: list[float]
    numero_vertici: int
    area_pilota: AreaPilota
    altimetria: StatoAltimetria
    avvertenze: list[str]
    nota_legale: str = AVVERTENZA_LEGALE


class StatoFunzione(BaseModel):
    chiave: str
    nome: str
    stato: Literal["implementata", "non_disponibile"]
    note: str


class RispostaCapacita(BaseModel):
    fase: int
    funzioni: list[StatoFunzione]
    nota_legale: str = AVVERTENZA_LEGALE


class LocalitaTrovata(BaseModel):
    nome: str
    lon: float
    lat: float
    bbox: list[float] | None
    tipo: str


class RispostaRicerca(BaseModel):
    query: str
    risultati: list[LocalitaTrovata]
    attribuzione: str
