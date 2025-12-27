import { useState } from "react";
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
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  AlertCircle, 
  Euro, 
  CheckCircle,
  XCircle,
  MessageCircle,
  Zap
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
  scheduled_date: string | null;
  created_at: string;
  is_urgent?: boolean;
  urgency_surcharge?: number;
  preferred_slots?: TimeSlot[];
  flexible?: boolean;
  estimated_duration?: number;
  user_notes?: string;
  diagnoses: {
    problem_type: string;
    ai_analysis: string;
    urgency_level?: string;
    estimated_cost_min?: number;
    estimated_cost_max?: number;
    estimated_time_hours?: number;
  } | null;
  profiles: {
    full_name: string;
    phone: string;
  } | null;
}

interface TechnicianJobRequestCardProps {
  job: Job;
  onJobUpdated: () => void;
  onStartChat: () => void;
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

export function TechnicianJobRequestCard({ job, onJobUpdated, onStartChat }: TechnicianJobRequestCardProps) {
  const { toast } = useToast();
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string; label: string } | null>(null);

  const preferredSlots = job.preferred_slots || [];

  const handleAcceptSlot = async (slot: TimeSlot) => {
    try {
      // Aggiorna il job con lo slot confermato
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

      // Notifica l'utente
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

      // Notifica l'utente
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

      // Notifica l'utente
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
      <Card className={job.is_urgent ? 'border-red-500 border-2 bg-red-500/5' : 'border-primary/30'}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{job.diagnoses?.problem_type}</CardTitle>
                {job.is_urgent && (
                  <Badge variant="destructive" className="bg-red-500 text-white animate-pulse">
                    <Zap className="h-3 w-3 mr-1" />
                    URGENTE
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                <User className="h-3 w-3 inline mr-1" />
                {job.profiles?.full_name}
              </p>
            </div>
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              In attesa
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dettagli problema */}
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">{job.diagnoses?.ai_analysis}</p>
            
            <div className="flex flex-wrap gap-2">
              {job.diagnoses?.urgency_level && (
                <Badge 
                  variant={
                    job.diagnoses.urgency_level === 'high' ? 'destructive' : 
                    job.diagnoses.urgency_level === 'medium' ? 'default' : 'secondary'
                  }
                >
                  Urgenza: {job.diagnoses.urgency_level === 'high' ? 'Alta' : job.diagnoses.urgency_level === 'medium' ? 'Media' : 'Bassa'}
                </Badge>
              )}
              {job.diagnoses?.estimated_time_hours && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  ~{job.diagnoses.estimated_time_hours}h
                </Badge>
              )}
              {job.diagnoses?.estimated_cost_min && job.diagnoses?.estimated_cost_max && (
                <Badge variant="outline">
                  <Euro className="h-3 w-3 mr-1" />
                  €{job.diagnoses.estimated_cost_min}-€{job.diagnoses.estimated_cost_max}
                </Badge>
              )}
            </div>
          </div>

          {/* Orari proposti dall'utente */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <Label className="text-sm font-medium">Fasce orarie richieste</Label>
            {job.flexible ? (
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                L'utente è flessibile - contattalo per qualsiasi orario
              </p>
            ) : preferredSlots.length > 0 ? (
              <div className="space-y-2 mt-2">
                {preferredSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-background rounded border"
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
                      Accetta
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Nessun orario specifico indicato</p>
            )}
          </div>

          {/* Note utente */}
          {job.user_notes && (
            <div className="border rounded-lg p-3 bg-amber-50 dark:bg-amber-950/20">
              <Label className="text-sm font-medium">Note del cliente</Label>
              <p className="text-sm mt-1">{job.user_notes}</p>
            </div>
          )}

          {/* Azioni */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onStartChat}
                className="flex-1"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Chat
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProposeDialogOpen(true)}
                className="flex-1"
              >
                <CalendarIcon className="h-4 w-4 mr-1" />
                Proponi altro orario
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRejectDialogOpen(true)}
              className="w-full text-destructive hover:text-destructive"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rifiuta richiesta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog per proporre nuovo orario */}
      <Dialog open={proposeDialogOpen} onOpenChange={setProposeDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proponi un nuovo orario</DialogTitle>
            <DialogDescription>
              Gli orari proposti dal cliente non sono disponibili. Proponi un'alternativa.
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
