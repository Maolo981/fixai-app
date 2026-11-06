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
