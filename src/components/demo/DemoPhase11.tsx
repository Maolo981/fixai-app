import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle
} from "lucide-react";
import { useDemoLanguage } from "@/contexts/DemoLanguageContext";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase11({ onNext }: DemoPhaseProps) {
  const { t } = useDemoLanguage();
  const p = t.phase11;

  return (
    <div className="space-y-4">
      {/* Final Summary */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-300 border-2">
        <CardContent className="py-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
            {p.processCompleted}
          </h3>
          <p className="text-sm text-green-600 dark:text-green-300 mb-4">
            {p.fromDiagnosisToPayment}
          </p>
        </CardContent>
      </Card>

      {/* Status Badges */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                {p.interventionCompleted}
              </span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                {p.reviewRecorded}
              </span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                {p.processEnded}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Value Props */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm font-medium text-center mb-3">
            {p.withFixoYouGot}
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-green-600 border-green-300">
              {p.verifiedTechnician}
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-300">
              {p.transparentPrices}
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-300">
              {p.trackedPayment}
            </Badge>
            <Badge variant="outline" className="text-green-600 border-green-300">
              {p.verifiedReview}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onNext}>
        <CheckCircle className="h-4 w-4 mr-2" />
        {p.discoverRevenue}
      </Button>
    </div>
  );
}
