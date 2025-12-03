import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicianName: string;
  technicianId: string;
  onConfirm: (date: Date, time: string) => void;
}

export function BookingDialog({
  open,
  onOpenChange,
  technicianName,
  technicianId,
  onConfirm,
}: BookingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Genera fasce orarie dalle 8:00 alle 18:00
  const allTimeSlots = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 8;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Carica gli slot già prenotati per il tecnico nella data selezionata
  useEffect(() => {
    const loadBookedSlots = async () => {
      if (!selectedDate || !technicianId) return;

      setLoadingSlots(true);
      try {
        // Ottieni l'inizio e la fine della giornata selezionata
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: jobs, error } = await supabase
          .from('jobs')
          .select('scheduled_date')
          .eq('technician_id', technicianId)
          .gte('scheduled_date', startOfDay.toISOString())
          .lte('scheduled_date', endOfDay.toISOString())
          .not('status', 'in', '("cancelled","completed")');

        if (error) {
          console.error('Errore nel caricamento slot:', error);
          return;
        }

        // Estrai gli orari già prenotati
        const booked = jobs?.map(job => {
          const date = new Date(job.scheduled_date!);
          return `${date.getHours().toString().padStart(2, '0')}:00`;
        }) || [];

        setBookedSlots(booked);
      } catch (err) {
        console.error('Errore:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    loadBookedSlots();
    setSelectedTime(undefined); // Reset time quando cambia la data
  }, [selectedDate, technicianId]);

  // Filtra gli slot disponibili
  const availableTimeSlots = allTimeSlots.filter(slot => !bookedSlots.includes(slot));

  // Per oggi, filtra anche gli slot già passati
  const filteredTimeSlots = availableTimeSlots.filter(slot => {
    if (!selectedDate) return true;
    
    const today = new Date();
    if (isSameDay(selectedDate, today)) {
      const [hours] = slot.split(':');
      const slotHour = parseInt(hours);
      return slotHour > today.getHours();
    }
    return true;
  });

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return;

    const [hours, minutes] = selectedTime.split(':');
    const appointmentDate = new Date(selectedDate);
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    onConfirm(appointmentDate, selectedTime);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Prenota con {technicianName}</DialogTitle>
          <DialogDescription>
            Seleziona data e ora per l'appuntamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Calendario */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Seleziona la Data
            </Label>
            <div className="flex justify-center border rounded-md p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) =>
                  date < new Date() || date < new Date(new Date().setHours(0, 0, 0, 0))
                }
                initialFocus
                locale={it}
                className={cn("pointer-events-auto")}
              />
            </div>
          </div>

          {/* Orario */}
          {selectedDate && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Seleziona l'Orario
                {loadingSlots && <Loader2 className="h-3 w-3 animate-spin" />}
              </Label>
              
              {filteredTimeSlots.length > 0 ? (
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli un orario disponibile" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTimeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Nessuno slot disponibile per questa data.</p>
                  <p className="text-xs mt-1">Prova a selezionare un altro giorno.</p>
                </div>
              )}

              {bookedSlots.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Occupati:</span>
                  {bookedSlots.map((slot) => (
                    <Badge key={slot} variant="secondary" className="text-xs opacity-50">
                      {slot}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Riepilogo */}
          {selectedDate && selectedTime && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-1">
              <p className="text-sm font-medium">Riepilogo Prenotazione:</p>
              <p className="text-sm text-muted-foreground">
                📅 {format(selectedDate, 'EEEE d MMMM yyyy', { locale: it })}
              </p>
              <p className="text-sm text-muted-foreground">
                🕐 {selectedTime}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedTime}
          >
            Conferma Prenotazione
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
