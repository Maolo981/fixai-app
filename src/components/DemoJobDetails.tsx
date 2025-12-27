import { useDemoMode } from "./DemoModeProvider";
import { MobileLayout } from "@/components/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  Star,
  CheckCircle,
  Car,
  Wrench,
  MessageCircle,
  AlertCircle,
  CreditCard,
  Navigation,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG = {
  pending: {
    label: "In attesa di conferma",
    color: "bg-yellow-500",
    icon: Clock,
    description: "Il tecnico sta valutando la tua richiesta",
  },
  confirmed: {
    label: "Confermato",
    color: "bg-blue-500",
    icon: CheckCircle,
    description: "L'appuntamento è confermato. Contatti sbloccati.",
  },
  en_route: {
    label: "Tecnico in viaggio",
    color: "bg-orange-500",
    icon: Car,
    description: "Il tecnico sta arrivando a destinazione",
  },
  in_progress: {
    label: "Intervento in corso",
    color: "bg-purple-500",
    icon: Wrench,
    description: "Il tecnico sta lavorando al problema",
  },
  completed: {
    label: "Completato",
    color: "bg-green-500",
    icon: CheckCircle,
    description: "Intervento completato con successo!",
  },
};

export function DemoJobDetails() {
  const { isDemoMode, demoJob, demoStatus, advanceStatus } = useDemoMode();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!isDemoMode) return null;

  const statusConfig = STATUS_CONFIG[demoStatus as keyof typeof STATUS_CONFIG];
  const StatusIcon = statusConfig?.icon || Clock;
  const isPreConfirm = demoStatus === "pending";
  const isPostConfirm = ["confirmed", "en_route", "in_progress", "completed"].includes(demoStatus);

  const handleDemoAction = (action: string) => {
    toast({
      title: "🎭 Azione Demo",
      description: `Hai cliccato: "${action}" - Premi Avanti nel pannello Demo per simulare il prossimo stato.`,
    });
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-muted/30">
        {/* Demo Banner */}
        <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-sm font-medium">
          🎭 Modalità Demo - Dati fittizi
        </div>

        {/* Header */}
        <header className="bg-card border-b sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-lg font-bold">Dettagli Intervento</h1>
                <p className="text-xs text-muted-foreground">
                  {demoJob.diagnosis.problem_type}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                DEMO
              </Badge>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 space-y-4 max-w-lg">
          {/* Status Card */}
          <Card className={`border-2 ${
            demoStatus === "completed" ? "border-green-300 bg-green-50 dark:bg-green-950/20" :
            demoStatus === "en_route" ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20" :
            demoStatus === "in_progress" ? "border-purple-300 bg-purple-50 dark:bg-purple-950/20" :
            "border-blue-300 bg-blue-50 dark:bg-blue-950/20"
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <StatusIcon className="h-5 w-5" />
                  {statusConfig?.label}
                </CardTitle>
                <Badge className={statusConfig?.color}>{statusConfig?.label}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{statusConfig?.description}</p>
            </CardContent>
          </Card>

          {/* Technician Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Tecnico Assegnato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={demoJob.technician.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {demoJob.technician.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{demoJob.technician.full_name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{demoJob.technician.rating}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {demoJob.technician.specialties.slice(0, 2).map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact Info - Only visible after confirmation */}
              {isPostConfirm && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{demoJob.technician.phone}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                      onClick={() => handleDemoAction("Chiama tecnico")}
                    >
                      Chiama
                    </Button>
                  </div>
                </div>
              )}

              {isPreConfirm && (
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg">
                  <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Contatti visibili solo dopo la conferma
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Dettagli Appuntamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data e ora</span>
                <span className="font-medium">{demoJob.confirmed_slot.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Durata stimata</span>
                <span className="font-medium">{demoJob.estimated_duration}h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Costo stimato</span>
                <span className="font-medium">€{demoJob.final_cost}</span>
              </div>
              {isPostConfirm && (
                <div className="flex items-start gap-3 pt-2 border-t text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-muted-foreground">Indirizzo</p>
                    <p className="font-medium">{demoJob.client.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Problem Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dettagli Problema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-medium">{demoJob.diagnosis.problem_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Urgenza</span>
                <Badge variant="outline">{demoJob.diagnosis.urgency_level}</Badge>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                {demoJob.diagnosis.ai_analysis}
              </p>
            </CardContent>
          </Card>

          {/* Actions based on status */}
          <div className="space-y-3">
            {demoStatus === "en_route" && (
              <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-pulse">
                      <Car className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Tecnico in arrivo</p>
                      <p className="text-xs text-muted-foreground">ETA: 15 minuti</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDemoAction("Traccia tecnico")}
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      Traccia
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {demoStatus === "in_progress" && (
              <Card className="border-purple-300 bg-purple-50 dark:bg-purple-950/20">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin-slow">
                      <Wrench className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Intervento in corso</p>
                      <p className="text-xs text-muted-foreground">Il tecnico sta lavorando</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {demoStatus === "completed" && (
              <div className="space-y-3">
                <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Intervento completato!</p>
                        <p className="text-xs text-green-700">Tutto risolto con successo</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  className="w-full"
                  onClick={() => handleDemoAction("Procedi al pagamento")}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Procedi al pagamento (€{demoJob.final_cost})
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleDemoAction("Lascia recensione")}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Lascia una recensione
                </Button>
              </div>
            )}

            {/* Chat Button */}
            <Button
              variant={isPreConfirm ? "outline" : "default"}
              className="w-full"
              onClick={() => handleDemoAction("Apri chat")}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {isPreConfirm ? "Chat (limitata)" : "Chat con il tecnico"}
            </Button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
