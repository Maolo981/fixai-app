import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  Euro,
  User
} from "lucide-react";
import { useDemoLanguage } from "@/contexts/DemoLanguageContext";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase2({ onNext }: DemoPhaseProps) {
  const { t } = useDemoLanguage();
  const p = t.phase2;

  return (
    <div className="space-y-4">
      {/* AI Diagnosis Result */}
      <Card className="border-2 border-green-300 bg-green-50 dark:bg-green-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              {p.aiDiagnosis}
            </CardTitle>
            <Badge className="bg-green-500">{p.analysisComplete}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Problem Type */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{p.problemDetected}</span>
            <span className="font-semibold">{p.problemType}</span>
          </div>

          {/* Possible Cause */}
          <div className="bg-background rounded-lg p-3">
            <p className="text-sm font-medium mb-1">{p.possibleCauses}</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {p.cause1}</li>
              <li>• {p.cause2}</li>
              <li>• {p.cause3}</li>
            </ul>
          </div>

          {/* Urgency */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{p.urgencyLevel}</span>
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {p.urgencyMedium}
            </Badge>
          </div>

          {/* Cost Estimate */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{p.estimatedCost}</span>
            <div className="flex items-center gap-1 font-semibold text-primary">
              <Euro className="h-4 w-4" />
              80 - 150
            </div>
          </div>

          {/* Recommended Specialty */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{p.recommendedSpecialty}</span>
            <Badge className="bg-primary">
              <User className="h-3 w-3 mr-1" />
              {p.technicianType}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onNext}>
        <CheckCircle className="h-4 w-4 mr-2" />
        {p.findTechnicians}
      </Button>
    </div>
  );
}
