import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import Landing from "./pages/Landing";
import "./stile.css";

/** Instradamento minimo senza dipendenze: /app = applicazione GIS, il resto = landing. */
export function paginaPer(percorso: string): "app" | "landing" {
  return percorso === "/app" || percorso.startsWith("/app/") ? "app" : "landing";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{paginaPer(window.location.pathname) === "app" ? <App /> : <Landing />}</StrictMode>,
);
