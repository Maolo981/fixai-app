"""Report PDF dell'analisi del terreno (Fase 4).

Il report riporta SOLO risultati calcolati dal server con gli stessi moduli
dell'API: i valori non vengono mai presi dal browser. Le sezioni senza dati
sono dichiarate come "non disponibili", e l'avvertenza legale compare su ogni pagina.

Grafica: mappe, rosa delle esposizioni e profilo sono disegnati in coordinate
UTM 32N (metri), quindi proporzioni e barra di scala sono corrette.
Font: Helvetica standard PDF (nessun font da installare).
"""

from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass, field
from datetime import datetime
from io import BytesIO
from xml.sax.saxutils import escape

from PIL import Image
from pyproj import Transformer
from reportlab.graphics.shapes import Circle, Drawing, Group, Line, PolyLine, Rect, String, Wedge
from reportlab.graphics.shapes import Image as ImmagineDisegno
from reportlab.graphics.shapes import Polygon as PoligonoDisegno
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from shapely.geometry import LineString, Polygon, shape

from app import __version__
from app.api.schemi import AVVERTENZA_LEGALE, RispostaAnalisiGeometria
from app.services.altimetria import _in_utm
from app.services.area_pilota import ATTRIBUZIONE_CONFINE, geometria_lombardia
from app.services.mappe import MappaTematica
from app.services.profilo import RisultatoProfilo

# ------------------------------------------------------------------ stile

VERDE = colors.HexColor("#14532d")
VERDE_CHIARO = colors.HexColor("#dcfce7")
ARANCIO = colors.HexColor("#ea580c")
ARANCIO_SCURO = colors.HexColor("#9a3412")
BLU = colors.HexColor("#1d4ed8")
ROSSO = colors.HexColor("#b91c1c")
GRIGIO = colors.HexColor("#64748b")
GRIGIO_CHIARO = colors.HexColor("#e2e8f0")
SFONDO = colors.HexColor("#f8fafc")

LARGHEZZA_UTILE = A4[0] - 36 * mm

STILI = {
    "titolo": ParagraphStyle("titolo", fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=VERDE),
    "sottotitolo": ParagraphStyle("sottotitolo", fontName="Helvetica", fontSize=9.5, leading=13, textColor=GRIGIO),
    "h2": ParagraphStyle(
        "h2", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=VERDE, spaceBefore=10, spaceAfter=5,
        keepWithNext=1,  # il titolo non resta mai da solo in fondo alla pagina
    ),
    "testo": ParagraphStyle("testo", fontName="Helvetica", fontSize=9, leading=12.5),
    "piccolo": ParagraphStyle("piccolo", fontName="Helvetica", fontSize=7.8, leading=10.5, textColor=GRIGIO),
    "avviso": ParagraphStyle(
        "avviso", fontName="Helvetica", fontSize=8.5, leading=11.5, textColor=colors.HexColor("#92400e"),
        backColor=colors.HexColor("#fffbeb"), borderColor=colors.HexColor("#fde68a"), borderWidth=0.6,
        borderPadding=5, spaceBefore=4, spaceAfter=6,
    ),
    "non_disponibile": ParagraphStyle(
        "non_disponibile", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=colors.HexColor("#334155"),
        backColor=colors.HexColor("#f1f5f9"), borderPadding=6, spaceBefore=2, spaceAfter=6,
    ),
    "legale": ParagraphStyle(
        "legale", fontName="Helvetica-Bold", fontSize=9, leading=12.5, textColor=colors.HexColor("#713f12"),
        backColor=colors.HexColor("#fefce8"), borderColor=colors.HexColor("#facc15"), borderWidth=0.8,
        borderPadding=7, spaceBefore=8,
    ),
}

NOMI_SETTORI = {
    "N": "Nord", "NE": "Nord-Est", "E": "Est", "SE": "Sud-Est", "S": "Sud",
    "SO": "Sud-Ovest", "O": "Ovest", "NO": "Nord-Ovest", "Pianeggiante": "Pianeggiante",
}

_A_UTM = Transformer.from_crs("EPSG:4326", "EPSG:32632", always_xy=True)


# ------------------------------------------------------------------ formattazione


def numero(valore: float, decimali: int = 0) -> str:
    """Numero in formato italiano: 12.345,67 (anche per le migliaia a 4 cifre). Mai "-0"."""
    if round(valore, decimali) == 0:
        valore = 0.0
    testo = f"{valore:,.{decimali}f}"
    return testo.replace(",", "§").replace(".", ",").replace("§", ".")


def salita_discesa(salita: float, discesa: float) -> str:
    def segno(v: float, s: str) -> str:
        return f"{s}{numero(abs(v), 1)} m" if round(abs(v), 1) > 0 else "0,0 m"

    return f"{segno(salita, '+')} / {segno(discesa, '-')}"


def metri(valore: float | None, decimali: int = 1) -> str:
    return "n.d." if valore is None else f"{numero(valore, decimali)} m"


def superficie_catastale(m2: float) -> str:
    totale = round(m2)
    return f"{totale // 10_000} ha {(totale % 10_000) // 100} are {totale % 100} ca"


def lunghezza(m: float) -> str:
    return f"{numero(m, 1)} m" if m < 10_000 else f"{numero(m / 1000, 3)} km"


def p(testo: str, stile: str = "testo") -> Paragraph:
    """Paragrafo con testo SEMPRE "escaped": i campi scritti dall'utente non diventano markup."""
    return Paragraph(escape(testo), STILI[stile])


# ------------------------------------------------------------------ dati in ingresso


@dataclass(frozen=True)
class CampiUtente:
    committente: str = ""
    riferimento: str = ""
    note: str = ""


@dataclass
class DatiReport:
    poligono: Polygon  # lon/lat WGS84
    analisi: RispostaAnalisiGeometria
    mappa_pendenze: MappaTematica | None = None
    mappa_esposizioni: MappaTematica | None = None
    linea: LineString | None = None
    profilo: RisultatoProfilo | None = None
    motivo_profilo: str | None = None
    campi: CampiUtente = field(default_factory=CampiUtente)
    generato_il: datetime = field(default_factory=lambda: datetime.now().astimezone())

    @property
    def codice(self) -> str:
        impronta = hashlib.sha256(
            json.dumps(
                [list(self.poligono.exterior.coords), list(self.linea.coords) if self.linea else None,
                 self.generato_il.isoformat()],
            ).encode()
        ).hexdigest()[:6].upper()
        return f"TS-{self.generato_il:%Y%m%d}-{impronta}"


# ------------------------------------------------------------------ disegni


class _Inquadramento:
    """Trasforma coordinate UTM (m) in punti del disegno, mantenendo le proporzioni."""

    def __init__(self, limiti: tuple[float, float, float, float], larghezza: float, altezza: float, margine=0.08):
        o, s, e, n = limiti
        dx, dy = max(e - o, 1.0), max(n - s, 1.0)
        o, e, s, n = o - dx * margine, e + dx * margine, s - dy * margine, n + dy * margine
        self.scala = min(larghezza / (e - o), altezza / (n - s))  # punti per metro
        self.o = o - (larghezza / self.scala - (e - o)) / 2
        self.s = s - (altezza / self.scala - (n - s)) / 2

    def __call__(self, x: float, y: float) -> tuple[float, float]:
        return (x - self.o) * self.scala, (y - self.s) * self.scala


def _barra_di_scala(disegno: Drawing, scala: float, larghezza: float) -> None:
    obiettivo = larghezza * 0.25 / scala  # metri
    potenza = 10 ** math.floor(math.log10(obiettivo))
    metri_barra = max(k * potenza for k in (1, 2, 5) if k * potenza <= obiettivo)
    lung = metri_barra * scala
    x0, y0 = 8, 8
    disegno.add(Rect(x0 - 3, y0 - 3, lung + 6, 17, fillColor=colors.Color(1, 1, 1, 0.85), strokeColor=None))
    disegno.add(Rect(x0, y0, lung / 2, 3, fillColor=colors.black, strokeColor=colors.black, strokeWidth=0.5))
    disegno.add(Rect(x0 + lung / 2, y0, lung / 2, 3, fillColor=colors.white, strokeColor=colors.black, strokeWidth=0.5))
    etichetta = f"{numero(metri_barra / 1000, 1 if metri_barra < 1000 else 0)} km" if metri_barra >= 1000 else f"{numero(metri_barra)} m"
    disegno.add(String(x0, y0 + 5.5, etichetta, fontName="Helvetica", fontSize=6.5))


def _freccia_nord(disegno: Drawing, x: float, y: float) -> None:
    disegno.add(PoligonoDisegno([x, y + 14, x - 5, y, x, y + 4, x + 5, y], fillColor=colors.black, strokeColor=None))
    disegno.add(String(x, y + 17, "N", fontName="Helvetica-Bold", fontSize=8, textAnchor="middle"))


def _immagine_tematica(mappa: MappaTematica, larghezza_pt: float) -> Image.Image:
    """PNG della mappa ingrandito "a blocchi" (celle nette) e appoggiato su fondo bianco."""
    sorgente = Image.open(BytesIO(mappa.png)).convert("RGBA")
    fattore = max(1, min(24, math.ceil(larghezza_pt * 3 / max(sorgente.width, 1))))
    grande = sorgente.resize((sorgente.width * fattore, sorgente.height * fattore), Image.NEAREST)
    fondo = Image.new("RGB", grande.size, (255, 255, 255))
    fondo.paste(grande, mask=grande.split()[3])
    return fondo


def disegno_terreno(
    dati: DatiReport,
    larghezza: float,
    altezza: float,
    mappa: MappaTematica | None = None,
    con_vertici: bool = True,
    con_linea: bool = True,
) -> Drawing:
    poligono = _in_utm(dati.poligono)
    geometrie = [poligono]
    linea = _in_utm(dati.linea) if (con_linea and dati.linea is not None) else None
    if linea is not None:
        geometrie.append(linea)
    limiti = (
        min(g.bounds[0] for g in geometrie), min(g.bounds[1] for g in geometrie),
        max(g.bounds[2] for g in geometrie), max(g.bounds[3] for g in geometrie),
    )
    t = _Inquadramento(limiti, larghezza, altezza)
    d = Drawing(larghezza, altezza)
    d.add(Rect(0, 0, larghezza, altezza, fillColor=SFONDO, strokeColor=GRIGIO_CHIARO, strokeWidth=0.6))

    if mappa is not None:
        o, s, e, n = mappa.limiti_utm
        x0, y0 = t(o, s)
        x1, y1 = t(e, n)
        d.add(ImmagineDisegno(x0, y0, x1 - x0, y1 - y0, _immagine_tematica(mappa, x1 - x0)))

    punti = [c for xy in poligono.exterior.coords for c in t(*xy)]
    d.add(PoligonoDisegno(
        punti, fillColor=None if mappa else colors.Color(0.92, 0.35, 0.05, 0.18),
        strokeColor=ARANCIO_SCURO, strokeWidth=1.4,
    ))
    if con_vertici:
        for i, xy in enumerate(list(poligono.exterior.coords)[:-1], start=1):
            x, y = t(*xy)
            d.add(Circle(x, y, 2.2, fillColor=colors.white, strokeColor=ARANCIO_SCURO, strokeWidth=0.8))
            d.add(String(x + 3.5, y + 3, str(i), fontName="Helvetica-Bold", fontSize=7, fillColor=ARANCIO_SCURO))
    if linea is not None:
        d.add(PolyLine([c for xy in linea.coords for c in t(*xy)], strokeColor=BLU, strokeWidth=1.6))
        xa, ya = t(*linea.coords[0])
        xb, yb = t(*linea.coords[-1])
        d.add(String(xa - 3, ya + 3, "A", fontName="Helvetica-Bold", fontSize=7, fillColor=BLU, textAnchor="end"))
        d.add(String(xb + 3, yb + 3, "B", fontName="Helvetica-Bold", fontSize=7, fillColor=BLU))

    quote = dati.analisi.altimetria.quote
    if quote is not None and mappa is None:
        for punto, colore, su in ((quote.punto_massimo, ROSSO, True), (quote.punto_minimo, BLU, False)):
            x, y = t(*_A_UTM.transform(punto.lon, punto.lat))
            vertici = [x - 4, y - 3, x + 4, y - 3, x, y + 4] if su else [x - 4, y + 3, x + 4, y + 3, x, y - 4]
            d.add(PoligonoDisegno(vertici, fillColor=colore, strokeColor=colors.white, strokeWidth=0.6))

    _barra_di_scala(d, t.scala, larghezza)
    _freccia_nord(d, larghezza - 14, altezza - 26)
    return d


def disegno_localizzazione(dati: DatiReport, larghezza: float, altezza: float) -> Drawing:
    regione = _in_utm(shape(geometria_lombardia()))
    t = _Inquadramento(regione.bounds, larghezza, altezza, margine=0.04)
    d = Drawing(larghezza, altezza)
    d.add(Rect(0, 0, larghezza, altezza, fillColor=SFONDO, strokeColor=GRIGIO_CHIARO, strokeWidth=0.6))
    for parte in getattr(regione, "geoms", [regione]):
        d.add(PoligonoDisegno(
            [c for xy in parte.exterior.coords for c in t(*xy)],
            fillColor=VERDE_CHIARO, strokeColor=VERDE, strokeWidth=0.8,
        ))
    cx, cy = t(*_A_UTM.transform(dati.analisi.centroide.lon, dati.analisi.centroide.lat))
    d.add(Circle(cx, cy, 6, fillColor=colors.Color(0.92, 0.35, 0.05, 0.25), strokeColor=None))
    d.add(Circle(cx, cy, 2.6, fillColor=ARANCIO, strokeColor=colors.white, strokeWidth=0.8))
    d.add(String(4, 4, "Lombardia (area pilota)", fontName="Helvetica", fontSize=6.5, fillColor=GRIGIO))
    return d


def disegno_rosa(settori: dict[str, float], raggio: float = 34) -> Drawing:
    lato = raggio * 2 + 24
    d = Drawing(lato, lato)
    cx = cy = lato / 2
    d.add(Circle(cx, cy, raggio, fillColor=SFONDO, strokeColor=GRIGIO_CHIARO, strokeWidth=0.8))
    ordine = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"]
    massimo = max([settori.get(s, 0) for s in ordine] + [1e-9])
    for i, s in enumerate(ordine):
        valore = settori.get(s, 0)
        if valore <= 0:
            continue
        r = 4 + (valore / massimo) * (raggio - 4)
        azimut = i * 45
        d.add(Wedge(cx, cy, r, 90 - azimut - 22.5, 90 - azimut + 22.5,
                    fillColor=colors.HexColor("#166534"), strokeColor=colors.white, strokeWidth=0.5))
    for testo, dx, dy in (("N", 0, raggio + 4), ("E", raggio + 7, -3), ("S", 0, -raggio - 10), ("O", -raggio - 7, -3)):
        d.add(String(cx + dx, cy + dy, testo, fontName="Helvetica-Bold", fontSize=7, fillColor=GRIGIO,
                     textAnchor="middle"))
    return d


def _tacche(minimo: float, massimo: float, quante: int = 4) -> list[float]:
    if not massimo > minimo:
        return [minimo]
    grezzo = (massimo - minimo) / quante
    potenza = 10 ** math.floor(math.log10(grezzo))
    passo = next(k * potenza for k in (1, 2, 5, 10) if k * potenza >= grezzo)
    valore = math.ceil(minimo / passo) * passo
    valori = []
    while valore <= massimo + 1e-9:
        valori.append(round(valore, 10))
        valore += passo
    return valori


def disegno_profilo(profilo: RisultatoProfilo, larghezza: float, altezza: float) -> Drawing:
    sx, dx, su, giu = 40, 8, 8, 20
    d = Drawing(larghezza, altezza)
    quote = [pt.quota_m for pt in profilo.punti if pt.quota_m is not None]
    q_min, q_max = min(quote), max(quote)
    if q_max - q_min < 2:
        centro = (q_max + q_min) / 2
        q_min, q_max = centro - 1, centro + 1
    margine = (q_max - q_min) * 0.06
    q_min, q_max = q_min - margine, q_max + margine
    d_max = profilo.punti[-1].distanza_m or 1

    def x(dist):
        return sx + dist / d_max * (larghezza - sx - dx)

    def y(q):
        return giu + (q - q_min) / (q_max - q_min) * (altezza - su - giu)

    for q in _tacche(q_min, q_max):
        d.add(Line(sx, y(q), larghezza - dx, y(q), strokeColor=GRIGIO_CHIARO, strokeWidth=0.5))
        d.add(String(sx - 4, y(q) - 2.5, numero(q), fontName="Helvetica", fontSize=6.5, fillColor=GRIGIO,
                     textAnchor="end"))
    for dist in _tacche(0, d_max, 4):
        etichetta = f"{numero(dist / 1000, 1)} km" if d_max >= 2000 else f"{numero(dist)} m"
        d.add(String(x(dist), 6, etichetta, fontName="Helvetica", fontSize=6.5, fillColor=GRIGIO, textAnchor="middle"))
    d.add(String(sx - 30, altezza - 7, "quota (m)", fontName="Helvetica", fontSize=6.5, fillColor=GRIGIO))

    tratto: list[float] = []
    for pt in profilo.punti + [None]:
        if pt is not None and pt.quota_m is not None:
            tratto += [x(pt.distanza_m), y(pt.quota_m)]
            continue
        if len(tratto) >= 4:
            area = [tratto[0], giu] + tratto + [tratto[-2], giu]
            d.add(PoligonoDisegno(area, fillColor=colors.Color(0.11, 0.30, 0.85, 0.12), strokeColor=None))
            d.add(PolyLine(tratto, strokeColor=BLU, strokeWidth=1.3))
        tratto = []
    d.add(String(sx, altezza - su + 1, "A", fontName="Helvetica-Bold", fontSize=7, fillColor=BLU))
    d.add(String(larghezza - dx, altezza - su + 1, "B", fontName="Helvetica-Bold", fontSize=7, fillColor=BLU,
                 textAnchor="end"))
    return d


def _barra(percentuale: float, colore, larghezza: float = 90) -> Drawing:
    d = Drawing(larghezza, 7)
    d.add(Rect(0, 0, larghezza, 6, fillColor=GRIGIO_CHIARO, strokeColor=None))
    if percentuale > 0:
        d.add(Rect(0, 0, max(0.8, larghezza * percentuale / 100), 6, fillColor=colore, strokeColor=None))
    return d


# ------------------------------------------------------------------ tabelle


def _tabella(righe: list[list], larghezze: list[float], intestazione: bool = False) -> Table:
    tabella = Table(righe, colWidths=larghezze, hAlign="LEFT")
    stile = [
        ("FONT", (0, 0), (-1, -1), "Helvetica", 8.8),
        ("TEXTCOLOR", (0, 0), (0, -1), GRIGIO),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, GRIGIO_CHIARO),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]
    if intestazione:
        stile += [
            ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8),
            ("TEXTCOLOR", (0, 0), (-1, 0), VERDE),
            ("BACKGROUND", (0, 0), (-1, 0), SFONDO),
            ("TEXTCOLOR", (0, 1), (0, -1), colors.black),
        ]
    tabella.setStyle(TableStyle(stile))
    return tabella


def _legenda(mappa: MappaTematica) -> Table:
    righe = []
    for voce in mappa.legenda:
        righe.append(["", voce.etichetta, f"{numero(voce.percentuale_celle, 1)} %"])
    tabella = Table(righe, colWidths=[9, 84, 34], hAlign="LEFT")
    stile = [
        ("FONT", (0, 0), (-1, -1), "Helvetica", 7.2),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
    ]
    for i, voce in enumerate(mappa.legenda):
        stile.append(("BACKGROUND", (0, i), (0, i), colors.HexColor(voce.colore)))
    tabella.setStyle(TableStyle(stile))
    return tabella


# ------------------------------------------------------------------ sezioni


def _sezione_intestazione(dati: DatiReport) -> list:
    elementi = [
        p("Report di analisi preliminare del terreno", "titolo"),
        p(f"Codice {dati.codice}  ·  generato il {dati.generato_il:%d/%m/%Y alle %H:%M}  ·  "
          f"TerraScan Italia v{__version__}", "sottotitolo"),
        Spacer(1, 6),
    ]
    campi = [
        ("Committente", dati.campi.committente),
        ("Riferimento pratica", dati.campi.riferimento),
        ("Note", dati.campi.note),
    ]
    righe = [[nome, p(valore)] for nome, valore in campi if valore.strip()]
    if righe:
        elementi += [_tabella(righe, [38 * mm, LARGHEZZA_UTILE - 38 * mm]),
                     p("Dati inseriti dall'utente, non verificati da TerraScan Italia.", "piccolo"), Spacer(1, 4)]
    return elementi


def _sezione_inquadramento(dati: DatiReport) -> list:
    a = dati.analisi
    e, n = _A_UTM.transform(a.centroide.lon, a.centroide.lat)
    stato = {"interno": "dentro l'area pilota", "parziale": "parzialmente fuori dall'area pilota",
             "esterno": "fuori dall'area pilota"}[a.area_pilota.stato]
    larghezza_mappa = LARGHEZZA_UTILE - 62 * mm
    disegni = Table(
        [[disegno_localizzazione(dati, 56 * mm, 56 * mm), disegno_terreno(dati, larghezza_mappa, 92 * mm)]],
        colWidths=[62 * mm, larghezza_mappa], hAlign="LEFT",
    )
    disegni.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    elementi = [
        p("1. Inquadramento", "h2"),
        disegni,
        p("Perimetro del terreno (arancione) con i vertici numerati"
          + (", linea del profilo A-B (blu)" if dati.linea is not None else "")
          + (", punto più alto (triangolo rosso) e più basso (triangolo blu)" if a.altimetria.quote else "")
          + ". Nord e barra di scala riferiti alla griglia UTM 32N.", "piccolo"),
        Spacer(1, 4),
        _tabella([
            ["Centroide (WGS84)", f"{numero(a.centroide.lat, 6)} N, {numero(a.centroide.lon, 6)} E"],
            ["Centroide (UTM 32N)", f"E {numero(e, 1)} m, N {numero(n, 1)} m"],
            ["Area pilota", f"{a.area_pilota.nome}: {stato}"],
        ], [45 * mm, LARGHEZZA_UTILE - 45 * mm]),
    ]
    elementi += [p(avviso, "avviso") for avviso in a.avvertenze]
    return elementi


def _sezione_misure(dati: DatiReport) -> list:
    a = dati.analisi
    return [KeepTogether([
        p("2. Superficie e perimetro", "h2"),
        _tabella([
            ["Superficie", f"{numero(a.superficie.m2)} m²  ·  {numero(a.superficie.ettari, 4)} ha  ·  "
                           f"{superficie_catastale(a.superficie.m2)}"],
            ["Perimetro", lunghezza(a.perimetro.m)],
            ["Numero di vertici", str(a.numero_vertici)],
            ["Controllo in UTM 32N", f"superficie {numero(a.controllo_utm32.area_m2)} m² "
                                     f"(scarto {numero(a.controllo_utm32.differenza_area_percentuale, 3)} %), "
                                     f"perimetro {lunghezza(a.controllo_utm32.perimetro_m)}"],
        ], [45 * mm, LARGHEZZA_UTILE - 45 * mm]),
        p(f"Metodo: {a.superficie.metodo}. La superficie è planimetrica (proiettata sull'ellissoide) e non tiene "
          "conto della pendenza. Lo scarto del controllo UTM è dovuto al fattore di scala della proiezione.", "piccolo"),
    ])]


def _sezione_altimetria(dati: DatiReport) -> list:
    alt = dati.analisi.altimetria
    titolo = p("3. Analisi altimetrica", "h2")
    if not alt.disponibile or alt.quote is None or alt.pendenza is None or alt.esposizione is None:
        return [titolo, p("Dati altimetrici non disponibili", "non_disponibile"),
                p(alt.motivo or "", "piccolo"),
                p("Nessun valore altimetrico è stimato o simulato.", "piccolo")]
    q, pend, esp = alt.quote, alt.pendenza, alt.esposizione
    settori = {s.settore: s.percentuale_celle for s in esp.settori}

    quote = _tabella([
        ["Quota minima", metri(q.minima)],
        ["Quota massima", metri(q.massima)],
        ["Quota media", metri(q.media)],
        ["Dislivello", metri(q.dislivello)],
        ["Pendenza media", f"{numero(pend.media_percento, 1)} % ({numero(pend.media_gradi, 1)}°)"],
        ["Pendenza massima", f"{numero(pend.massima_percento, 1)} % ({numero(pend.massima_gradi, 1)}°)"],
        ["Esposizione prevalente", NOMI_SETTORI.get(esp.prevalente, esp.prevalente)],
    ], [38 * mm, 42 * mm])

    righe_classi = [["Classe di pendenza", "Celle", ""]]
    from app.services.mappe import COLORI_PENDENZA

    for i, c in enumerate(pend.classi):
        etichetta = f"oltre {numero(c.da_percento)} %" if c.a_percento is None else \
            f"{numero(c.da_percento)}–{numero(c.a_percento)} %"
        righe_classi.append([etichetta, f"{numero(c.percentuale_celle, 1)} %",
                             _barra(c.percentuale_celle, colors.HexColor(COLORI_PENDENZA[i]), 70)])
    classi = _tabella(righe_classi, [32 * mm, 16 * mm, 27 * mm], intestazione=True)

    blocco = Table([[quote, classi]], colWidths=[84 * mm, LARGHEZZA_UTILE - 84 * mm], hAlign="LEFT")
    blocco.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))

    righe_esp = [[NOMI_SETTORI[s], f"{numero(settori.get(s, 0), 1)} %"]
                 for s in ["N", "NE", "E", "SE", "S", "SO", "O", "NO", "Pianeggiante"]]
    esposizione = Table(
        [[disegno_rosa(settori), _tabella(righe_esp, [26 * mm, 18 * mm])]],
        colWidths=[34 * mm, 50 * mm], hAlign="LEFT",
    )
    esposizione.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))

    elementi = [titolo, blocco, Spacer(1, 6),
                KeepTogether([p("Esposizione dei versanti", "testo"), esposizione])]
    elementi += [p(a, "avviso") for a in alt.avvertenze]

    mappe = [m for m in (dati.mappa_pendenze, dati.mappa_esposizioni) if m is not None]
    if mappe:
        largh = (LARGHEZZA_UTILE - 6 * mm) / 2
        celle = [[disegno_terreno(dati, largh, largh * 0.9, mappa=m, con_vertici=False, con_linea=False)
                  for m in mappe], [_legenda(m) for m in mappe]]
        titoli = [p("Mappa delle pendenze" if m.tipo == "pendenza" else "Mappa delle esposizioni", "testo")
                  for m in mappe]
        tabella = Table([titoli, *celle], colWidths=[largh + 3 * mm] * len(mappe), hAlign="LEFT")
        tabella.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
        elementi += [Spacer(1, 4), KeepTogether([tabella, p(
            "Ogni quadrato colorato è una cella del DTM (5 × 5 m) il cui centro cade nel terreno. "
            "Classi di pendenza descrittive, non normative.", "piccolo")])]
    if alt.celle and alt.fonte:
        elementi.append(p(
            f"Celle analizzate: {numero(alt.celle.valide)} su {numero(alt.celle.interne)} "
            f"(copertura {numero(alt.celle.copertura_percento, 1)} %). {q.nota} {pend.metodo} {esp.metodo}",
            "piccolo"))
    return elementi


def _sezione_profilo(dati: DatiReport) -> list:
    if dati.linea is None:
        return []
    titolo = p("4. Profilo altimetrico (A-B)", "h2")
    pr = dati.profilo
    if pr is None:
        return [titolo, p("Dati altimetrici non disponibili", "non_disponibile"), p(dati.motivo_profilo or "", "piccolo")]
    statistiche = _tabella([
        ["Lunghezza (planimetrica)", lunghezza(pr.lunghezza_m)],
        ["Lunghezza lungo il terreno", lunghezza(pr.lunghezza_inclinata_m)],
        ["Quota in A / in B", f"{metri(pr.quota_iniziale)} / {metri(pr.quota_finale)}"],
        ["Quota minima / massima", f"{metri(pr.quota_minima)} / {metri(pr.quota_massima)}"],
        ["Salita / discesa cumulate", salita_discesa(pr.salita_m, pr.discesa_m)],
        ["Pendenza media", f"{numero(pr.pendenza_media_percento, 1)} %"],
        ["Copertura del DTM", f"{numero(pr.copertura_percento, 1)} %"],
    ], [52 * mm, LARGHEZZA_UTILE - 52 * mm])
    elementi = [KeepTogether([titolo, disegno_profilo(pr, LARGHEZZA_UTILE, 62 * mm), Spacer(1, 4), statistiche])]
    elementi += [p(a, "avviso") for a in pr.avvertenze]
    elementi.append(p(
        f"Campioni ogni {numero(pr.passo_m)} m, quota per interpolazione bilineare tra i centri delle 4 celle più "
        "vicine del DTM; distanze geodetiche. Salita e discesa cumulate includono le piccole irregolarità del "
        "modello e sono indicative.", "piccolo"))
    return elementi


def _sezione_vertici(dati: DatiReport, numero_sezione: int) -> list:
    righe = [["#", "Latitudine", "Longitudine", "Est UTM 32N (m)", "Nord UTM 32N (m)"]]
    for i, (lon, lat) in enumerate(list(dati.poligono.exterior.coords)[:-1], start=1):
        e, n = _A_UTM.transform(lon, lat)
        righe.append([str(i), numero(lat, 7), numero(lon, 7), numero(e, 2), numero(n, 2)])
    tabella = _tabella(righe, [10 * mm, 33 * mm, 33 * mm, 38 * mm, 38 * mm], intestazione=True)
    tabella.setStyle(TableStyle([("ALIGN", (1, 1), (-1, -1), "RIGHT"), ("ALIGN", (1, 0), (-1, 0), "RIGHT")]))
    return [p(f"{numero_sezione}. Coordinate dei vertici", "h2"), tabella,
            p("Coordinate geografiche WGS84 e piane WGS84 / UTM fuso 32N (EPSG:32632), come disegnate sulla mappa.",
              "piccolo")]


def _sezione_fonti(dati: DatiReport, numero_sezione: int) -> list:
    alt = dati.analisi.altimetria
    voci = [
        "Superficie e perimetro: calcolo geodetico sull'ellissoide WGS84 (algoritmo di Karney, libreria "
        "GeographicLib tramite pyproj), con controllo indipendente in proiezione UTM 32N.",
        ATTRIBUZIONE_CONFINE + ".",
    ]
    if alt.fonte:
        voci += [
            alt.fonte.attribuzione,
            alt.fonte.precisione_dichiarata,
            "Quote sul livello del mare (verificato con il livello dei laghi di Como, Garda, Lugano e Varese). "
            "Il DTM installato è stato verificato cella per cella contro l'originale della Regione e a campione "
            "contro il servizio WMS ufficiale.",
            "Limiti del DTM: dati 2015 (non riflettono scavi o costruzioni successivi); modello del terreno nudo, "
            "senza edifici e vegetazione; sui laghi è riportato il livello dell'acqua; celle di 5 m (elementi più "
            "stretti, come muri o scarpate, non sono rappresentati).",
        ]
    elementi = [p(f"{numero_sezione}. Fonti, metodi e limiti", "h2")]
    elementi += [Paragraph("•&nbsp;&nbsp;" + escape(v), STILI["testo"]) for v in voci]
    elementi.append(Paragraph(escape(AVVERTENZA_LEGALE), STILI["legale"]))
    return elementi


# ------------------------------------------------------------------ documento


def _pagina(canvas, documento, codice: str) -> None:
    canvas.saveState()
    larghezza, altezza = A4
    canvas.setFillColor(VERDE)
    canvas.rect(0, altezza - 11 * mm, larghezza, 11 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 10)
    canvas.drawString(18 * mm, altezza - 7.2 * mm, "TerraScan Italia")
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(larghezza - 18 * mm, altezza - 7.2 * mm, f"Report {codice}")
    canvas.setFillColor(GRIGIO)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(18 * mm, 10 * mm,
                      "Analisi preliminare e indicativa: non sostituisce un rilievo topografico o una perizia tecnica "
                      "certificati.")
    canvas.drawRightString(larghezza - 18 * mm, 10 * mm, f"Pagina {documento.page}")
    canvas.restoreState()


def genera_pdf(dati: DatiReport) -> bytes:
    memoria = BytesIO()
    codice = dati.codice
    documento = SimpleDocTemplate(
        memoria, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=17 * mm,
        title=f"TerraScan Italia - Report {codice}", author="TerraScan Italia",
        subject="Report di analisi preliminare del terreno", creator=f"TerraScan Italia v{__version__}",
    )
    numero_sezione = 5 if dati.linea is not None else 4
    elementi = (
        _sezione_intestazione(dati)
        + _sezione_inquadramento(dati)
        + _sezione_misure(dati)
        + _sezione_altimetria(dati)
        + _sezione_profilo(dati)
        + _sezione_vertici(dati, numero_sezione)
        + _sezione_fonti(dati, numero_sezione + 1)
    )
    documento.build(
        elementi,
        onFirstPage=lambda c, d: _pagina(c, d, codice),
        onLaterPages=lambda c, d: _pagina(c, d, codice),
    )
    return memoria.getvalue()
