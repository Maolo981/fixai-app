import { fireEvent, render, screen } from "@testing-library/react";

import { ORDINE_PREDEFINITO } from "../lib/livelli";
import type { RispostaCurve, RispostaMappa } from "../lib/types";
import { PannelloSinistro } from "./PannelloSinistro";

const mappaQuota: RispostaMappa = {
  disponibile: true,
  messaggio: "ok",
  tipo: "quota",
  scala: {
    minima: 472.5,
    massima: 543.8,
    tappe: [
      { quota: 472.5, colore: "#2c3e9e" },
      { quota: 543.8, colore: "#c8323a" },
    ],
    nota: "Scala relativa al lotto",
  },
  legenda: [],
  celle_colorate: 800,
};

const curve: RispostaCurve = {
  disponibile: true,
  messaggio: "ok",
  intervallo_m: 5,
  intervalli: [
    { metri: 1, livelli: 72, ammesso: false, motivo: "Inferiore all'accuratezza" },
    { metri: 5, livelli: 15, ammesso: true },
  ],
  numero_curve: 15,
};

function rendi(over = {}) {
  const props = {
    strumento: "naviga" as const,
    onStrumento: vi.fn(),
    haTerreno: true,
    haLinea: false,
    onElimina: vi.fn(),
    mappaBase: "satellite" as const,
    onMappaBase: vi.fn(),
    ordine: ORDINE_PREDEFINITO,
    onOrdine: vi.fn(),
    analisi: { visibile: true, modo: "quota" as const, opacita: 0.75 },
    onAnalisi: vi.fn(),
    mappa: { stato: "completata" as const, risultato: mappaQuota },
    curve: { visibile: true, intervallo: null },
    onCurve: vi.fn(),
    statoCurve: { stato: "completata" as const, risultato: curve },
    confineVisibile: true,
    onConfine: vi.fn(),
    ...over,
  };
  render(<PannelloSinistro {...props} />);
  return props;
}

const n = (s: string | null) => (s ?? "").replace(/ | /g, " ");

describe("PannelloSinistro", () => {
  it("mostra la legenda altimetrica con quota minima e massima reali", () => {
    rendi();
    const legenda = screen.getByTestId("legenda-quota");
    expect(n(legenda.textContent)).toContain("472,5 m");
    expect(n(legenda.textContent)).toContain("543,8 m");
  });

  it("cambia opacità, modalità e ordine dei livelli", () => {
    const p = rendi();
    fireEvent.change(screen.getByRole("slider"), { target: { value: "40" } });
    expect(p.onAnalisi).toHaveBeenCalledWith({ opacita: 0.4 });
    fireEvent.click(screen.getByRole("radio", { name: "Pendenza" }));
    expect(p.onAnalisi).toHaveBeenCalledWith({ modo: "pendenza" });
    fireEvent.click(screen.getByRole("button", { name: 'Porta "Analisi del lotto" più in alto' }));
    expect(p.onOrdine).toHaveBeenCalledWith(["confine", "analisi", "curve"]);
  });

  it("propone solo gli intervalli di curve ammessi", () => {
    rendi();
    const opzioni = screen.getAllByRole("option") as HTMLOptionElement[];
    expect(opzioni.find((o) => o.value === "1")?.disabled).toBe(true);
    expect(opzioni.find((o) => o.value === "5")?.disabled).toBe(false);
    expect(screen.getByTestId("curve-info")).toHaveTextContent("15 curve ogni 5 m");
  });

  it("dichiara i dati altimetrici non disponibili senza legenda", () => {
    rendi({
      mappa: {
        stato: "completata",
        risultato: { ...mappaQuota, disponibile: false, scala: null, motivo: "Il terreno è fuori dall'area coperta" },
      },
    });
    expect(screen.getByTestId("analisi-non-disponibile")).toHaveTextContent("Dati altimetrici non disponibili");
    expect(screen.queryByTestId("legenda-quota")).toBeNull();
  });

  it("disattiva Modifica ed Elimina senza geometrie", () => {
    rendi({ haTerreno: false });
    expect(screen.getByRole("button", { name: /Modifica/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Elimina/ })).toBeDisabled();
  });
});
