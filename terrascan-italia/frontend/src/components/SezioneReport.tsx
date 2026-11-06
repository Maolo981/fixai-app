/**
 * Scaricamento del report PDF. Il PDF è generato dal server ricalcolando tutto:
 * il browser invia solo il disegno (terreno ed eventuale linea) e i campi facoltativi.
 */
import { useState, type FormEvent } from "react";

import type { CampiReport } from "../lib/api";

interface Props {
  haLinea: boolean;
  onGenera: (campi: CampiReport, includiProfilo: boolean) => Promise<string>;
}

type Stato = { stato: "pronto" } | { stato: "in_corso" } | { stato: "fatto"; nome: string } | { stato: "errore"; messaggio: string };

export function SezioneReport({ haLinea, onGenera }: Props) {
  const [aperto, setAperto] = useState(false);
  const [campi, setCampi] = useState<CampiReport>({ committente: "", riferimento: "", note: "" });
  const [includiProfilo, setIncludiProfilo] = useState(true);
  const [stato, setStato] = useState<Stato>({ stato: "pronto" });

  const genera = async (evento: FormEvent) => {
    evento.preventDefault();
    setStato({ stato: "in_corso" });
    try {
      const nome = await onGenera(campi, haLinea && includiProfilo);
      setStato({ stato: "fatto", nome });
    } catch (e) {
      setStato({ stato: "errore", messaggio: e instanceof Error ? e.message : "Errore imprevisto." });
    }
  };

  const campo = (chiave: keyof CampiReport) => ({
    value: campi[chiave],
    onChange: (e: { target: { value: string } }) => setCampi((c) => ({ ...c, [chiave]: e.target.value })),
  });

  return (
    <section className="scheda scheda--report" aria-labelledby="titolo-report">
      <div className="scheda__intestazione">
        <h2 id="titolo-report">Report PDF</h2>
      </div>
      {!aperto ? (
        <button type="button" className="pulsante-principale" onClick={() => setAperto(true)}>
          Scarica report PDF
        </button>
      ) : (
        <form className="modulo" onSubmit={genera}>
          <p className="testo-secondario">Campi facoltativi, riportati nell'intestazione del report.</p>
          <label>
            Committente
            <input type="text" maxLength={120} {...campo("committente")} />
          </label>
          <label>
            Riferimento pratica
            <input type="text" maxLength={120} {...campo("riferimento")} />
          </label>
          <label>
            Note
            <textarea rows={2} maxLength={600} {...campo("note")} />
          </label>
          {haLinea && (
            <label className="modulo__spunta">
              <input type="checkbox" checked={includiProfilo} onChange={(e) => setIncludiProfilo(e.target.checked)} />
              Includi il profilo altimetrico tracciato
            </label>
          )}
          <div className="modulo__azioni">
            <button type="submit" className="pulsante-principale" disabled={stato.stato === "in_corso"}>
              {stato.stato === "in_corso" ? "Generazione…" : "Genera e scarica"}
            </button>
            <button type="button" className="pulsante-secondario" onClick={() => setAperto(false)}>
              Chiudi
            </button>
          </div>
        </form>
      )}
      {stato.stato === "fatto" && (
        <p className="testo-secondario" role="status">
          Report scaricato: {stato.nome}
        </p>
      )}
      {stato.stato === "errore" && (
        <p className="avviso" role="alert">
          {stato.messaggio}
        </p>
      )}
      <p className="testo-secondario">
        Il report contiene solo i risultati calcolati dal server; le sezioni senza dati sono indicate come non
        disponibili.
      </p>
    </section>
  );
}
