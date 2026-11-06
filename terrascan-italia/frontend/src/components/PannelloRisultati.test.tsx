import { render, screen } from "@testing-library/react";

import type { AnalisiGeometria } from "../lib/types";
import { PannelloRisultati } from "./PannelloRisultati";

const risultato: AnalisiGeometria = {
  superficie: { m2: 12345.6, ettari: 1.23456, metodo: "Geodetico" },
  perimetro: { m: 456.78, metodo: "Geodetico" },
  controllo_utm32: {
    epsg: 32632,
    descrizione: "UTM 32N",
    area_m2: 12335.7,
    perimetro_m: 456.6,
    differenza_area_percentuale: -0.08,
  },
  centroide: { lon: 9.67, lat: 45.69 },
  bbox: [9.66, 45.68, 9.68, 45.7],
  numero_vertici: 5,
  area_pilota: { nome: "Lombardia", stato: "interno" },
  altimetria: { disponibile: false, messaggio: "Dati altimetrici non disponibili" },
  avvertenze: [],
  nota_legale: "Le analisi non sostituiscono un rilievo topografico.",
};

const n = (s: string | null) => (s ?? "").replace(/ | /g, " ");

describe("PannelloRisultati", () => {
  it("mostra le istruzioni e l'altimetria come non disponibile prima del disegno", () => {
    render(<PannelloRisultati analisi={{ stato: "vuoto" }} capacita={null} />);
    expect(screen.getByText("Analizza un terreno")).toBeInTheDocument();
    expect(screen.getByTestId("altimetria-non-disponibile")).toHaveTextContent("Dati altimetrici non disponibili");
    expect(screen.getByText(/non sostituiscono un rilievo/)).toBeInTheDocument();
  });

  it("mostra superficie e perimetro ricevuti dal backend", () => {
    render(<PannelloRisultati analisi={{ stato: "completata", risultato }} capacita={null} />);
    expect(n(screen.getByTestId("superficie-m2").textContent)).toBe("12.346 m²");
    expect(n(screen.getByTestId("perimetro-m").textContent)).toBe("456,8 m");
    expect(screen.getByText(/1 ha 23 are 46 ca/)).toBeInTheDocument();
    expect(screen.getByText("Calcolo reale")).toBeInTheDocument();
  });

  it("in caso di errore non mostra alcun valore numerico", () => {
    render(<PannelloRisultati analisi={{ stato: "errore", messaggio: "Servizio non raggiungibile" }} capacita={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Servizio non raggiungibile");
    expect(screen.queryByTestId("superficie-m2")).toBeNull();
    expect(screen.queryByTestId("perimetro-m")).toBeNull();
  });
});
