import { interpretaCoordinate } from "./coordinate";

describe("interpretaCoordinate", () => {
  it.each([
    ["45.6983, 9.6773"],
    ["45.6983 9.6773"],
    ["45,6983; 9,6773"],
    ["45,6983 9,6773"],
    ["  45.6983 ,  9.6773  "],
  ])("riconosce %s", (testo) => {
    expect(interpretaCoordinate(testo)).toEqual({ lat: 45.6983, lon: 9.6773 });
  });

  it("corregge l'ordine longitudine, latitudine tipico del GeoJSON", () => {
    expect(interpretaCoordinate("9.6773, 45.6983")).toEqual({ lat: 45.6983, lon: 9.6773 });
  });

  it.each([["Bergamo"], ["Via Roma 12, Milano"], ["45.69"], ["95, 9"], ["1, 2, 3"]])(
    "non considera coordinate il testo %s",
    (testo) => {
      expect(interpretaCoordinate(testo)).toBeNull();
    },
  );
});
