import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle,
  CreditCard,
  Home,
  Heart,
  Shield,
  Smartphone,
  Banknote,
  Headphones,
  Eye,
  Lock,
  Sparkles
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase12({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center pb-2">
        <h2 className="text-xl font-bold mb-1">Come guadagna FIXO</h2>
        <p className="text-sm text-muted-foreground">
          Modello ibrido, semplice e trasparente
        </p>
      </div>

      {/* Blocco 1 - Accesso all'app */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold mb-2">
                FIXO non fa pagare l'uso dell'app
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                FIXO mette in contatto clienti e tecnici.
                <br />
                L'uso dell'app è <strong>gratuito</strong> per entrambi.
                <br />
                Nessun abbonamento, nessun costo per registrarsi.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocco 2 - Modello di guadagno */}
      <Card>
        <CardContent className="py-5 space-y-4">
          <h3 className="font-bold text-center">FIXO guadagna in due modi</h3>
          
          {/* Modo 1 */}
          <div className="bg-muted/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
              <span className="font-semibold text-sm">Costo fisso di gestione della chiamata</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-8">
              Per ogni intervento confermato, FIXO applica un piccolo costo fisso di servizio.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 pl-8">
              <Badge variant="secondary" className="text-xs font-normal">
                <Sparkles className="h-3 w-3 mr-1" />
                Uso AI
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                <CheckCircle className="h-3 w-3 mr-1" />
                Gestione richiesta
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                <Eye className="h-3 w-3 mr-1" />
                Sempre visibile
              </Badge>
            </div>
          </div>

          {/* Modo 2 */}
          <div className="bg-muted/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
              <span className="font-semibold text-sm">Commissione opzionale (2–3%)</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-8">
              Se il cliente paga tramite FIXO (carta o PayPal), la piattaforma trattiene una piccola commissione sul totale.
            </p>
            <p className="text-xs text-primary font-medium mt-2 pl-8">
              Percentuale bassa e indicata prima del pagamento.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Blocco 3 - Confronto */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pagamento fuori app */}
        <Card className="border-muted">
          <CardContent className="py-4 px-3">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold">Pagamento fuori app</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                <span>Pagamento diretto al tecnico</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                <span>Solo costo fisso di gestione</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                <span>Nessuna commissione extra</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Pagamento in app */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4 px-3">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">Pagamento in app</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <Lock className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <span>Pagamento tracciato</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Shield className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <span>Protezione cliente e tecnico</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Headphones className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <span>Assistenza se problemi</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-xs text-primary font-medium">Commissione 2–3%</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Blocco 4 - Messaggio di fiducia */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Heart className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-amber-800 dark:text-amber-200 mb-2">
                FIXO guadagna solo se il servizio funziona
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                FIXO non guadagna sulla semplice richiesta.
                <br />
                Guadagna solo quando l'intervento viene gestito correttamente.
                <br />
                <strong>Nessun costo nascosto. Nessun obbligo di pagamento in app.</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocco finale - Chiusura */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-300 dark:border-green-800">
        <CardContent className="py-5">
          <div className="text-center mb-4">
            <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-bold text-green-800 dark:text-green-200">
              Processo trasparente
            </h3>
          </div>
          <div className="space-y-2">
            {[
              "Costi chiari prima della conferma",
              "Pagamento libero: in app o diretto",
              "FIXO allineata all'interesse di clienti e tecnici"
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA Finale */}
      <Button 
        className="w-full bg-green-600 hover:bg-green-700" 
        size="lg" 
        onClick={onNext}
      >
        <Home className="h-4 w-4 mr-2" />
        Fine demo – Torna alla home
      </Button>
    </div>
  );
}
