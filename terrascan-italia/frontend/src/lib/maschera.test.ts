import { creaMaschera, riquadroDi } from "./maschera";

const area: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [[[9, 45], [10, 45], [10, 46], [9, 46], [9, 45]]],
          [[[11, 45], [11.2, 45], [11.2, 45.2], [11, 45]]],
        ],
      },
    },
  ],
};

describe("maschera dell'area pilota", () => {
  it("crea un poligono mondiale con un foro per ogni parte della regione", () => {
    const maschera = creaMaschera(area);
    expect(maschera.geometry.coordinates).toHaveLength(3);
    expect(maschera.geometry.coordinates[1][0]).toEqual([9, 45]);
  });

  it("calcola il riquadro complessivo", () => {
    expect(riquadroDi(area)).toEqual([9, 45, 11.2, 46]);
  });
});
