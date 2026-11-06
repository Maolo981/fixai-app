"""Ricerca località tramite Nominatim (OpenStreetMap).

Il backend fa da intermediario verso Nominatim per:
* rispettare la policy d'uso (User-Agent identificativo, max 1 richiesta/s);
* memorizzare in cache le ricerche già fatte;
* limitare i risultati all'area pilota (riquadro della Lombardia).

Dati © OpenStreetMap contributors, licenza ODbL.
Policy: https://operations.osmfoundation.org/policies/nominatim/
"""

from __future__ import annotations

import asyncio
import time
from collections import OrderedDict
from dataclasses import dataclass

import httpx

from app.config import Impostazioni

# Riquadro (lon_min, lat_min, lon_max, lat_max) della Lombardia con un
# piccolo margine, ricavato dal confine ISTAT.
RIQUADRO_LOMBARDIA = (8.45, 44.65, 11.48, 46.67)
ATTRIBUZIONE_OSM = "Ricerca località: © OpenStreetMap contributors (ODbL), servizio Nominatim"


class ServizioRicercaNonDisponibile(RuntimeError):
    """Il servizio esterno di geocodifica non ha risposto correttamente."""


@dataclass(frozen=True)
class Localita:
    nome: str
    lon: float
    lat: float
    # [lon_min, lat_min, lon_max, lat_max] oppure None
    bbox: tuple[float, float, float, float] | None
    tipo: str

    def come_dict(self) -> dict:
        return {
            "nome": self.nome,
            "lon": self.lon,
            "lat": self.lat,
            "bbox": list(self.bbox) if self.bbox else None,
            "tipo": self.tipo,
        }


def normalizza_query(query: str) -> str:
    return " ".join(query.split()).strip().lower()


def interpreta_risposta_nominatim(dati: list[dict]) -> list[Localita]:
    """Converte la risposta JSON di Nominatim (formato jsonv2) in Localita."""
    risultati: list[Localita] = []
    for elemento in dati:
        try:
            lat = float(elemento["lat"])
            lon = float(elemento["lon"])
        except (KeyError, TypeError, ValueError):
            continue
        bbox = None
        bb = elemento.get("boundingbox")
        if isinstance(bb, list) and len(bb) == 4:
            try:
                # Nominatim restituisce [lat_min, lat_max, lon_min, lon_max]
                lat_min, lat_max, lon_min, lon_max = (float(v) for v in bb)
                bbox = (lon_min, lat_min, lon_max, lat_max)
            except (TypeError, ValueError):
                bbox = None
        risultati.append(
            Localita(
                nome=str(elemento.get("display_name", "")),
                lon=lon,
                lat=lat,
                bbox=bbox,
                tipo=str(elemento.get("type") or elemento.get("category") or ""),
            )
        )
    return risultati


class ClientGeocodifica:
    """Client Nominatim con cache in memoria e limite di 1 richiesta al secondo."""

    INTERVALLO_MINIMO_S = 1.0

    def __init__(
        self,
        impostazioni: Impostazioni,
        http: httpx.AsyncClient | None = None,
        dimensione_cache: int = 500,
        durata_cache_s: float = 24 * 3600,
    ) -> None:
        self._imp = impostazioni
        self._http = http
        self._cache: OrderedDict[str, tuple[float, list[Localita]]] = OrderedDict()
        self._dimensione_cache = dimensione_cache
        self._durata_cache_s = durata_cache_s
        self._lock = asyncio.Lock()
        self._ultima_richiesta = 0.0

    def _da_cache(self, chiave: str) -> list[Localita] | None:
        voce = self._cache.get(chiave)
        if voce is None:
            return None
        istante, risultati = voce
        if time.monotonic() - istante > self._durata_cache_s:
            del self._cache[chiave]
            return None
        self._cache.move_to_end(chiave)
        return risultati

    def _in_cache(self, chiave: str, risultati: list[Localita]) -> None:
        self._cache[chiave] = (time.monotonic(), risultati)
        self._cache.move_to_end(chiave)
        while len(self._cache) > self._dimensione_cache:
            self._cache.popitem(last=False)

    async def cerca(self, query: str, limite: int = 8) -> list[Localita]:
        chiave = f"{normalizza_query(query)}|{limite}"
        in_cache = self._da_cache(chiave)
        if in_cache is not None:
            return in_cache

        lon_min, lat_min, lon_max, lat_max = RIQUADRO_LOMBARDIA
        parametri = {
            "q": query,
            "format": "jsonv2",
            "limit": str(limite),
            "countrycodes": "it",
            "viewbox": f"{lon_min},{lat_max},{lon_max},{lat_min}",
            "bounded": "1",
            "accept-language": "it",
        }
        if self._imp.nominatim_email:
            parametri["email"] = self._imp.nominatim_email
        intestazioni = {"User-Agent": self._imp.nominatim_user_agent}

        async with self._lock:
            # Rispetta il limite di 1 richiesta al secondo verso Nominatim.
            attesa = self.INTERVALLO_MINIMO_S - (time.monotonic() - self._ultima_richiesta)
            if attesa > 0:
                await asyncio.sleep(attesa)
            try:
                http = self._http or httpx.AsyncClient(timeout=self._imp.nominatim_timeout_s)
                try:
                    risposta = await http.get(self._imp.nominatim_url, params=parametri, headers=intestazioni)
                finally:
                    if self._http is None:
                        await http.aclose()
            except httpx.HTTPError as exc:
                raise ServizioRicercaNonDisponibile(
                    "Servizio di ricerca località non raggiungibile."
                ) from exc
            finally:
                self._ultima_richiesta = time.monotonic()

        if risposta.status_code != 200:
            raise ServizioRicercaNonDisponibile(
                f"Il servizio di ricerca località ha risposto con codice {risposta.status_code}."
            )
        try:
            dati = risposta.json()
        except ValueError as exc:
            raise ServizioRicercaNonDisponibile("Risposta non valida dal servizio di ricerca.") from exc
        if not isinstance(dati, list):
            raise ServizioRicercaNonDisponibile("Risposta non valida dal servizio di ricerca.")

        risultati = interpreta_risposta_nominatim(dati)
        self._in_cache(chiave, risultati)
        return risultati
