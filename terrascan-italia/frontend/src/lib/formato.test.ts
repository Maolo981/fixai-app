import {
  formattaCatastale,
  formattaCoordinate,
  formattaEttari,
  formattaLunghezza,
  formattaMetriQuadri,
  formattaPercentuale,
} from "./formato";

// Intl usa uno spazio non separabile in alcuni formati: normalizziamo.
const n = (s: string) => s.replace(/ | /g, " ");

describe("formattazione italiana", () => {
  it("superficie in m² con separatore delle migliaia e decimali italiani", () => {
    expect(n(formattaMetriQuadri(12345.678))).toBe("12.346 m²");
    expect(n(formattaMetriQuadri(512.345))).toBe("512,35 m²");
    expect(n(formattaMetriQuadri(9115.2))).toBe("9.115 m²");
  });

  it("ettari con quattro decimali", () => {
    expect(n(formattaEttari(1.23456))).toBe("1,2346 ha");
  });

  it("formato catastale ettari / are / centiare", () => {
    expect(formattaCatastale(12345.6)).toBe("1 ha 23 are 46 ca");
    expect(formattaCatastale(10000)).toBe("1 ha 0 are 0 ca");
    expect(formattaCatastale(99.4)).toBe("0 ha 0 are 99 ca");
    expect(formattaCatastale(9999.6)).toBe("1 ha 0 are 0 ca");
  });

  it("lunghezze in metri o chilometri", () => {
    expect(n(formattaLunghezza(45.678))).toBe("45,68 m");
    expect(n(formattaLunghezza(456.78))).toBe("456,8 m");
    expect(n(formattaLunghezza(12345.6))).toBe("12,346 km");
  });

  it("percentuale con segno", () => {
    expect(n(formattaPercentuale(-0.0812))).toBe("-0,081 %");
    expect(n(formattaPercentuale(0.05))).toBe("+0,050 %");
  });

  it("coordinate", () => {
    expect(n(formattaCoordinate(45.6944947, 9.6698727))).toBe("45,694495 N, 9,669873 E");
  });
});
