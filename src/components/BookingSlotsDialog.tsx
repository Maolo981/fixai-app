import { useState } from "react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  AlertCircle, 
  Euro, 
  Trash2,
  Plus,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  label: string;
}

interface BookingSlotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    preferred_slots: TimeSlot[];
    flexible: boolean;
    estimated_duration: number;
    user_notes: string;
  }) => void;
  technicianName: string;
  problemType: string;
  urgencyLevel: string;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  estimatedTimeHours?: number;
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


export function BookingSlotsDialog({
  open,
  onOpenChange,
  onConfirm,
  technicianName,
  problemType,
  urgencyLevel,
  estimatedCostMin,
  estimatedCostMax,
  estimatedTimeHours = 2,
}: BookingSlotsDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [flexible, setFlexible] = useState(false);
  const [userNotes, setUserNotes] = useState("");
  const [showTimeSlots, setShowTimeSlots] = useState(false);

  const handleAddSlot = (slot: { start: string; end: string; label: string }) => {
    if (!selectedDate || selectedSlots.length >= 3) return;

    const newSlot: TimeSlot = {
      date: format(selectedDate, "yyyy-MM-dd"),
      start_time: slot.start,
      end_time: slot.end,
      label: `${format(selectedDate, "EEEE d MMMM", { locale: it })} ${slot.label}`,
    };

    // Check if slot already exists
    const exists = selectedSlots.some(
      (s) => s.date === newSlot.date && s.start_time === newSlot.start_time
    );

    if (!exists) {
      setSelectedSlots([...selectedSlots, newSlot]);
      setShowTimeSlots(false);
    }
  };

  const handleRemoveSlot = (index: number) => {
    setSelectedSlots(selectedSlots.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    onConfirm({
      preferred_slots: selectedSlots,
      flexible,
      estimated_duration: estimatedTimeHours,
      user_notes: userNotes,
    });
  };

  const canSubmit = flexible || selectedSlots.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Seleziona data e ora
          </DialogTitle>
          <DialogDescription>
            Scegli 2-3 fasce orarie preferite per l'intervento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Riepilogo */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tecnico:</span>
                <span className="font-medium">{technicianName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Problema:</span>
                <span className="font-medium">{problemType}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge 
                  variant={
                    urgencyLevel === 'high' ? 'destructive' : 
                    urgencyLevel === 'medium' ? 'default' : 'secondary'
                  }
                  className="text-xs"
                >
                  Urgenza: {urgencyLevel === 'high' ? 'Alta' : urgencyLevel === 'medium' ? 'Media' : 'Bassa'}
                </Badge>
              </div>
              {estimatedCostMin && estimatedCostMax && (
                <div className="flex items-center gap-2 text-sm">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Costo stimato:</span>
                  <span className="font-medium">€{estimatedCostMin} - €{estimatedCostMax}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Opzione Prima disponibilità */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
            <div>
              <Label className="font-medium">Prima disponibilità</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Sono flessibile, contattami per qualsiasi orario disponibile
              </p>
            </div>
            <Switch
              checked={flexible}
              onCheckedChange={(checked) => {
                setFlexible(checked);
                if (checked) {
                  setSelectedSlots([]);
                }
              }}
            />
          </div>

          {/* Selezione Slot (se non flessibile) */}
          {!flexible && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Fasce orarie preferite</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedSlots.length}/3 selezionate (min. 2)
                </span>
              </div>

              {/* Slot selezionati */}
              {selectedSlots.length > 0 && (
                <div className="space-y-2">
                  {selectedSlots.map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium capitalize">{slot.label}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveSlot(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Aggiungi slot */}
              {selectedSlots.length < 3 && (
                <>
                  {!showTimeSlots ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowTimeSlots(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi fascia oraria
                    </Button>
                  ) : (
                    <div className="space-y-4 border rounded-lg p-4">
                      <Label className="text-sm font-medium">Seleziona giorno</Label>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => isBefore(date, startOfDay(new Date()))}
                        locale={it}
                        className={cn("rounded-md border pointer-events-auto")}
                      />
                      
                      {selectedDate && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Seleziona orario per {format(selectedDate, "EEEE d MMMM", { locale: it })}
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            {TIME_SLOTS.map((slot) => (
                              <Button
                                key={slot.label}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleAddSlot(slot)}
                              >
                                {slot.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowTimeSlots(false)}
                      >
                        Annulla
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Durata stimata (solo informativa) */}
          {estimatedTimeHours > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Durata stimata:</span>
              </div>
              <span className="text-sm font-medium">{estimatedTimeHours}h circa</span>
            </div>
          )}

          {/* Note per il tecnico */}
          <div className="space-y-2">
            <Label className="font-medium">Note per il tecnico (opzionale)</Label>
            <Textarea
              placeholder="Es. Citofono non funziona, chiamami al telefono..."
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Pulsante finale */}
          <Button
            onClick={handleConfirm}
            disabled={!canSubmit}
            size="lg"
            className="w-full"
          >
            <Send className="h-5 w-5 mr-2" />
            Invia richiesta con orari
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Nessun pagamento verrà effettuato in questa fase.
            Il tecnico confermerà uno degli orari o proporrà un'alternativa.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
