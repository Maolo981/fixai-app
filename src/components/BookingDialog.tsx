import { useState } from "react";
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
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicianName: string;
  onConfirm: (date: Date, time: string) => void;
}

export function BookingDialog({
  open,
  onOpenChange,
  technicianName,
  onConfirm,
}: BookingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();

  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return;

    const [hours, minutes] = selectedTime.split(':');
    const appointmentDate = new Date(selectedDate);
    appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    onConfirm(appointmentDate, selectedTime);
    onOpenChange(false);
  };

  // Genera fasce orarie dalle 8:00 alle 18:00
  const timeSlots = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 8;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Prenota con {technicianName}</DialogTitle>
          <DialogDescription>
            Seleziona data e ora per l'appuntamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
              </Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Scegli un orario" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        <DialogFooter>
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
