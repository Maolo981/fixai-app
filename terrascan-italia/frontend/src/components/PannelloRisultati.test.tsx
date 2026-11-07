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

  it("se il DTM non copre il terreno mostra il motivo e nessuna quota", () => {
    const fuori: AnalisiGeometria = {
      ...risultato,
      altimetria: {
        disponibile: false,
        messaggio: "Dati altimetrici non disponibili",
        motivo: "Il terreno è fuori dall'area coperta dal DTM della Lombardia.",
      },
    };
    render(<PannelloRisultati analisi={{ stato: "completata", risultato: fuori }} capacita={null} />);
    expect(screen.getByTestId("altimetria-non-disponibile")).toBeInTheDocument();
    expect(screen.getByText(/fuori dall'area coperta/)).toBeInTheDocument();
    expect(screen.queryByTestId("quota-minima")).toBeNull();
  });

  it("mostra quote, pendenza ed esposizione reali quando disponibili", () => {
    const conDtm: AnalisiGeometria = {
      ...risultato,
      altimetria: {
        disponibile: true,
        messaggio: "Analisi altimetrica eseguita con dati reali",
        quote: {
          minima: 241.2,
          massima: 254.7,
          media: 248.0,
          dislivello: 13.5,
          punto_minimo: { lon: 9.669, lat: 45.6945, quota: 241.2 },
          punto_massimo: { lon: 9.6705, lat: 45.6945, quota: 254.7 },
          nota: "Quote dal DTM",
        },
        pendenza: {
          media_percento: 12,
          media_gradi: 6.843,
          massima_percento: 12,
          massima_gradi: 6.843,
          classi: [
            { da_percento: 0, a_percento: 10, percentuale_celle: 0 },
            { da_percento: 10, a_percento: 15, percentuale_celle: 100 },
            { da_percento: 50, a_percento: null, percentuale_celle: 0 },
          ],
          metodo: "Horn",
        },
        esposizione: {
          prevalente: "O",
          settori: [
            { settore: "O", percentuale_celle: 100 },
            { settore: "Pianeggiante", percentuale_celle: 0 },
          ],
          soglia_pianeggiante_percento: 1,
          metodo: "Horn",
        },
        celle: { interne: 520, valide: 520, con_pendenza: 520, copertura_percento: 100, dimensione_m: 5 },
        fonte: {
          nome: "DTM 5X5",
          edizione: "2015",
          proprietario: "Regione Lombardia",
          licenza: "CC BY 4.0",
          attribuzione: "© Regione Lombardia, CC BY 4.0",
          precisione_dichiarata: "0,30-2 m",
        },
        avvertenze: [],
      },
    };
    render(<PannelloRisultati analisi={{ stato: "completata", risultato: conDtm }} capacita={null} />);
    expect(n(screen.getByTestId("quota-minima").textContent)).toBe("241,2 m");
    expect(n(screen.getByTestId("quota-massima").textContent)).toBe("254,7 m");
    expect(n(screen.getByTestId("dislivello").textContent)).toBe("13,5 m");
    expect(n(screen.getByTestId("pendenza-media").textContent)).toBe("12,0 % (6,8°)");
    expect(screen.getByTestId("esposizione-prevalente")).toHaveTextContent("Ovest");
    expect(screen.getByText("Dati reali DTM")).toBeInTheDocument();
    expect(screen.queryByTestId("altimetria-non-disponibile")).toBeNull();
  });

  it("in caso di errore non mostra alcun valore numerico", () => {
    render(<PannelloRisultati analisi={{ stato: "errore", messaggio: "Servizio non raggiungibile" }} capacita={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Servizio non raggiungibile");
    expect(screen.queryByTestId("superficie-m2")).toBeNull();
    expect(screen.queryByTestId("perimetro-m")).toBeNull();
  });

  it("nella scheda Altimetria mostra la quota del punto cliccato", () => {
    render(
      <PannelloRisultati
        analisi={{ stato: "vuoto" }}
        capacita={null}
        scheda="altimetria"
        fase3={{
          quotaPunto: {
            stato: "completata",
            risultato: {
              disponibile: true,
              messaggio: "ok",
              lon: 9.1919,
              lat: 45.4642,
              quota_m: 119.79,
              quota_cella_m: 119.79,
              metodo: "Interpolazione bilineare.",
              precisione: "Accuratezza dichiarata 0,30-2 m.",
            },
          },
          profilo: { stato: "vuoto" },
          onPuntoProfilo: () => {},
          haLinea: false,
          onReport: async () => "",
        }}
      />,
    );
    expect(n(screen.getByTestId("quota-punto-valore").textContent)).toBe("119,8 m");
    expect(screen.queryByText("Analizza un terreno")).toBeNull(); // scheda Lotto nascosta
  });
});
