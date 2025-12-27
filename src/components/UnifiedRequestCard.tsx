import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  User, 
  AlertCircle, 
  Euro, 
  MessageCircle,
  Zap,
  MapPin,
  ChevronRight,
  Calendar as CalendarIcon
} from "lucide-react";

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
  onStartChat: () => void;
}

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    requested: { label: "Richiesto", variant: "secondary" },
    pending_technician_confirmation: { label: "In attesa", variant: "secondary" },
    reschedule_proposed: { label: "Proposto", variant: "default" },
    confirmed: { label: "Confermato", variant: "default" },
    rejected: { label: "Rifiutato", variant: "destructive" },
  };
  return statusMap[status] || { label: status, variant: "secondary" };
};

const getUrgencyLabel = (urgency?: string) => {
  if (!urgency) return null;
  const map: Record<string, string> = {
    high: "Alta",
    medium: "Media",
    low: "Bassa"
  };
  return map[urgency] || urgency;
};

export function UnifiedRequestCard({ job, onStartChat }: UnifiedRequestCardProps) {
  const navigate = useNavigate();
  const statusInfo = getStatusBadge(job.status);
  const preferredSlots = job.preferred_slots || [];
  const specialty = job.diagnoses?.recommended_specialty || "Tecnico";

  return (
    <Card className={job.is_urgent ? 'border-destructive border-2 bg-destructive/5' : 'border-border'}>
      <CardHeader className="pb-3">
        {/* Header: nome cliente + categoria + badge stato */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{job.profiles?.full_name || "Cliente"}</span>
            <Badge variant="outline" className="shrink-0 text-xs">
              {specialty}
            </Badge>
          </div>
          <Badge variant={statusInfo.variant} className="shrink-0">
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Problema + urgenza inline */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <p className="text-sm font-medium flex-1">{job.diagnoses?.problem_type}</p>
            {job.is_urgent && (
              <Badge variant="destructive" className="animate-pulse shrink-0">
                <Zap className="h-3 w-3 mr-1" />
                URGENTE
              </Badge>
            )}
          </div>
          
          {/* Meta info row */}
          <div className="flex flex-wrap gap-2 text-xs">
            {job.diagnoses?.urgency_level && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                Urgenza: {getUrgencyLabel(job.diagnoses.urgency_level)}
              </span>
            )}
            {job.diagnoses?.estimated_time_hours && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                ~{job.diagnoses.estimated_time_hours}h
              </span>
            )}
            {job.diagnoses?.estimated_cost_min && job.diagnoses?.estimated_cost_max && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Euro className="h-3 w-3" />
                €{job.diagnoses.estimated_cost_min}-€{job.diagnoses.estimated_cost_max}
              </span>
            )}
          </div>
        </div>

        {/* Fasce orarie richieste */}
        <div className="border rounded-lg p-2.5 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            Fasce orarie richieste
          </p>
          {job.flexible ? (
            <p className="text-sm text-primary">
              Utente flessibile – prima disponibilità
            </p>
          ) : preferredSlots.length > 0 ? (
            <div className="space-y-1">
              {preferredSlots.slice(0, 3).map((slot, index) => (
                <p key={index} className="text-sm capitalize">
                  {slot.label}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nessun orario specifico</p>
          )}
        </div>

        {/* Footer CTA */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onStartChat();
            }}
            className="flex-none"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(`/jobs/${job.id}`)}
            className="flex-1"
          >
            Gestisci
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
