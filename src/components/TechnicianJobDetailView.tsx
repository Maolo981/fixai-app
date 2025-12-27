import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, isBefore, startOfDay } from "date-fns";
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
  MessageCircle
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string; label: string } | null>(null);
  const [selectedPreferredSlot, setSelectedPreferredSlot] = useState<TimeSlot | null>(null);

  const preferredSlots = job.preferred_slots || [];
  const statusInfo = getStatusBadge(job.status);

  const handleConfirmSlot = async () => {
    // Se cliente flessibile, usa la selezione dal calendario
    if (job.flexible) {
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
          description: `Hai fissato: ${confirmedSlot.label}`,
        });

        onJobUpdated();
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile confermare l'orario",
          variant: "destructive",
        });
      }
    } else {
      // Usa lo slot preferito selezionato
      if (!selectedPreferredSlot) {
        toast({
          title: "Seleziona un orario",
          description: "Seleziona uno degli orari proposti dal cliente",
          variant: "destructive",
        });
        return;
      }

      try {
        const { error } = await supabase
          .from('jobs')
          .update({
            status: 'confirmed',
            slot_status: 'confirmed',
            confirmed_slot: JSON.parse(JSON.stringify(selectedPreferredSlot)),
            scheduled_date: `${selectedPreferredSlot.date}T${selectedPreferredSlot.start_time}:00`
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
          description: `Hai accettato: ${selectedPreferredSlot.label}`,
        });

        onJobUpdated();
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile confermare l'orario",
          variant: "destructive",
        });
      }
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

  const canConfirm = job.flexible 
    ? (selectedDate && selectedSlot) 
    : selectedPreferredSlot;

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
                    onSelect={setSelectedDate}
                    disabled={(date) => isBefore(date, startOfDay(new Date()))}
                    locale={it}
                    className={cn("rounded-md border mt-2 pointer-events-auto")}
                  />
                </div>
                {selectedDate && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Seleziona orario</Label>
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
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Seleziona uno degli orari proposti:
                </p>
                {preferredSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPreferredSlot(slot)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                      selectedPreferredSlot?.label === slot.label
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm capitalize flex-1">{slot.label}</span>
                    {selectedPreferredSlot?.label === slot.label && (
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
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
