"""Profilo altimetrico lungo una linea tracciata dall'utente (Fase 3).

Metodo
------
* La linea (lon/lat WGS84) viene convertita in UTM 32N, il sistema del DTM.
* Viene campionata ogni 5 m (pari alla dimensione della cella), più l'ultimo punto.
* La quota di ogni campione è ottenuta per **interpolazione bilineare** tra i centri
  delle 4 celle più vicine; se una delle 4 celle non ha dato, il campione resta senza
  quota (nessun valore viene inventato).
* Le distanze sono **geodetiche** sull'ellissoide WGS84, come superficie e perimetro.
* Salita e discesa cumulate sommano le differenze di quota tra campioni consecutivi:
  su un DTM a 5 m includono piccole irregolarità del modello, quindi sono indicative.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np
import shapely
from pyproj import Geod
from shapely.geometry import LineString

from app.services.altimetria import AltimetriaNonDisponibile, FinestraDtm, SorgenteDtm, _in_utm, _utm_a_wgs84

PASSO_M = 5.0
LUNGHEZZA_MASSIMA_M = 20_000.0
_GEOD = Geod(ellps="WGS84")


@dataclass(frozen=True)
class PuntoProfilo:
    distanza_m: float
    quota_m: float | None
    lon: float
    lat: float


@dataclass(frozen=True)
class TrattoProfilo:
    """Tratto tra due vertici consecutivi della linea disegnata."""

    da_m: float
    a_m: float
    lunghezza_m: float
    quota_inizio: float | None
    quota_fine: float | None
    dislivello_m: float | None
    pendenza_percento: float | None  # media del tratto: dislivello / lunghezza


@dataclass(frozen=True)
class RisultatoProfilo:
    punti: list[PuntoProfilo]
    lunghezza_m: float  # planimetrica, geodetica
    lunghezza_inclinata_m: float  # lungo il terreno, solo tratti con quota
    quota_minima: float
    quota_massima: float
    quota_iniziale: float | None
    quota_finale: float | None
    salita_m: float
    discesa_m: float
    pendenza_media_percento: float  # media dei valori assoluti, pesata sulla distanza
    pendenza_massima_percento: float  # sul passo di campionamento
    copertura_percento: float
    passo_m: float = PASSO_M
    avvertenze: list[str] = field(default_factory=list)
    tratti: list[TrattoProfilo] = field(default_factory=list)


@dataclass(frozen=True)
class QuotaPunto:
    lon: float
    lat: float
    quota_m: float  # interpolazione bilineare tra i centri delle 4 celle vicine
    quota_cella_m: float  # valore della cella che contiene il punto
    est_utm: float
    nord_utm: float


def lunghezza_geodetica(linea_wgs84: LineString) -> float:
    """Lunghezza della linea sull'ellissoide WGS84 (non richiede il DTM)."""
    lon, lat = linea_wgs84.xy
    return float(_GEOD.line_length(list(lon), list(lat)))


def quota_punto(sorgente: SorgenteDtm, lon: float, lat: float) -> QuotaPunto:
    """Quota stimata in un punto: bilineare tra le 4 celle vicine, più il valore della cella."""
    from app.services.altimetria import _wgs84_a_utm

    x, y = _wgs84_a_utm().transform(lon, lat)
    b = sorgente.bounds
    if not (b.left <= x <= b.right and b.bottom <= y <= b.top):
        raise AltimetriaNonDisponibile("Il punto è fuori dall'area coperta dal DTM della Lombardia.")
    finestra = sorgente.leggi_finestra((x, y, x, y), margine=2)
    interpolata = float(quota_bilineare(finestra, np.array([x]), np.array([y]))[0])
    t = finestra.trasformazione
    colonna = int(math.floor((x - t.c) / t.a))
    riga = int(math.floor((y - t.f) / t.e))
    cella = float(finestra.z[riga, colonna])
    if not (math.isfinite(interpolata) and math.isfinite(cella)):
        raise AltimetriaNonDisponibile("Il DTM non ha dati in questo punto (fuori dalla Lombardia o cella vuota).")
    return QuotaPunto(lon=lon, lat=lat, quota_m=interpolata, quota_cella_m=cella, est_utm=x, nord_utm=y)


def quota_bilineare(finestra: FinestraDtm, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Quote interpolate (bilineari tra centri cella) nei punti UTM (x, y); NaN se manca un vicino."""
    t = finestra.trasformazione
    # Coordinate continue di colonna/riga riferite ai centri cella
    colonna = (x - t.c) / t.a - 0.5
    riga = (y - t.f) / t.e - 0.5
    z = finestra.z
    altezza, larghezza = z.shape
    # Il punto deve stare tra i centri cella della finestra (bordi inclusi)
    dentro = (colonna >= 0) & (riga >= 0) & (colonna <= larghezza - 1) & (riga <= altezza - 1)
    # Indice della cella "in alto a sinistra" dei 4 vicini, limitato perché esista sempre la cella successiva
    c0 = np.clip(np.floor(colonna), 0, max(larghezza - 2, 0)).astype(int)
    r0 = np.clip(np.floor(riga), 0, max(altezza - 2, 0)).astype(int)
    fc = colonna - c0
    fr = riga - r0
    risultato = np.full(x.shape, np.nan)
    c0d, r0d, fcd, frd = c0[dentro], r0[dentro], fc[dentro], fr[dentro]
    z00 = z[r0d, c0d]
    z01 = z[r0d, c0d + 1]
    z10 = z[r0d + 1, c0d]
    z11 = z[r0d + 1, c0d + 1]
    risultato[dentro] = (
        z00 * (1 - fcd) * (1 - frd) + z01 * fcd * (1 - frd) + z10 * (1 - fcd) * frd + z11 * fcd * frd
    )  # NaN se uno dei 4 vicini è NaN
    return risultato


def calcola_profilo(sorgente: SorgenteDtm, linea_wgs84: LineString) -> RisultatoProfilo:
    linea = _in_utm(linea_wgs84)
    if linea.length > LUNGHEZZA_MASSIMA_M:
        raise AltimetriaNonDisponibile(
            f"La linea è lunga {linea.length / 1000:.1f} km: il profilo è limitato a "
            f"{LUNGHEZZA_MASSIMA_M / 1000:.0f} km."
        )
    if linea.length < PASSO_M:
        raise AltimetriaNonDisponibile("La linea è più corta di una cella del DTM (5 m).")
    sorgente.controlla_copertura(linea)

    # Campioni ogni 5 m più l'ultimo punto (senza duplicarlo se cade già su un multiplo di 5 m)
    distanze_utm = np.arange(int(linea.length // PASSO_M) + 1) * PASSO_M
    if linea.length - distanze_utm[-1] > 0.01:
        distanze_utm = np.append(distanze_utm, linea.length)
    else:
        distanze_utm[-1] = linea.length
    punti_utm = shapely.line_interpolate_point(linea, distanze_utm)
    xs = shapely.get_x(punti_utm)
    ys = shapely.get_y(punti_utm)

    finestra = sorgente.leggi_finestra(linea.bounds, margine=2)
    quote = quota_bilineare(finestra, xs, ys)
    valide = np.isfinite(quote)
    if not valide.any():
        raise AltimetriaNonDisponibile("Il DTM non contiene quote lungo la linea.")

    lons, lats = _utm_a_wgs84().transform(xs, ys)
    tratti = np.array(_GEOD.line_lengths(lons, lats))  # distanze geodetiche tra campioni
    distanze = np.concatenate([[0.0], np.cumsum(tratti)])

    dz = np.diff(quote)
    coppie = np.isfinite(dz)  # tratti con quota a entrambi gli estremi
    salita = float(dz[coppie & (dz > 0)].sum())
    discesa = float(np.abs(dz[coppie & (dz < 0)]).sum())  # positiva (evita "-0,0")
    orizzontale = tratti[coppie]
    pendenze = np.abs(dz[coppie]) / np.where(orizzontale > 0, orizzontale, np.nan) * 100
    lunghezza_coperta = float(orizzontale.sum())

    avvertenze: list[str] = []
    copertura = float(valide.sum()) / valide.size * 100
    if copertura < 100:
        avvertenze.append(
            f"Il DTM copre il {copertura:.1f}% della linea: i tratti senza dato non sono disegnati né conteggiati."
        )

    def q(indice: int) -> float | None:
        return float(quote[indice]) if valide[indice] else None

    # Tratti tra i vertici disegnati: quote ai vertici (bilineari) e lunghezze geodetiche
    vertici_utm = np.array(linea.coords)
    quote_vertici = quota_bilineare(finestra, vertici_utm[:, 0], vertici_utm[:, 1])
    lon_v, lat_v = linea_wgs84.xy
    lunghezze_v = np.array(_GEOD.line_lengths(list(lon_v), list(lat_v)))
    progressive = np.concatenate([[0.0], np.cumsum(lunghezze_v)])
    elenco_tratti = []
    for i, lung in enumerate(lunghezze_v):
        z0, z1 = quote_vertici[i], quote_vertici[i + 1]
        noto = bool(np.isfinite(z0) and np.isfinite(z1) and lung > 0)
        elenco_tratti.append(
            TrattoProfilo(
                da_m=float(progressive[i]),
                a_m=float(progressive[i + 1]),
                lunghezza_m=float(lung),
                quota_inizio=float(z0) if np.isfinite(z0) else None,
                quota_fine=float(z1) if np.isfinite(z1) else None,
                dislivello_m=float(z1 - z0) if noto else None,
                pendenza_percento=float((z1 - z0) / lung * 100) if noto else None,
            )
        )

    return RisultatoProfilo(
        punti=[
            PuntoProfilo(
                distanza_m=float(d),
                quota_m=float(z) if math.isfinite(z) else None,
                lon=float(lo),
                lat=float(la),
            )
            for d, z, lo, la in zip(distanze, quote, lons, lats)
        ],
        lunghezza_m=float(distanze[-1]),
        lunghezza_inclinata_m=float(np.hypot(orizzontale, dz[coppie]).sum()),
        quota_minima=float(np.nanmin(quote)),
        quota_massima=float(np.nanmax(quote)),
        quota_iniziale=q(0),
        quota_finale=q(-1),
        salita_m=salita,
        discesa_m=discesa,
        pendenza_media_percento=(salita + discesa) / lunghezza_coperta * 100 if lunghezza_coperta else 0.0,
        pendenza_massima_percento=float(np.nanmax(pendenze)) if pendenze.size else 0.0,
        copertura_percento=copertura,
        avvertenze=avvertenze,
        tratti=elenco_tratti,
    )
