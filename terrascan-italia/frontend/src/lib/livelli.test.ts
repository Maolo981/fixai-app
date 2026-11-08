import { bearingDiProfilo, ordineDiDisegno, ORDINE_PREDEFINITO, spostaLivello } from "./livelli";

describe("ordine dei livelli", () => {
  it("sposta un livello su e giù senza uscire dai limiti", () => {
    expect(spostaLivello(ORDINE_PREDEFINITO, "analisi", -1)).toEqual(["confine", "analisi", "curve"]);
    expect(spostaLivello(ORDINE_PREDEFINITO, "confine", -1)).toEqual(ORDINE_PREDEFINITO);
    expect(spostaLivello(ORDINE_PREDEFINITO, "analisi", 1)).toEqual(ORDINE_PREDEFINITO);
  });

  it("disegna dal basso verso l'alto", () => {
    expect(ordineDiDisegno(["confine", "curve", "analisi"])).toEqual([
      "mappa-tematica",
      "curve-alone",
      "curve-linee",
      "curve-etichette",
      "maschera",
      "confine-area-pilota",
    ]);
  });
});

describe("camera 3D di profilo", () => {
  it("guarda lungo le curve di livello", () => {
    expect(bearingDiProfilo("S")).toBe(-90); // versante a Sud: si guarda verso Ovest
    expect(bearingDiProfilo("E")).toBe(180);
    expect(bearingDiProfilo("N")).toBe(90);
    expect(bearingDiProfilo("Pianeggiante")).toBe(-20);
    expect(bearingDiProfilo(undefined)).toBe(-20);
  });
});
