import { useState, useEffect } from "react";
import { format, startOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks, startOfDay, endOfDay } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Wrench, Plus, X, MapPin } from "lucide-react";
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

interface Schedule {
  id: string;
  technician_id: string;
  job_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

interface JobDetails {
  id: string;
  diagnoses: {
    problem_type: string;
  } | null;
  profiles: {
    full_name: string;
    address: string | null;
  } | null;
}

interface TechnicianCalendarProps {
  technicianId: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00

export function TechnicianCalendar({ technicianId }: TechnicianCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [jobDetails, setJobDetails] = useState<Record<string, JobDetails>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockDuration, setBlockDuration] = useState("1");
  const [blockReason, setBlockReason] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null);
  const { toast } = useToast();

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  useEffect(() => {
    loadSchedules();
  }, [technicianId, currentWeekStart]);

  const loadSchedules = async () => {
    setLoading(true);
    const weekEnd = addDays(currentWeekStart, 7);

    const { data, error } = await supabase
      .from("technician_schedules")
      .select("*")
      .eq("technician_id", technicianId)
      .gte("start_time", currentWeekStart.toISOString())
      .lt("start_time", weekEnd.toISOString())
      .order("start_time");

    if (error) {
      console.error("Error loading schedules:", error);
    } else {
      setSchedules(data || []);
      
      // Load job details for each schedule with a job_id
      const jobIds = (data || []).filter(s => s.job_id).map(s => s.job_id!);
      if (jobIds.length > 0) {
        const uniqueJobIds = [...new Set(jobIds)];
        const details: Record<string, JobDetails> = {};
        
        for (const jobId of uniqueJobIds) {
          const { data: jobData } = await supabase
            .from("jobs")
            .select("id, diagnoses(problem_type)")
            .eq("id", jobId)
            .single();
          
          if (jobData) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, address")
              .eq("id", (await supabase.from("jobs").select("user_id").eq("id", jobId).single()).data?.user_id)
              .single();
            
            details[jobId] = {
              ...jobData,
              profiles: profileData,
            } as JobDetails;
          }
        }
        setJobDetails(details);
      }
    }
    setLoading(false);
  };

  const getSchedulesForSlot = (date: Date, hour: number) => {
    return schedules.filter(schedule => {
      const start = parseISO(schedule.start_time);
      const end = parseISO(schedule.end_time);
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      
      return start < slotEnd && end > slotStart;
    });
  };

  const handleSlotClick = (date: Date, hour: number) => {
    const existingSchedules = getSchedulesForSlot(date, hour);
    if (existingSchedules.length > 0) {
      setSelectedEvent(existingSchedules[0]);
    } else {
      setSelectedSlot({ date, hour });
      setBlockDialogOpen(true);
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
      loadSchedules();
    }

    setBlockDialogOpen(false);
    setSelectedSlot(null);
    setBlockDuration("1");
    setBlockReason("");
  };

  const handleDeleteBlock = async (scheduleId: string) => {
    const { error } = await supabase
      .from("technician_schedules")
      .delete()
      .eq("id", scheduleId);

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
      loadSchedules();
    }
    setSelectedEvent(null);
  };

  const getSlotColor = (schedule: Schedule) => {
    if (schedule.status === "blocked") return "bg-gray-500/20 border-gray-500/50 text-gray-700 dark:text-gray-300";
    if (schedule.status === "completed") return "bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-300";
    if (schedule.status === "cancelled") return "bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-300";
    return "bg-primary/20 border-primary/50 text-primary";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      booked: "Prenotato",
      blocked: "Bloccato",
      completed: "Completato",
      cancelled: "Annullato",
    };
    return labels[status] || status;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
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
      </CardHeader>
      <CardContent className="p-0">
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
                  const daySchedules = getSchedulesForSlot(day, hour);
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
                        {daySchedules.map((schedule) => (
                          <motion.div
                            key={schedule.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`absolute inset-1 rounded-md border p-1 text-xs overflow-hidden ${getSlotColor(schedule)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(schedule);
                            }}
                          >
                            {schedule.job_id && jobDetails[schedule.job_id] ? (
                              <div className="truncate font-medium">
                                {jobDetails[schedule.job_id].diagnoses?.problem_type || "Lavoro"}
                              </div>
                            ) : (
                              <div className="truncate font-medium">
                                {schedule.status === "blocked" ? "🚫 Bloccato" : "Appuntamento"}
                              </div>
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

        {/* Legend */}
        <div className="p-3 border-t flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/20 border border-primary/50" />
            <span>Prenotato</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-500/20 border border-gray-500/50" />
            <span>Bloccato</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50" />
            <span>Completato</span>
          </div>
        </div>
      </CardContent>

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
            <DialogTitle>Dettagli Appuntamento</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Badge className={getSlotColor(selectedEvent)}>
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

                {selectedEvent.job_id && jobDetails[selectedEvent.job_id] && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <span>{jobDetails[selectedEvent.job_id].diagnoses?.problem_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{jobDetails[selectedEvent.job_id].profiles?.full_name}</span>
                    </div>
                    {jobDetails[selectedEvent.job_id].profiles?.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{jobDetails[selectedEvent.job_id].profiles?.address}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedEvent?.status === "blocked" && (
              <Button
                variant="destructive"
                onClick={() => handleDeleteBlock(selectedEvent.id)}
              >
                <X className="h-4 w-4 mr-2" />
                Elimina Blocco
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
