/**
 * Crea una "maschera" che oscura tutto ciò che è fuori dall'area pilota:
 * un poligono grande quanto il mondo con dei fori in corrispondenza delle
 * parti della regione.
 */
export function creaMaschera(area: GeoJSON.FeatureCollection): GeoJSON.Feature<GeoJSON.Polygon> {
  const mondo: GeoJSON.Position[] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];
  const fori: GeoJSON.Position[][] = [];
  for (const feature of area.features) {
    const g = feature.geometry;
    if (g.type === "Polygon") fori.push(g.coordinates[0]);
    else if (g.type === "MultiPolygon") g.coordinates.forEach((p) => fori.push(p[0]));
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [mondo, ...fori] },
  };
}

/** Riquadro [ovest, sud, est, nord] che contiene tutte le geometrie. */
export function riquadroDi(area: GeoJSON.FeatureCollection): [number, number, number, number] {
  let [o, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  const visita = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [lon, lat] = c as number[];
      o = Math.min(o, lon);
      e = Math.max(e, lon);
      s = Math.min(s, lat);
      n = Math.max(n, lat);
    } else if (Array.isArray(c)) c.forEach(visita);
  };
  for (const f of area.features) {
    if (f.geometry && "coordinates" in f.geometry) visita(f.geometry.coordinates);
  }
  return [o, s, e, n];
}
