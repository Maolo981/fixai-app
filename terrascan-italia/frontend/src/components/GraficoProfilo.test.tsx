import { render, screen } from "@testing-library/react";

import type { PuntoProfilo } from "../lib/types";
import { GraficoProfilo, tacche, tratti } from "./GraficoProfilo";

const p = (distanza_m: number, quota_m: number | null): PuntoProfilo => ({ distanza_m, quota_m, lon: 9, lat: 45 });

describe("GraficoProfilo", () => {
  it("divide il profilo in tratti dove manca il dato", () => {
    const punti = [p(0, 100), p(5, 101), p(10, null), p(15, 103), p(20, 104)];
    expect(tratti(punti).map((t) => t.length)).toEqual([2, 2]);
    expect(tratti([p(0, null)])).toEqual([]);
  });

  it("calcola tacche tonde per gli assi", () => {
    expect(tacche(0, 500, 4)).toEqual([0, 200, 400]);
    expect(tacche(117.2, 121.6, 4)).toEqual([118, 120]);
    expect(tacche(117.2, 121.6, 8)).toEqual([118, 119, 120, 121]);
    expect(tacche(5, 5)).toEqual([5]);
  });

  it("non disegna i tratti senza dato", () => {
    render(<GraficoProfilo punti={[p(0, 100), p(5, 101), p(10, null), p(15, 103), p(20, 104)]} />);
    expect(screen.getAllByTestId("tratto-profilo")).toHaveLength(2);
    expect(screen.getByRole("img")).toHaveAccessibleName("Profilo altimetrico lungo 20,00 m");
  });
});
