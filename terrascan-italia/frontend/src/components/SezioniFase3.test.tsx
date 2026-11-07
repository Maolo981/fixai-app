import { render, screen } from "@testing-library/react";

import type { RispostaProfilo } from "../lib/types";
import { SezioneProfilo } from "./SezioniFase3";

const n = (s: string | null) => (s ?? "").replace(/ | /g, " ");

const profilo: RispostaProfilo = {
  disponibile: true,
  messaggio: "ok",
  punti: [
    { distanza_m: 0, quota_m: 124, lon: 9, lat: 45 },
    { distanza_m: 250, quota_m: 154, lon: 9.003, lat: 45 },
    { distanza_m: 500, quota_m: 184, lon: 9.006, lat: 45 },
  ],
  lunghezza_m: 499.8,
  lunghezza_inclinata_m: 503.4,
  quota_minima: 124,
  quota_massima: 184,
  quota_iniziale: 124,
  quota_finale: 184,
  salita_m: 60,
  discesa_m: 0,
  pendenza_media_percento: 12,
  pendenza_massima_percento: 12,
  copertura_percento: 100,
  passo_m: 5,
  metodo: "bilineare",
  avvertenze: [],
  tratti: [
    { da_m: 0, a_m: 250, lunghezza_m: 250, quota_inizio: 124, quota_fine: 154, dislivello_m: 30, pendenza_percento: 12 },
    { da_m: 250, a_m: 499.8, lunghezza_m: 249.8, quota_inizio: 154, quota_fine: 184, dislivello_m: 30, pendenza_percento: 12 },
  ],
  attribuzione: "© Regione Lombardia",
  nota_legale: "preliminari",
};

describe("SezioneProfilo", () => {
  it("mostra le statistiche del profilo ricevute dal backend", () => {
    render(<SezioneProfilo stato={{ stato: "completata", risultato: profilo }} attivo onPuntoEvidenziato={() => {}} />);
    expect(n(screen.getByTestId("profilo-lunghezza").textContent)).toBe("499,8 m");
    expect(n(screen.getByTestId("profilo-salita").textContent)).toBe("+60,0 m / 0,0 m");
    expect(screen.getByTestId("grafico-profilo")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Tratti del profilo tra i vertici" })).toHaveTextContent("+30,0 m");
  });

  it("dichiara i dati non disponibili senza disegnare il grafico", () => {
    render(
      <SezioneProfilo
        stato={{
          stato: "completata",
          risultato: { ...profilo, disponibile: false, punti: [], motivo: "Il terreno è fuori dall'area coperta" },
        }}
        attivo
        onPuntoEvidenziato={() => {}}
      />,
    );
    expect(screen.getByTestId("profilo-non-disponibile")).toHaveTextContent("Dati altimetrici non disponibili");
    expect(screen.queryByTestId("grafico-profilo")).toBeNull();
  });

  it("non compare se la funzione non è attiva e non c'è un profilo", () => {
    const { container } = render(<SezioneProfilo stato={{ stato: "vuoto" }} attivo={false} onPuntoEvidenziato={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

