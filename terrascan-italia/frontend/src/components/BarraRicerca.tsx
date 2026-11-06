/**
 * Ricerca di località (via backend → Nominatim/OpenStreetMap) o di
 * coordinate scritte direttamente (es. "45.6983, 9.6773").
 */
import { useRef, useState, type FormEvent } from "react";

import { cercaLocalita, ErroreApi } from "../lib/api";
import { interpretaCoordinate } from "../lib/coordinate";
import type { Destinazione, Localita } from "../lib/types";

interface Props {
  onDestinazione: (destinazione: Destinazione) => void;
}

export function BarraRicerca({ onDestinazione }: Props) {
  const [testo, setTesto] = useState("");
  const [risultati, setRisultati] = useState<Localita[] | null>(null);
  const [attribuzione, setAttribuzione] = useState("");
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  const invia = async (evento: FormEvent) => {
    evento.preventDefault();
    const query = testo.trim();
    setErrore(null);
    if (query.length < 2) return;

    const coordinate = interpretaCoordinate(query);
    if (coordinate) {
      setRisultati(null);
      onDestinazione({ tipo: "punto", ...coordinate, zoom: 17 });
      return;
    }

    controller.current?.abort();
    controller.current = new AbortController();
    setInCorso(true);
    try {
      const risposta = await cercaLocalita(query, controller.current.signal);
      setRisultati(risposta.risultati);
      setAttribuzione(risposta.attribuzione);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setRisultati(null);
      setErrore(e instanceof ErroreApi ? e.message : "Errore imprevisto durante la ricerca.");
    } finally {
      setInCorso(false);
    }
  };

  const scegli = (localita: Localita) => {
    setRisultati(null);
    setTesto(localita.nome.split(",")[0]);
    onDestinazione(
      localita.bbox
        ? { tipo: "riquadro", bbox: localita.bbox }
        : { tipo: "punto", lon: localita.lon, lat: localita.lat, zoom: 16 },
    );
  };

  return (
    <div className="ricerca">
      <form className="ricerca__form" onSubmit={invia} role="search">
        <label htmlFor="campo-ricerca" className="sr-only">
          Cerca una località, un indirizzo o delle coordinate
        </label>
        <svg className="ricerca__icona" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16.5 16.5 L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          id="campo-ricerca"
          type="search"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Comune, indirizzo o coordinate (45.69, 9.67)"
          autoComplete="off"
          maxLength={200}
        />
        <button type="submit" disabled={inCorso || testo.trim().length < 2}>
          {inCorso ? "Ricerca…" : "Cerca"}
        </button>
      </form>

      {errore && (
        <div className="ricerca__pannello ricerca__pannello--errore" role="alert">
          {errore}
        </div>
      )}

      {risultati && (
        <div className="ricerca__pannello">
          {risultati.length === 0 ? (
            <p className="ricerca__vuoto">Nessuna località trovata in Lombardia.</p>
          ) : (
            <ul>
              {risultati.map((r) => (
                <li key={`${r.lat},${r.lon},${r.nome}`}>
                  <button type="button" onClick={() => scegli(r)}>
                    <strong>{r.nome.split(",")[0]}</strong>
                    <span>{r.nome.split(",").slice(1).join(",").trim()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="ricerca__attribuzione">{attribuzione}</p>
        </div>
      )}
    </div>
  );
}
