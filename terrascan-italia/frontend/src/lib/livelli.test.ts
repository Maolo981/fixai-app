import { ordineDiDisegno, ORDINE_PREDEFINITO, spostaLivello } from "./livelli";

describe("ordine dei livelli", () => {
  it("sposta un livello su e giù senza uscire dai limiti", () => {
    expect(spostaLivello(ORDINE_PREDEFINITO, "analisi", -1)).toEqual(["confine", "analisi", "curve"]);
    expect(spostaLivello(ORDINE_PREDEFINITO, "confine", -1)).toEqual(ORDINE_PREDEFINITO);
    expect(spostaLivello(ORDINE_PREDEFINITO, "analisi", 1)).toEqual(ORDINE_PREDEFINITO);
  });

  it("disegna dal basso verso l'alto", () => {
    expect(ordineDiDisegno(["confine", "curve", "analisi"])).toEqual([
      "mappa-tematica",
      "curve-linee",
      "curve-etichette",
      "maschera",
      "confine-area-pilota",
    ]);
  });
});
