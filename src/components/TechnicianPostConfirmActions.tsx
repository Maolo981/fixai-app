import { useState } from "react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Car,
  Wrench,
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  MessageCircle,
  Navigation,
} from "lucide-react";

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  label: string;
}

interface TechnicianPostConfirmActionsProps {
  job: {
    id: string;
    user_id: string;
    status: string;
    confirmed_slot?: TimeSlot;
    scheduled_date?: string;
    estimated_duration?: number;
    diagnoses?: {
      problem_type: string;
      estimated_time_hours?: number;
    };
  };
  clientInfo: {
    full_name: string;
    phone?: string;
    address?: string;
  };
  onJobUpdated: () => void;
  onOpenChat: () => void;
}

export function TechnicianPostConfirmActions({
  job,
  clientInfo,
  onJobUpdated,
  onOpenChat,
}: TechnicianPostConfirmActionsProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "confirmed":
        return { label: "Confermato", color: "bg-green-500" };
      case "en_route":
        return { label: "In Viaggio", color: "bg-blue-500" };
      case "in_progress":
        return { label: "In Corso", color: "bg-orange-500" };
      case "completed":
        return { label: "Completato", color: "bg-green-600" };
      default:
        return { label: status, color: "bg-gray-500" };
    }
  };

  const updateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "completed") {
        updateData.completion_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("jobs")
        .update(updateData)
        .eq("id", job.id);

      if (error) throw error;

      // Send notification to client
      await supabase.from("notification_logs").insert({
        user_id: job.user_id,
        notification_type: `job_${newStatus}`,
        reference_id: job.id,
      });

      const messages: Record<string, { title: string; desc: string }> = {
        en_route: {
          title: "Sei in viaggio!",
          desc: "Il cliente è stato notificato del tuo arrivo.",
        },
        in_progress: {
          title: "Lavoro iniziato!",
          desc: "Il cliente è stato notificato.",
        },
        completed: {
          title: "Lavoro completato!",
          desc: "Il cliente potrà ora lasciare un feedback e procedere al pagamento.",
        },
      };

      const msg = messages[newStatus] || { title: "Stato aggiornato", desc: "" };
      toast({ title: msg.title, description: msg.desc });

      if (newStatus === "completed") {
        setCompleteDialogOpen(false);
      }

      onJobUpdated();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleComplete = async () => {
    await updateStatus("completed");
  };

  const statusInfo = getStatusInfo(job.status);
  const showEnRoute = job.status === "confirmed";
  const showInProgress = job.status === "confirmed" || job.status === "en_route";
  const showComplete = job.status === "in_progress" || job.status === "en_route" || job.status === "confirmed";
  const isCompleted = job.status === "completed";

  const formattedDate = job.confirmed_slot
    ? format(parseISO(job.confirmed_slot.date), "EEEE d MMMM yyyy", { locale: it })
    : job.scheduled_date
    ? format(new Date(job.scheduled_date), "EEEE d MMMM yyyy", { locale: it })
    : null;

  const formattedTime = job.confirmed_slot
    ? `${job.confirmed_slot.start_time} - ${job.confirmed_slot.end_time}`
    : job.scheduled_date
    ? format(new Date(job.scheduled_date), "HH:mm", { locale: it })
    : null;

  return (
    <>
      {/* Status Card */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Stato Intervento</CardTitle>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Appointment Details */}
          {formattedDate && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{formattedDate}</span>
              </div>
              {formattedTime && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formattedTime}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Durata: {job.diagnoses?.estimated_time_hours || job.estimated_duration || 2}h
                </span>
              </div>
            </div>
          )}

          {/* Client Info - UNLOCKED after confirmation */}
          <div className="pt-3 border-t space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Contatti cliente (sbloccati)
            </p>
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{clientInfo.full_name}</span>
            </div>
            {clientInfo.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-primary" />
                <a
                  href={`tel:${clientInfo.phone}`}
                  className="text-primary hover:underline font-medium"
                >
                  {clientInfo.phone}
                </a>
              </div>
            )}
            {clientInfo.address && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{clientInfo.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!isCompleted && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Azioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {showEnRoute && (
              <Button
                onClick={() => updateStatus("en_route")}
                disabled={isUpdating}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Car className="h-5 w-5 mr-2" />
                Sono in viaggio
              </Button>
            )}

            {showInProgress && (
              <Button
                onClick={() => updateStatus("in_progress")}
                disabled={isUpdating}
                variant={job.status === "en_route" ? "default" : "outline"}
                className="w-full"
                size="lg"
              >
                <Wrench className="h-5 w-5 mr-2" />
                Inizio intervento
              </Button>
            )}

            {showComplete && (
              <Button
                onClick={() => setCompleteDialogOpen(true)}
                disabled={isUpdating}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Intervento completato
              </Button>
            )}

            <Button
              onClick={onOpenChat}
              variant="ghost"
              className="w-full"
              size="lg"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Chat con il cliente
            </Button>

            {clientInfo.address && (
              <Button
                onClick={() => {
                  const encodedAddress = encodeURIComponent(clientInfo.address!);
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
                    "_blank"
                  );
                }}
                variant="ghost"
                className="w-full"
                size="lg"
              >
                <Navigation className="h-5 w-5 mr-2" />
                Naviga verso il cliente
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed State */}
      {isCompleted && (
        <Card className="border-2 border-green-500/30 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-green-800 dark:text-green-200">
              Intervento Completato
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Il cliente è stato notificato e potrà procedere al pagamento.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Complete Confirmation Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma completamento</DialogTitle>
            <DialogDescription>
              Stai per segnare l'intervento come completato. Questa azione
              sbloccherà il pagamento per il cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Problema:</span>
                <span className="font-medium">{job.diagnoses?.problem_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{clientInfo.full_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Durata stimata:</span>
                <span className="font-medium">
                  {job.diagnoses?.estimated_time_hours || job.estimated_duration || 2}h
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Textarea
                placeholder="Eventuali note sull'intervento..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isUpdating}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Conferma completamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
