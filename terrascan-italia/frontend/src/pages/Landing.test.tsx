import { render, screen } from "@testing-library/react";

import { paginaPer } from "../main";
import Landing from "./Landing";

vi.mock("react-dom/client", () => ({ createRoot: () => ({ render: () => {} }) }));

describe("Landing", () => {
  it("presenta headline e inviti all'azione verso l'app", () => {
    render(<Landing />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Conosci il tuo terreno prima di investire");
    expect(screen.getAllByRole("link", { name: "Analizza un terreno" })[0]).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "Esplora la demo" })).toHaveAttribute("href", "/app?demo");
    expect(screen.getByRole("link", { name: /report di esempio/ })).toHaveAttribute("href", "/esempio-report.pdf");
  });

  it("dichiara le funzioni non ancora disponibili e i limiti", () => {
    render(<Landing />);
    expect(screen.getByText("In sviluppo")).toBeInTheDocument();
    expect(screen.getAllByText(/non sostitui/).length).toBeGreaterThan(0);
  });
});

describe("instradamento", () => {
  it("distingue applicazione e landing", () => {
    expect(paginaPer("/app")).toBe("app");
    expect(paginaPer("/app/")).toBe("app");
    expect(paginaPer("/")).toBe("landing");
    expect(paginaPer("/applicazione")).toBe("landing");
  });
});
