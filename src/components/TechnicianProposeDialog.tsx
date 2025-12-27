import { useState } from "react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { it } from "date-fns/locale";
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
import { cn } from "@/lib/utils";

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  label: string;
}

interface TechnicianProposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  userId: string;
  onProposed: () => void;
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

export function TechnicianProposeDialog({
  open,
  onOpenChange,
  jobId,
  userId,
  onProposed,
}: TechnicianProposeDialogProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string; label: string } | null>(null);

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
        .eq('id', jobId);

      if (error) throw error;

      await supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          notification_type: 'reschedule_proposed',
          reference_id: jobId
        });

      toast({
        title: "Proposta inviata",
        description: "L'utente riceverà la tua nuova proposta di orario",
      });

      onOpenChange(false);
      onProposed();
    } catch (error) {
      console.error('Error proposing slot:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare la proposta",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica proposta orario</DialogTitle>
          <DialogDescription>
            Seleziona un nuovo orario da proporre al cliente.
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
            Invia nuova proposta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
