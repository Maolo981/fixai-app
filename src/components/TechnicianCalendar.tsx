import { useState, useEffect } from "react";
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks, startOfDay, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Wrench, X, MapPin, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  label: string;
}

interface CalendarSlot {
  id: string;
  type: 'job' | 'blocked';
  status: 'proposed' | 'confirmed' | 'busy' | 'blocked';
  start_time: string;
  end_time: string;
  job_id?: string;
  job?: {
    id: string;
    status: string;
    user_id: string;
    problem_type?: string;
    client_name?: string;
    address?: string;
    urgency_level?: string;
    estimated_duration?: number;
  };
}

interface PendingRequest {
  id: string;
  user_id: string;
  status: string;
  problem_type: string;
  client_name: string;
  urgency_level?: string;
  estimated_duration?: number;
  preferred_slots?: TimeSlot[];
  flexible?: boolean;
}

interface TechnicianCalendarProps {
  technicianId: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00

export function TechnicianCalendar({ technicianId }: TechnicianCalendarProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(() => new Date()); // For mobile single-day view
  const [calendarSlots, setCalendarSlots] = useState<CalendarSlot[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [freeSlotDialogOpen, setFreeSlotDialogOpen] = useState(false);
  const [blockDuration, setBlockDuration] = useState("1");
  const [blockReason, setBlockReason] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarSlot | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const { toast } = useToast();

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  useEffect(() => {
    loadCalendarData();
    loadPendingRequests();
  }, [technicianId, currentWeekStart]);

  const loadCalendarData = async () => {
    setLoading(true);
    const weekEnd = addDays(currentWeekStart, 7);
    const slots: CalendarSlot[] = [];

    // 1. Load blocked time from technician_schedules
    const { data: blockedData } = await supabase
      .from("technician_schedules")
      .select("*")
      .eq("technician_id", technicianId)
      .gte("start_time", currentWeekStart.toISOString())
      .lt("start_time", weekEnd.toISOString());

    (blockedData || []).forEach(block => {
      if (block.status === 'blocked') {
        slots.push({
          id: block.id,
          type: 'blocked',
          status: 'blocked',
          start_time: block.start_time,
          end_time: block.end_time,
        });
      }
    });

    // 2. Load jobs with proposed_slot (reschedule_proposed status)
    const { data: proposedJobs } = await supabase
      .from("jobs")
      .select(`
        id, status, user_id, proposed_slot, estimated_duration,
        diagnoses (problem_type, urgency_level)
      `)
      .eq("technician_id", technicianId)
      .eq("status", "reschedule_proposed");

    for (const job of proposedJobs || []) {
      if (job.proposed_slot) {
        const proposedSlot = job.proposed_slot as unknown as TimeSlot;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, address")
          .eq("id", job.user_id)
          .single();

        slots.push({
          id: `proposed-${job.id}`,
          type: 'job',
          status: 'proposed',
          start_time: `${proposedSlot.date}T${proposedSlot.start_time}:00`,
          end_time: `${proposedSlot.date}T${proposedSlot.end_time}:00`,
          job_id: job.id,
          job: {
            id: job.id,
            status: job.status,
            user_id: job.user_id,
            problem_type: job.diagnoses?.problem_type,
            client_name: profile?.full_name || 'Cliente',
            address: profile?.address,
            urgency_level: job.diagnoses?.urgency_level,
            estimated_duration: job.estimated_duration,
          }
        });
      }
    }

    // 3. Load jobs with confirmed_slot (confirmed status)
    const { data: confirmedJobs } = await supabase
      .from("jobs")
      .select(`
        id, status, user_id, confirmed_slot, scheduled_date, estimated_duration,
        diagnoses (problem_type, urgency_level)
      `)
      .eq("technician_id", technicianId)
      .eq("status", "confirmed");

    for (const job of confirmedJobs || []) {
      if (job.confirmed_slot) {
        const confirmedSlot = job.confirmed_slot as unknown as TimeSlot;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, address")
          .eq("id", job.user_id)
          .single();

        slots.push({
          id: `confirmed-${job.id}`,
          type: 'job',
          status: 'confirmed',
          start_time: `${confirmedSlot.date}T${confirmedSlot.start_time}:00`,
          end_time: `${confirmedSlot.date}T${confirmedSlot.end_time}:00`,
          job_id: job.id,
          job: {
            id: job.id,
            status: job.status,
            user_id: job.user_id,
            problem_type: job.diagnoses?.problem_type,
            client_name: profile?.full_name || 'Cliente',
            address: profile?.address,
            urgency_level: job.diagnoses?.urgency_level,
            estimated_duration: job.estimated_duration,
          }
        });
      }
    }

    // 4. Load in-progress jobs (busy)
    const { data: busyJobs } = await supabase
      .from("jobs")
      .select(`
        id, status, user_id, confirmed_slot, scheduled_date, estimated_duration,
        diagnoses (problem_type, urgency_level)
      `)
      .eq("technician_id", technicianId)
      .eq("status", "in_progress");

    for (const job of busyJobs || []) {
      if (job.confirmed_slot) {
        const confirmedSlot = job.confirmed_slot as unknown as TimeSlot;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, address")
          .eq("id", job.user_id)
          .single();

        slots.push({
          id: `busy-${job.id}`,
          type: 'job',
          status: 'busy',
          start_time: `${confirmedSlot.date}T${confirmedSlot.start_time}:00`,
          end_time: `${confirmedSlot.date}T${confirmedSlot.end_time}:00`,
          job_id: job.id,
          job: {
            id: job.id,
            status: job.status,
            user_id: job.user_id,
            problem_type: job.diagnoses?.problem_type,
            client_name: profile?.full_name || 'Cliente',
            address: profile?.address,
            urgency_level: job.diagnoses?.urgency_level,
            estimated_duration: job.estimated_duration,
          }
        });
      }
    }

    setCalendarSlots(slots);
    setLoading(false);
  };

  const loadPendingRequests = async () => {
    const { data } = await supabase
      .from("jobs")
      .select(`
        id, status, user_id, preferred_slots, flexible, estimated_duration,
        diagnoses (problem_type, urgency_level)
      `)
      .eq("technician_id", technicianId)
      .in("status", ["requested", "pending_technician_confirmation"]);

    const requests: PendingRequest[] = [];
    for (const job of data || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", job.user_id)
        .single();

      requests.push({
        id: job.id,
        user_id: job.user_id,
        status: job.status,
        problem_type: job.diagnoses?.problem_type || 'Intervento',
        client_name: profile?.full_name || 'Cliente',
        urgency_level: job.diagnoses?.urgency_level,
        estimated_duration: job.estimated_duration,
        preferred_slots: job.preferred_slots as unknown as TimeSlot[] | undefined,
        flexible: job.flexible,
      });
    }
    setPendingRequests(requests);
  };

  const getSlotsForHour = (date: Date, hour: number) => {
    return calendarSlots.filter(slot => {
      const start = parseISO(slot.start_time);
      const end = parseISO(slot.end_time);
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      
      return start < slotEnd && end > slotStart;
    });
  };

  const handleSlotClick = (date: Date, hour: number) => {
    const existingSlots = getSlotsForHour(date, hour);
    if (existingSlots.length > 0) {
      setSelectedEvent(existingSlots[0]);
    } else {
      setSelectedSlot({ date, hour });
      if (pendingRequests.length > 0) {
        setFreeSlotDialogOpen(true);
      } else {
        setBlockDialogOpen(true);
      }
    }
  };

  const handleBlockTime = async () => {
    if (!selectedSlot) return;

    const startTime = new Date(selectedSlot.date);
    startTime.setHours(selectedSlot.hour, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + parseInt(blockDuration));

    const { error } = await supabase
      .from("technician_schedules")
      .insert({
        technician_id: technicianId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: "blocked",
      });

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile bloccare lo slot",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Slot bloccato",
        description: `Hai bloccato ${blockDuration} ora/e`,
      });
      loadCalendarData();
    }

    setBlockDialogOpen(false);
    setSelectedSlot(null);
    setBlockDuration("1");
    setBlockReason("");
  };

  const handleDeleteBlock = async (slotId: string) => {
    const { error } = await supabase
      .from("technician_schedules")
      .delete()
      .eq("id", slotId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il blocco",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Blocco eliminato",
        description: "Lo slot è di nuovo disponibile",
      });
      loadCalendarData();
    }
    setSelectedEvent(null);
  };

  const handleUseSlotForRequest = async () => {
    if (!selectedSlot || !selectedRequestId) return;

    const request = pendingRequests.find(r => r.id === selectedRequestId);
    if (!request) return;

    const duration = request.estimated_duration || 2;
    const slotDate = format(selectedSlot.date, "yyyy-MM-dd");
    const startHour = String(selectedSlot.hour).padStart(2, '0');
    const endHour = String(selectedSlot.hour + duration).padStart(2, '0');

    const confirmedSlot: TimeSlot = {
      date: slotDate,
      start_time: `${startHour}:00`,
      end_time: `${endHour}:00`,
      label: `${format(selectedSlot.date, "EEEE d MMMM", { locale: it })} ${startHour}:00 - ${endHour}:00`,
    };

    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'confirmed',
          slot_status: 'confirmed',
          confirmed_slot: JSON.parse(JSON.stringify(confirmedSlot)),
          scheduled_date: `${slotDate}T${startHour}:00:00`
        } as any)
        .eq('id', selectedRequestId);

      if (error) throw error;

      await supabase
        .from('notification_logs')
        .insert({
          user_id: request.user_id,
          notification_type: 'slot_confirmed',
          reference_id: selectedRequestId
        });

      toast({
        title: "Orario confermato",
        description: `Intervento programmato: ${confirmedSlot.label}`,
      });

      setFreeSlotDialogOpen(false);
      setSelectedSlot(null);
      setSelectedRequestId(null);
      loadCalendarData();
      loadPendingRequests();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile confermare l'orario",
        variant: "destructive",
      });
    }
  };

  const getSlotStyle = (slot: CalendarSlot) => {
    switch (slot.status) {
      case 'proposed':
        return "bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300";
      case 'confirmed':
        return "bg-primary/20 border-primary/50 text-primary";
      case 'busy':
        return "bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-300";
      case 'blocked':
        return "bg-muted/50 border-muted-foreground/30 text-muted-foreground";
      default:
        return "bg-muted/30 border-border";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      proposed: "Proposto",
      confirmed: "Confermato",
      busy: "Occupato",
      blocked: "Bloccato",
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'proposed':
        return <Clock className="h-3 w-3" />;
      case 'confirmed':
        return <CheckCircle className="h-3 w-3" />;
      case 'busy':
        return <Wrench className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Mobile: navigate by day
  const goToPrevDay = () => setSelectedDay(subDays(selectedDay, 1));
  const goToNextDay = () => setSelectedDay(addDays(selectedDay, 1));
  const goToToday = () => setSelectedDay(new Date());

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2 px-3 sm:px-6">
        {isMobile ? (
          // Mobile Header - Single Day Navigation
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Calendario
              </CardTitle>
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={goToToday}>
                Oggi
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <p className="text-sm font-medium capitalize">
                  {format(selectedDay, "EEEE", { locale: it })}
                </p>
                <p className={`text-lg font-bold ${isSameDay(selectedDay, new Date()) ? "text-primary" : ""}`}>
                  {format(selectedDay, "d MMMM yyyy", { locale: it })}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextDay}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          // Desktop Header - Week Navigation
          <>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Il Mio Calendario
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                  Oggi
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(currentWeekStart, "d MMMM", { locale: it })} - {format(addDays(currentWeekStart, 6), "d MMMM yyyy", { locale: it })}
            </p>
          </>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isMobile ? (
          // Mobile: Single Day View
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {HOURS.map((hour) => {
                const daySlots = getSlotsForHour(selectedDay, hour);
                const isPast = new Date(new Date(selectedDay).setHours(hour)) < new Date();

                return (
                  <div
                    key={hour}
                    className={`flex min-h-[56px] ${isPast ? "bg-muted/20" : "active:bg-muted/30"}`}
                    onClick={() => !isPast && handleSlotClick(new Date(selectedDay), hour)}
                  >
                    <div className="w-14 flex-shrink-0 p-2 text-xs text-muted-foreground bg-muted/30 flex items-start justify-center border-r">
                      {hour}:00
                    </div>
                    <div className="flex-1 p-1.5 relative">
                      {daySlots.length > 0 ? (
                        daySlots.map((slot) => (
                          <motion.div
                            key={slot.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`rounded-lg border p-2 ${getSlotStyle(slot)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(slot);
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              {getStatusIcon(slot.status)}
                              <span className="font-medium text-sm truncate">
                                {slot.job?.problem_type || (slot.status === 'blocked' ? 'Bloccato' : 'Evento')}
                              </span>
                            </div>
                            {slot.job?.client_name && (
                              <p className="text-xs opacity-75 mt-0.5 truncate">
                                {slot.job.client_name}
                              </p>
                            )}
                          </motion.div>
                        ))
                      ) : (
                        !isPast && (
                          <span className="text-xs text-muted-foreground/50 italic">
                            Libero
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          // Desktop: Week View
          <ScrollArea className="h-[500px]">
            <div className="min-w-[600px]">
              {/* Header with days */}
              <div className="grid grid-cols-8 border-b sticky top-0 bg-background z-10">
                <div className="p-2 text-center text-xs font-medium text-muted-foreground border-r">
                  Ora
                </div>
                {weekDays.map((day, i) => (
                  <div
                    key={i}
                    className={`p-2 text-center border-r last:border-r-0 ${
                      isSameDay(day, new Date()) ? "bg-primary/10" : ""
                    }`}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {format(day, "EEE", { locale: it })}
                    </p>
                    <p className={`text-lg font-bold ${isSameDay(day, new Date()) ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </p>
                  </div>
                ))}
              </div>

              {/* Time slots */}
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b">
                  <div className="p-2 text-center text-xs text-muted-foreground border-r bg-muted/30">
                    {hour}:00
                  </div>
                  {weekDays.map((day, dayIndex) => {
                    const daySlots = getSlotsForHour(day, hour);
                    const isPast = new Date(day.setHours(hour)) < new Date();

                    return (
                      <div
                        key={dayIndex}
                        className={`relative min-h-[60px] border-r last:border-r-0 p-1 ${
                          isPast ? "bg-muted/20" : "hover:bg-muted/30 cursor-pointer"
                        } ${isSameDay(day, new Date()) ? "bg-primary/5" : ""}`}
                        onClick={() => !isPast && handleSlotClick(new Date(day), hour)}
                      >
                        <AnimatePresence>
                          {daySlots.map((slot) => (
                            <motion.div
                              key={slot.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className={`absolute inset-1 rounded-md border p-1 text-xs overflow-hidden flex flex-col ${getSlotStyle(slot)}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(slot);
                              }}
                            >
                              <div className="flex items-center gap-1">
                                {getStatusIcon(slot.status)}
                                <span className="truncate font-medium">
                                  {slot.job?.problem_type || (slot.status === 'blocked' ? 'Bloccato' : 'Evento')}
                                </span>
                              </div>
                              {slot.job?.client_name && (
                                <span className="truncate text-[10px] opacity-75">
                                  {slot.job.client_name}
                                </span>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Legend */}
        <div className="p-2 sm:p-3 border-t flex flex-wrap gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-amber-500/20 border border-amber-500/50" />
            <span>Proposto</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-primary/20 border border-primary/50" />
            <span>Confermato</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-blue-500/20 border border-blue-500/50" />
            <span>Occupato</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-muted/50 border border-muted-foreground/30" />
            <span>Bloccato</span>
          </div>
        </div>
      </CardContent>

      {/* Free Slot Dialog - Use for pending request */}
      <Dialog open={freeSlotDialogOpen} onOpenChange={setFreeSlotDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usa questo orario</DialogTitle>
            <DialogDescription>
              {selectedSlot && (
                <>
                  {format(selectedSlot.date, "EEEE d MMMM", { locale: it })} alle {selectedSlot.hour}:00
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {pendingRequests.length > 0 ? (
              <>
                <Label>Seleziona una richiesta da confermare:</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {pendingRequests.map(request => (
                    <button
                      key={request.id}
                      onClick={() => setSelectedRequestId(request.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedRequestId === request.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{request.problem_type}</span>
                        {request.urgency_level === 'alta' && (
                          <Badge variant="destructive" className="text-xs">Urgente</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {request.client_name} • {request.estimated_duration || 2}h stimate
                      </p>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nessuna richiesta in attesa da confermare.
              </p>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setFreeSlotDialogOpen(false);
                setBlockDialogOpen(true);
              }}
            >
              Blocca invece
            </Button>
            <Button
              onClick={handleUseSlotForRequest}
              disabled={!selectedRequestId}
            >
              Conferma orario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Time Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blocca Slot</DialogTitle>
            <DialogDescription>
              {selectedSlot && (
                <>
                  {format(selectedSlot.date, "EEEE d MMMM", { locale: it })} alle {selectedSlot.hour}:00
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Durata</Label>
              <Select value={blockDuration} onValueChange={setBlockDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 ora</SelectItem>
                  <SelectItem value="2">2 ore</SelectItem>
                  <SelectItem value="3">3 ore</SelectItem>
                  <SelectItem value="4">4 ore</SelectItem>
                  <SelectItem value="8">Intera giornata</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opzionale)</Label>
              <Input
                placeholder="Es: Appuntamento personale"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleBlockTime}>
              Blocca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEvent?.status === 'blocked' ? 'Slot Bloccato' : 'Dettagli Appuntamento'}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Badge className={getSlotStyle(selectedEvent)}>
                  {getStatusLabel(selectedEvent.status)}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(parseISO(selectedEvent.start_time), "EEEE d MMMM, HH:mm", { locale: it })}
                    {" - "}
                    {format(parseISO(selectedEvent.end_time), "HH:mm", { locale: it })}
                  </span>
                </div>

                {selectedEvent.job && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEvent.job.problem_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedEvent.job.client_name}</span>
                    </div>
                    {selectedEvent.job.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEvent.job.address}</span>
                      </div>
                    )}

                    {selectedEvent.status === 'proposed' && (
                      <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg text-sm">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-amber-700 dark:text-amber-300">In attesa di risposta dal cliente</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {selectedEvent?.status === 'blocked' && (
              <Button
                variant="destructive"
                onClick={() => handleDeleteBlock(selectedEvent.id)}
              >
                <X className="h-4 w-4 mr-2" />
                Elimina Blocco
              </Button>
            )}
            {selectedEvent?.job_id && (
              <Button
                variant="outline"
                onClick={() => {
                  navigate(`/jobs/${selectedEvent.job_id}`);
                  setSelectedEvent(null);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Apri dettaglio
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
