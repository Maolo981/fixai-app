import { analizzaGeometria, ErroreApi } from "./api";
import type { GeoJsonPolygon } from "./types";

const quadrato: GeoJsonPolygon = {
  type: "Polygon",
  coordinates: [[[9, 45], [9.001, 45], [9.001, 45.001], [9, 45.001], [9, 45]]],
};

afterEach(() => vi.unstubAllGlobals());

describe("client API", () => {
  it("invia la geometria al backend come JSON", async () => {
    const fetchFinto = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchFinto);
    await analizzaGeometria(quadrato);
    const [url, init] = fetchFinto.mock.calls[0];
    expect(url).toBe("/api/v1/analisi/geometria");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ geometria: quadrato });
  });

  it("riporta il messaggio di errore del backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "Il perimetro si interseca" }), { status: 422 })),
    );
    await expect(analizzaGeometria(quadrato)).rejects.toMatchObject({
      name: "ErroreApi",
      codice: 422,
      message: "Il perimetro si interseca",
    });
  });

  it("se il backend non è raggiungibile non restituisce valori ma un errore", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const errore = await analizzaGeometria(quadrato).catch((e) => e);
    expect(errore).toBeInstanceOf(ErroreApi);
    expect(errore.message).toContain("non raggiungibile");
  });
});

describe("client API Fase 3", () => {
  it("richiede la mappa tematica e il profilo con il corpo corretto", async () => {
    const { caricaMappaTematica, calcolaProfilo } = await import("./api");
    const fetchFinto = vi.fn().mockImplementation(() => Promise.resolve(new Response("{}", { status: 200 })));
    vi.stubGlobal("fetch", fetchFinto);
    await caricaMappaTematica(quadrato, "esposizione");
    await calcolaProfilo({ type: "LineString", coordinates: [[9, 45], [9.01, 45]] });
    expect(fetchFinto.mock.calls[0][0]).toBe("/api/v1/analisi/mappa");
    expect(JSON.parse(fetchFinto.mock.calls[0][1].body)).toEqual({ geometria: quadrato, tipo: "esposizione" });
    expect(fetchFinto.mock.calls[1][0]).toBe("/api/v1/analisi/profilo");
  });
});
