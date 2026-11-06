"""Test del client di ricerca località (senza chiamate reali a Internet)."""

from __future__ import annotations

import asyncio
import time

import httpx
import pytest

from app.config import Impostazioni
from app.services.geocodifica import (
    ClientGeocodifica,
    ServizioRicercaNonDisponibile,
    interpreta_risposta_nominatim,
)

RISPOSTA_BERGAMO = [
    {
        "lat": "45.6944947",
        "lon": "9.6698727",
        "display_name": "Bergamo, Lombardia, Italia",
        "type": "city",
        "boundingbox": ["45.6650000", "45.7250000", "9.6250000", "9.7150000"],
    }
]


def test_interpreta_risposta_riordina_bbox_in_lon_lat():
    [loc] = interpreta_risposta_nominatim(RISPOSTA_BERGAMO)
    assert loc.nome.startswith("Bergamo")
    assert loc.lon == pytest.approx(9.6698727)
    assert loc.lat == pytest.approx(45.6944947)
    assert loc.bbox == (9.625, 45.665, 9.715, 45.725)
    assert loc.tipo == "city"


def test_interpreta_risposta_scarta_elementi_malformati():
    assert interpreta_risposta_nominatim([{"display_name": "senza coordinate"}]) == []


def _client(gestore, **kwargs) -> tuple[ClientGeocodifica, list[httpx.Request]]:
    richieste: list[httpx.Request] = []

    def registra(request: httpx.Request) -> httpx.Response:
        richieste.append(request)
        return gestore(request)

    http = httpx.AsyncClient(transport=httpx.MockTransport(registra))
    return ClientGeocodifica(Impostazioni(), http=http, **kwargs), richieste


def test_ricerca_invia_parametri_corretti_e_usa_la_cache():
    client, richieste = _client(lambda r: httpx.Response(200, json=RISPOSTA_BERGAMO))

    async def scenario():
        primo = await client.cerca("Bergamo")
        secondo = await client.cerca("  bergamo ")
        return primo, secondo

    primo, secondo = asyncio.run(scenario())
    assert primo == secondo
    assert len(richieste) == 1, "la seconda ricerca deve arrivare dalla cache"
    parametri = richieste[0].url.params
    assert parametri["countrycodes"] == "it"
    assert parametri["bounded"] == "1"
    assert parametri["format"] == "jsonv2"
    assert "TerraScanItalia" in richieste[0].headers["User-Agent"]


def test_ricerca_rispetta_limite_di_una_richiesta_al_secondo():
    client, richieste = _client(lambda r: httpx.Response(200, json=[]))
    client.INTERVALLO_MINIMO_S = 0.3

    async def scenario():
        inizio = time.monotonic()
        await client.cerca("Lecco")
        await client.cerca("Como")
        return time.monotonic() - inizio

    durata = asyncio.run(scenario())
    assert len(richieste) == 2
    assert durata >= 0.3


@pytest.mark.parametrize("codice", [429, 500, 503])
def test_errori_del_servizio_esterno_non_producono_risultati_inventati(codice):
    client, _ = _client(lambda r: httpx.Response(codice, text="errore"))
    with pytest.raises(ServizioRicercaNonDisponibile):
        asyncio.run(client.cerca("Brescia"))


def test_servizio_irraggiungibile():
    def guasto(request):
        raise httpx.ConnectError("rete assente", request=request)

    client, _ = _client(guasto)
    with pytest.raises(ServizioRicercaNonDisponibile):
        asyncio.run(client.cerca("Mantova"))
