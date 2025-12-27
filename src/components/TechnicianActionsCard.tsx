import { useState } from "react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle,
  XCircle,
  Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  label: string;
}

interface Job {
  id: string;
  user_id: string;
  status: string;
  preferred_slots?: TimeSlot[];
  flexible?: boolean;
  estimated_duration?: number;
  user_notes?: string;
  diagnoses?: {
    problem_type: string;
  };
}

interface TechnicianActionsCardProps {
  job: Job;
  onJobUpdated: () => void;
}

const TIME_SLOTS = [
  { start: "08:00", end: "10:00", label: "08:00 - 10:00" },
  { start: "09:00", end: "11:00", label: "09:00 - 11:00" },
  { start: "10:00", end: "12:00", label: "10:00 - 12:00" },
  { start: "11:00", end: "13:00", label: "11:00 - 13:00" },
  { start: "14:00", end: "16:00", label: "14:00 - 16:00" },
  { start: "15:00", end: "17:00", label: "15:00 - 17:00" },
  { start: "16:00", end: "18:00", label: "16:00 - 18:00" },
  { start: "17:00", end: "19:00", label: "17:00 - 19:00" },
];

export function TechnicianActionsCard({ job, onJobUpdated }: TechnicianActionsCardProps) {
  const { toast } = useToast();
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string; label: string } | null>(null);

  const preferredSlots = job.preferred_slots || [];

  const handleAcceptSlot = async (slot: TimeSlot) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'confirmed',
          slot_status: 'confirmed',
          confirmed_slot: JSON.parse(JSON.stringify(slot)),
          scheduled_date: `${slot.date}T${slot.start_time}:00`
        } as any)
        .eq('id', job.id);

      if (error) throw error;

      await supabase
        .from('notification_logs')
        .insert({
          user_id: job.user_id,
          notification_type: 'slot_confirmed',
          reference_id: job.id
        });

      toast({
        title: "Appuntamento confermato",
        description: `Hai accettato l'orario: ${slot.label}`,
      });

      onJobUpdated();
    } catch (error) {
      console.error('Error accepting slot:', error);
      toast({
        title: "Errore",
        description: "Impossibile confermare l'orario",
        variant: "destructive",
      });
    }
  };

  const handleConfirmFlexible = async () => {
    if (!selectedDate || !selectedSlot) {
      toast({
        title: "Seleziona un orario",
        description: "Devi selezionare data e orario",
        variant: "destructive",
      });
      return;
    }

    try {
      const confirmedSlot: TimeSlot = {
        date: format(selectedDate, "yyyy-MM-dd"),
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        label: `${format(selectedDate, "EEEE d MMMM", { locale: it })} ${selectedSlot.label}`,
      };

      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'confirmed',
          slot_status: 'confirmed',
          confirmed_slot: JSON.parse(JSON.stringify(confirmedSlot)),
          scheduled_date: `${confirmedSlot.date}T${confirmedSlot.start_time}:00`
        } as any)
        .eq('id', job.id);

      if (error) throw error;

      await supabase
        .from('notification_logs')
        .insert({
          user_id: job.user_id,
          notification_type: 'slot_confirmed',
          reference_id: job.id
        });

      toast({
        title: "Appuntamento confermato",
        description: `Hai fissato l'appuntamento: ${confirmedSlot.label}`,
      });

      setConfirmDialogOpen(false);
      onJobUpdated();
    } catch (error) {
      console.error('Error confirming slot:', error);
      toast({
        title: "Errore",
        description: "Impossibile confermare l'orario",
        variant: "destructive",
      });
    }
  };

  const handleProposeNewSlot = async () => {
    if (!selectedDate || !selectedSlot) {
      toast({
        title: "Seleziona un orario",
        description: "Devi selezionare data e orario prima di proporre",
        variant: "destructive",
      });
      return;
    }

    try {
      const proposedSlot: TimeSlot = {
        date: format(selectedDate, "yyyy-MM-dd"),
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        label: `${format(selectedDate, "EEEE d MMMM", { locale: it })} ${selectedSlot.label}`,
      };

      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'reschedule_proposed',
          slot_status: 'proposed',
          proposed_slot: JSON.parse(JSON.stringify(proposedSlot))
        } as any)
        .eq('id', job.id);

      if (error) throw error;

      await supabase
        .from('notification_logs')
        .insert({
          user_id: job.user_id,
          notification_type: 'reschedule_proposed',
          reference_id: job.id
        });

      toast({
        title: "Proposta inviata",
        description: "L'utente riceverà la tua proposta di nuovo orario",
      });

      setProposeDialogOpen(false);
      onJobUpdated();
    } catch (error) {
      console.error('Error proposing slot:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare la proposta",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async () => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'rejected',
          slot_status: 'rejected'
        })
        .eq('id', job.id);

      if (error) throw error;

      await supabase
        .from('notification_logs')
        .insert({
          user_id: job.user_id,
          notification_type: 'request_rejected',
          reference_id: job.id
        });

      toast({
        title: "Richiesta rifiutata",
        description: "L'utente potrà selezionare un altro tecnico",
      });

      setRejectDialogOpen(false);
      onJobUpdated();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Errore",
        description: "Impossibile rifiutare la richiesta",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="border-2 border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Azioni disponibili
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fasce orarie richieste dall'utente */}
          {job.flexible ? (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Cliente flessibile:</strong> Puoi scegliere qualsiasi orario disponibile.
              </p>
            </div>
          ) : preferredSlots.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Orari proposti dal cliente:</Label>
              {preferredSlots.map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm capitalize">{slot.label}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAcceptSlot(slot)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Conferma
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Note utente */}
          {job.user_notes && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Note del cliente:</p>
              <p className="text-sm">{job.user_notes}</p>
            </div>
          )}

          {/* Azioni */}
          <div className="space-y-2 pt-2 border-t">
            {job.flexible && (
              <Button
                onClick={() => setConfirmDialogOpen(true)}
                className="w-full"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Conferma orario
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setProposeDialogOpen(true)}
              className="w-full"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Proponi altro orario
            </Button>
            <Button
              variant="ghost"
              onClick={() => setRejectDialogOpen(true)}
              className="w-full text-destructive hover:text-destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rifiuta richiesta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog per confermare orario (cliente flessibile) */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scegli un orario</DialogTitle>
            <DialogDescription>
              Il cliente è flessibile. Seleziona data e ora per l'appuntamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Seleziona giorno</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                locale={it}
                className={cn("rounded-md border mt-2 pointer-events-auto")}
              />
            </div>
            {selectedDate && (
              <div>
                <Label>Seleziona orario</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {TIME_SLOTS.map((slot) => (
                    <Button
                      key={slot.label}
                      variant={selectedSlot?.label === slot.label ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <Button
              onClick={handleConfirmFlexible}
              disabled={!selectedDate || !selectedSlot}
              className="w-full"
            >
              Conferma appuntamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog per proporre nuovo orario */}
      <Dialog open={proposeDialogOpen} onOpenChange={setProposeDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proponi un nuovo orario</DialogTitle>
            <DialogDescription>
              Gli orari proposti dal cliente non sono disponibili? Proponi un'alternativa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Seleziona giorno</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                locale={it}
                className={cn("rounded-md border mt-2 pointer-events-auto")}
              />
            </div>
            {selectedDate && (
              <div>
                <Label>Seleziona orario</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {TIME_SLOTS.map((slot) => (
                    <Button
                      key={slot.label}
                      variant={selectedSlot?.label === slot.label ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <Button
              onClick={handleProposeNewSlot}
              disabled={!selectedDate || !selectedSlot}
              className="w-full"
            >
              Invia proposta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog conferma rifiuto */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rifiuta richiesta</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rifiutare questa richiesta? L'utente potrà selezionare un altro tecnico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectRequest}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Conferma rifiuto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
