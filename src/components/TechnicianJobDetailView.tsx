import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, isBefore, startOfDay, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  CheckCircle,
  XCircle,
  MessageCircle,
  Bell
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
  created_at: string;
  technician_id: string;
  preferred_slots?: TimeSlot[];
  flexible?: boolean;
  estimated_duration?: number;
  user_notes?: string;
  diagnoses?: {
    problem_type: string;
    urgency_level?: string;
    estimated_time_hours?: number;
    estimated_cost_min?: number;
    estimated_cost_max?: number;
  };
  technicians?: {
    full_name: string;
  };
  profiles?: {
    full_name: string;
  };
}

interface TechnicianJobDetailViewProps {
  job: Job;
  clientName: string;
  onJobUpdated: () => void;
  onOpenChat: () => void;
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

const getStatusBadge = (status: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    requested: { label: "In attesa di conferma", variant: "secondary" },
    pending_technician_confirmation: { label: "In attesa di conferma", variant: "secondary" },
    reschedule_proposed: { label: "Proposta inviata", variant: "default" },
    confirmed: { label: "Confermato", variant: "default" },
    rejected: { label: "Rifiutato", variant: "destructive" },
  };
  return map[status] || { label: status, variant: "secondary" };
};

export function TechnicianJobDetailView({ 
  job, 
  clientName,
  onJobUpdated, 
  onOpenChat 
}: TechnicianJobDetailViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [confirmationShown, setConfirmationShown] = useState(false);
  const [confirmedSlotData, setConfirmedSlotData] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string; label: string } | null>(null);

  const preferredSlots = job.preferred_slots || [];
  const statusInfo = getStatusBadge(job.status);

  // Get unique dates from preferred slots
  const availableDates = [...new Set(preferredSlots.map(slot => slot.date))];
  
  // Get slots for selected date
  const slotsForSelectedDate = preferredSlots.filter(
    slot => slot.date === (selectedDate ? format(selectedDate, "yyyy-MM-dd") : null)
  );

  // Check if selected date has available slots
  const isDateAvailable = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availableDates.includes(dateStr);
  };

  const handleConfirmSlot = async () => {
    let slotToConfirm: TimeSlot;
    
    if (job.flexible) {
      // For flexible client, use calendar selection
      if (!selectedDate || !selectedSlot) {
        toast({
          title: "Seleziona un orario",
          description: "Devi selezionare data e orario",
          variant: "destructive",
        });
        return;
      }
      slotToConfirm = {
        date: format(selectedDate, "yyyy-MM-dd"),
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        label: `${format(selectedDate, "EEEE d MMMM", { locale: it })} ${selectedSlot.label}`,
      };
    } else {
      // For preferred slots, require both date and slot selection
      if (!selectedDate || !selectedSlot) {
        toast({
          title: "Seleziona un orario",
          description: "Devi selezionare data e fascia oraria",
          variant: "destructive",
        });
        return;
      }
      
      // Find the matching preferred slot
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const matchingSlot = preferredSlots.find(
        slot => slot.date === dateStr && slot.start_time === selectedSlot.start && slot.end_time === selectedSlot.end
      );
      
      if (!matchingSlot) {
        toast({
          title: "Errore",
          description: "Seleziona una fascia oraria valida per questa data",
          variant: "destructive",
        });
        return;
      }
      
      slotToConfirm = matchingSlot;
    }

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'confirmed',
          slot_status: 'confirmed',
          confirmed_slot: JSON.parse(JSON.stringify(slotToConfirm)),
          scheduled_date: `${slotToConfirm.date}T${slotToConfirm.start_time}:00`
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

      // Show confirmation screen
      setConfirmedSlotData(slotToConfirm);
      setConfirmationShown(true);
    } catch (error) {
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
        description: "Devi selezionare data e orario",
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
        description: "Il cliente riceverà la tua proposta",
      });

      setProposeDialogOpen(false);
      onJobUpdated();
    } catch (error) {
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
        description: "Il cliente potrà selezionare un altro tecnico",
      });

      setRejectDialogOpen(false);
      navigate('/technician-dashboard');
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile rifiutare la richiesta",
        variant: "destructive",
      });
    }
  };

  // Handle date selection - reset slot when date changes
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null); // Reset slot when date changes
  };

  // Check if confirm button should be enabled
  const canConfirm = selectedDate && selectedSlot;

  // If confirmation screen is shown
  if (confirmationShown && confirmedSlotData) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <header className="bg-card border-b sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold">Orario confermato</h1>
            </div>
          </div>
        </header>

        <div className="flex-1 container mx-auto px-4 py-6 space-y-4 max-w-lg flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          
          <h2 className="text-xl font-bold text-center">Appuntamento confermato!</h2>
          
          <Card className="w-full">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium capitalize">
                    {format(parseISO(confirmedSlotData.date), "EEEE d MMMM yyyy", { locale: it })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Orario</p>
                  <p className="font-medium">{confirmedSlotData.start_time} - {confirmedSlotData.end_time}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Durata</p>
                  <p className="font-medium">{job.diagnoses?.estimated_time_hours || job.estimated_duration || 2}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg w-full">
            <Bell className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-primary">Il cliente è stato notificato della conferma.</p>
          </div>

          <Button
            onClick={() => navigate('/technician-dashboard')}
            className="w-full mt-4"
            size="lg"
          >
            Torna alla dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/technician-dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold">Gestione richiesta</h1>
            </div>
            <Badge variant={statusInfo.variant}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-6 space-y-4 max-w-lg pb-24">
        {/* 1. Riepilogo richiesta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Riepilogo richiesta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Problema</span>
              <span className="font-medium text-right max-w-[60%]">{job.diagnoses?.problem_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Durata stimata</span>
              <span className="font-medium">{job.diagnoses?.estimated_time_hours || job.estimated_duration || 2}h</span>
            </div>
            {job.diagnoses?.estimated_cost_min && job.diagnoses?.estimated_cost_max && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo stimato</span>
                <span className="font-medium">€{job.diagnoses.estimated_cost_min} - €{job.diagnoses.estimated_cost_max}</span>
              </div>
            )}
            {job.user_notes && (
              <div className="pt-2 border-t mt-2">
                <p className="text-muted-foreground text-xs mb-1">Note del cliente:</p>
                <p className="text-sm">{job.user_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Orari */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Orari
            </CardTitle>
          </CardHeader>
          <CardContent>
            {job.flexible ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Cliente flessibile – puoi scegliere qualsiasi orario disponibile.
                </p>
                <div>
                  <Label className="text-xs text-muted-foreground">Seleziona giorno</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    locale={it}
                    className={cn("rounded-md border mt-2 pointer-events-auto")}
                  />
                </div>
                {selectedDate && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Seleziona fascia oraria</Label>
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
              </div>
            ) : preferredSlots.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Seleziona una data e poi la fascia oraria disponibile.
                </p>
                <div>
                  <Label className="text-xs text-muted-foreground">Seleziona giorno</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    modifiers={{
                      available: (date) => isDateAvailable(date)
                    }}
                    modifiersClassNames={{
                      available: "bg-primary/20 text-primary font-semibold"
                    }}
                    locale={it}
                    className={cn("rounded-md border mt-2 pointer-events-auto")}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    I giorni evidenziati hanno fasce orarie proposte dal cliente.
                  </p>
                </div>
                {selectedDate && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Seleziona fascia oraria</Label>
                    {slotsForSelectedDate.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 mt-2">
                        {slotsForSelectedDate.map((slot, index) => (
                          <Button
                            key={index}
                            variant={selectedSlot?.start === slot.start_time && selectedSlot?.end === slot.end_time ? "default" : "outline"}
                            size="sm"
                            className="justify-start"
                            onClick={() => setSelectedSlot({ start: slot.start_time, end: slot.end_time, label: `${slot.start_time} - ${slot.end_time}` })}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            {slot.start_time} - {slot.end_time}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-2">
                        Nessuna fascia oraria disponibile per questa data. Seleziona uno dei giorni evidenziati.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nessun orario specificato.</p>
            )}
          </CardContent>
        </Card>

        {/* 3. Azioni */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Azioni disponibili</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleConfirmSlot}
              disabled={!canConfirm}
              className="w-full"
              size="lg"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Conferma orario
            </Button>
            <Button
              variant="outline"
              onClick={() => setProposeDialogOpen(true)}
              className="w-full"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Proponi altro orario
            </Button>
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                onClick={() => setRejectDialogOpen(true)}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rifiuta richiesta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Chat Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="container mx-auto max-w-lg">
          <Button
            onClick={onOpenChat}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Apri chat con il cliente
          </Button>
        </div>
      </div>

      {/* Dialog per proporre altro orario */}
      <Dialog open={proposeDialogOpen} onOpenChange={setProposeDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proponi altro orario</DialogTitle>
            <DialogDescription>
              Seleziona una data e un orario alternativo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Seleziona giorno</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
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
              Sei sicuro? Il cliente potrà selezionare un altro tecnico.
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
    </div>
  );
}
