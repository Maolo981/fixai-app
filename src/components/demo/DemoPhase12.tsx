import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle,
  Euro,
  Home,
  Heart,
  Shield,
  Sparkles,
  X,
  Zap
} from "lucide-react";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase12({ onNext }: DemoPhaseProps) {
  return (
    <div className="space-y-5">
      {/* BLOCCO 1 - Messaggio Chiave */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="py-5">
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">
              FIXO non fa pagare l'uso dell'app
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              FIXO è una piattaforma che mette in contatto clienti e tecnici.
              <br />
              L'uso dell'app è <strong>gratuito</strong> per entrambi.
              <br />
              FIXO guadagna solo quando il servizio viene utilizzato correttamente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* BLOCCO 2 - Spiegazione Modello Ibrido */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Euro className="h-5 w-5 text-primary" />
            Modello di guadagno ibrido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• FIXO può guadagnare in <strong>due modi</strong></p>
            <p>• Il modello è <strong>flessibile</strong> e adattabile al tipo di intervento</p>
            <p>• <strong>Nessun costo fisso</strong> per cliente o tecnico</p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Modo 1 */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 shrink-0">1</Badge>
                <div>
                  <p className="font-medium text-sm mb-1">
                    Commissione sul servizio
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Se il cliente paga tramite FIXO, la piattaforma trattiene una piccola commissione sul totale dell'intervento.
                  </p>
                </div>
              </div>
            </div>

            {/* Modo 2 */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 shrink-0">2</Badge>
                <div>
                  <p className="font-medium text-sm mb-1">
                    Costo di servizio per l'uso della piattaforma
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    In alcuni casi FIXO può applicare un piccolo costo fisso di gestione per:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-primary" />
                      utilizzo dell'AI
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      gestione della richiesta
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-primary" />
                      organizzazione dell'intervento
                    </li>
                  </ul>
                  <p className="text-xs text-primary font-medium mt-2">
                    Questo costo è sempre visibile prima della conferma.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCCO 3 - Esempio Illustrativo */}
      <Card className="border-2 border-dashed border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Esempio illustrativo</CardTitle>
            <Badge variant="secondary">DEMO</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Costo intervento totale</p>
            <p className="text-2xl font-bold text-primary">€128,75</p>
          </div>

          <div className="grid gap-3">
            {/* Scenario A */}
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="font-medium text-sm text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">A</span>
                Pagamento tramite FIXO
              </p>
              <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                <li>• Totale pagato dal cliente: €128,75</li>
                <li>• Quota di servizio FIXO: visibile e trasparente</li>
                <li>• Tecnico riceve il resto</li>
              </ul>
            </div>

            {/* Scenario B */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">B</span>
                Pagamento gestito direttamente dal tecnico
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• FIXO trattiene solo il costo di utilizzo della piattaforma (se previsto)</li>
                <li>• Nessun vincolo di abbonamento</li>
              </ul>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center italic">
            Questo è un esempio DEMO. I valori possono variare in base al tipo di intervento.
          </p>
        </CardContent>
      </Card>

      {/* BLOCCO 4 - Cosa FIXO NON Fa */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Cosa FIXO non fa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              "Nessun abbonamento obbligatorio",
              "Nessun costo di ingresso",
              "Nessun vincolo di esclusiva",
              "Nessun costo nascosto"
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <X className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-xs">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t">
            FIXO non è un intermediario invasivo, ma uno strumento che semplifica il contatto tra cliente e professionista.
          </p>
        </CardContent>
      </Card>

      {/* BLOCCO 5 - Chiusura */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-300 dark:border-green-800">
        <CardContent className="py-5">
          <div className="text-center">
            <h3 className="text-lg font-bold text-green-800 dark:text-green-200 mb-3">
              Un modello sostenibile per tutti
            </h3>
            <div className="space-y-2 text-sm text-green-700 dark:text-green-300">
              <p>Il cliente ottiene un servizio chiaro e tracciato.</p>
              <p>Il tecnico lavora senza abbonamenti o vincoli.</p>
              <p className="font-medium">FIXO guadagna solo quando la piattaforma crea valore reale.</p>
            </div>
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
