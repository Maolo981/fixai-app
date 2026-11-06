import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SezioneReport } from "./SezioneReport";

describe("SezioneReport", () => {
  it("invia i campi facoltativi e conferma lo scaricamento", async () => {
    const onGenera = vi.fn().mockResolvedValue("terrascan-report-TS-20261106-ABC123.pdf");
    render(<SezioneReport haLinea onGenera={onGenera} />);
    fireEvent.click(screen.getByRole("button", { name: "Scarica report PDF" }));
    fireEvent.change(screen.getByLabelText("Committente"), { target: { value: "Az. Agricola Rossi" } });
    fireEvent.click(screen.getByLabelText("Includi il profilo altimetrico tracciato"));
    fireEvent.click(screen.getByRole("button", { name: "Genera e scarica" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("TS-20261106-ABC123"));
    expect(onGenera).toHaveBeenCalledWith({ committente: "Az. Agricola Rossi", riferimento: "", note: "" }, false);
  });

  it("mostra l'errore del server", async () => {
    render(<SezioneReport haLinea={false} onGenera={vi.fn().mockRejectedValue(new Error("Servizio non raggiungibile"))} />);
    fireEvent.click(screen.getByRole("button", { name: "Scarica report PDF" }));
    expect(screen.queryByLabelText("Includi il profilo altimetrico tracciato")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Genera e scarica" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Servizio non raggiungibile"));
  });
});
