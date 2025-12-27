import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, isBefore, startOfDay, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
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
  Clock, 
  User, 
  Euro, 
  MessageCircle,
  Zap,
  Calendar as CalendarIcon,
  CalendarCheck,
  CalendarClock,
  XCircle,
  Sparkles,
  CheckCircle
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
    recommended_specialty?: string;
  } | null;
  profiles: {
    full_name: string;
    phone: string;
  } | null;
}

interface UnifiedRequestCardProps {
  job: Job;
  technicianHourlyRate?: number;
  onStartChat: () => void;
  onJobUpdated?: () => void;
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

export function UnifiedRequestCard({ 
  job, 
  technicianHourlyRate = 35,
  onStartChat,
  onJobUpdated 
}: UnifiedRequestCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string; label: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const preferredSlots = job.preferred_slots || [];
  const estimatedDuration = job.estimated_duration || job.diagnoses?.estimated_time_hours || 2;
  const estimatedCompensation = technicianHourlyRate * estimatedDuration;

  const handleProposeNewSlot = async () => {
    if (!selectedDate || !selectedSlot) {
      toast({
        title: "Seleziona un orario",
        description: "Devi selezionare data e orario prima di proporre",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
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
      onJobUpdated?.();
    } catch (error) {
      console.error('Error proposing slot:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare la proposta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'rejected',
          slot_status: 'rejected',
          cancellation_reason: rejectReason || null
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
      setRejectReason("");
      onJobUpdated?.();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Errore",
        description: "Impossibile rifiutare la richiesta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className={cn(
        "overflow-hidden transition-all",
        job.is_urgent 
          ? "border-destructive border-2 bg-gradient-to-br from-destructive/5 to-transparent" 
          : "border-border hover:border-primary/50"
      )}>
        <CardContent className="p-4 space-y-3">
          {/* Header con tipo intervento e urgenza */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base truncate">
                  {job.diagnoses?.problem_type}
                </h3>
                {job.is_urgent && (
                  <Badge variant="destructive" className="animate-pulse shrink-0">
                    <Zap className="h-3 w-3 mr-1" />
                    URGENTE
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <User className="h-3.5 w-3.5" />
                <span>{job.profiles?.full_name}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: it })}
              </p>
            </div>
          </div>

          {/* Info sintetiche in griglia */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Durata</p>
                <p className="font-medium">{estimatedDuration}h</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Euro className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Compenso</p>
                <p className="font-medium">~€{estimatedCompensation}</p>
              </div>
            </div>
          </div>

          {/* Disponibilità richiesta */}
          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Disponibilità</span>
            </div>
            {job.flexible ? (
              <div className="flex items-center gap-1.5 text-sm text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Cliente flessibile</span>
              </div>
            ) : preferredSlots.length > 0 ? (
              <p className="text-sm text-muted-foreground capitalize truncate">
                {preferredSlots[0].label}
                {preferredSlots.length > 1 && ` +${preferredSlots.length - 1}`}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Nessun orario specifico</p>
            )}
          </div>

          {/* Azioni primarie */}
          <div className="space-y-2 pt-1">
            <Button
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="w-full"
              size="default"
            >
              <CalendarCheck className="h-4 w-4 mr-2" />
              Accetta e scegli orario
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setProposeDialogOpen(true);
                }}
              >
                <CalendarClock className="h-4 w-4 mr-1.5" />
                Proponi
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectDialogOpen(true);
                }}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Rifiuta
              </Button>
            </div>

            {/* Azione secondaria - Chat */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStartChat();
              }}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat con il cliente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog per proporre nuovo orario */}
      <Dialog open={proposeDialogOpen} onOpenChange={setProposeDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proponi un nuovo orario</DialogTitle>
            <DialogDescription>
              Seleziona data e orario da proporre al cliente.
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposeDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleProposeNewSlot}
              disabled={!selectedDate || !selectedSlot || isLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Invia proposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog conferma rifiuto con motivazione */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rifiuta richiesta</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rifiutare questa richiesta? L'utente potrà selezionare un altro tecnico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-reason">Motivazione (opzionale)</Label>
            <Textarea
              id="reject-reason"
              placeholder="Es: Non disponibile in questa zona, troppo impegnato questa settimana..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectRequest}
              disabled={isLoading}
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
