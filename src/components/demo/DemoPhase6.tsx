import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  MapPin,
  Phone,
  Unlock,
  Star
} from "lucide-react";
import { useDemoLanguage } from "@/contexts/DemoLanguageContext";

interface DemoPhaseProps {
  onNext?: () => void;
}

export function DemoPhase6({ onNext }: DemoPhaseProps) {
  const { t } = useDemoLanguage();
  const p = t.phase6;

  return (
    <div className="space-y-4">
      {/* Slot Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {p.technicianSelectsSlot}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center p-3 rounded-lg border-2 border-primary bg-primary/10">
              <span className="w-20 text-sm font-mono">15:00</span>
              <div className="flex-1 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{p.slotSelected}</span>
              </div>
            </div>
            <div className="flex items-center p-3 rounded-lg bg-muted/30">
              <span className="w-20 text-sm font-mono">17:00</span>
              <span className="text-sm text-muted-foreground">{p.expectedEnd}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Banner */}
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-300 border-2">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-green-800 dark:text-green-200 text-lg">
                {p.appointmentConfirmed}
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                {p.statusConfirmed}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unlock Notice */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="py-3">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Unlock className="h-4 w-4" />
            <p className="text-sm font-medium">
              {p.contactsUnlocked}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{p.appointmentDetails}</CardTitle>
            <Badge className="bg-green-500">{p.confirmed}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Today, December 27, 2024</p>
              <p className="text-sm text-muted-foreground">15:00 - 17:00</p>
            </div>
          </div>

          {/* Contact Info - NOW VISIBLE */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <Phone className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-200">
                +39 333 1234567
              </span>
            </div>
            <div className="flex items-start gap-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-green-600">{p.address}</p>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Via Roma 42, 20100 Milano
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technician Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{p.assignedTechnician}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg bg-primary/10">M</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">Marco Rossi</p>
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>4.9 (127 reviews)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={onNext}>
        <CheckCircle className="h-4 w-4 mr-2" />
        {t.phase3.continue}
      </Button>
    </div>
  );
}
