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
import { useDemoLanguage } from "@/contexts/DemoLanguageContext";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase12({ onNext }: DemoPhaseProps) {
  const { t } = useDemoLanguage();
  const p = t.phase12;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center pb-2">
        <h2 className="text-xl font-bold mb-1">{p.howFixoEarns}</h2>
        <p className="text-sm text-muted-foreground">
          {p.hybridModel}
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
                {p.noAppFee}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {p.appFreeDescription}
                <br />
                {p.forBoth} <strong>{p.appFree}</strong>.
                <br />
                {p.noSubscription}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocco 2 - Modello di guadagno */}
      <Card>
        <CardContent className="py-5 space-y-4">
          <h3 className="font-bold text-center">{p.twoWays}</h3>
          
          {/* Modo 1 */}
          <div className="bg-muted/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
              <span className="font-semibold text-sm">{p.fixedCost}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-8">
              {p.fixedCostDesc}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 pl-8">
              <Badge variant="secondary" className="text-xs font-normal">
                <Sparkles className="h-3 w-3 mr-1" />
                {p.aiUse}
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                <CheckCircle className="h-3 w-3 mr-1" />
                {p.requestManagement}
              </Badge>
              <Badge variant="secondary" className="text-xs font-normal">
                <Eye className="h-3 w-3 mr-1" />
                {p.alwaysVisible}
              </Badge>
            </div>
          </div>

          {/* Modo 2 */}
          <div className="bg-muted/40 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
              <span className="font-semibold text-sm">{p.optionalCommission}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-8">
              {p.optionalCommissionDesc}
            </p>
            <p className="text-xs text-primary font-medium mt-2 pl-8">
              {p.lowPercentage}
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
              <span className="text-xs font-semibold">{p.paymentOutsideApp}</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                <span>{p.directToTechnician}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                <span>{p.onlyFixedCost}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                <span>{p.noExtraCommission}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Pagamento in app */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4 px-3">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">{p.paymentInApp}</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <Lock className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <span>{p.trackedPayment}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Shield className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <span>{p.clientTechProtection}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Headphones className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <span>{p.supportIfProblems}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-xs text-primary font-medium">{p.commission}</span>
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
                {p.trustMessage}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                {p.noRequestFee}
                <br />
                {p.earnsOnCompletion}
                <br />
                <strong>{p.noHiddenCosts}</strong>
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
              {p.transparentProcess}
            </h3>
          </div>
          <div className="space-y-2">
            {[p.clearCosts, p.freePayment, p.alignedInterests].map((item, index) => (
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
        {p.endDemoHome}
      </Button>
    </div>
  );
}
