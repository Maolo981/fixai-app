import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useConfetti } from "@/hooks/useConfetti";
import { MobileLayout } from "@/components/MobileLayout";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  MessageCircle,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  CreditCard,
  FileText,
  DollarSign
} from "lucide-react";
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
import { ChatDialog } from "@/components/ChatDialog";
import { QuickFeedbackDialog } from "@/components/QuickFeedbackDialog";
import { QuoteRequestCard } from "@/components/QuoteRequestCard";
import { PaymentDialog } from "@/components/PaymentDialog";
import { RefundStatusCard } from "@/components/RefundStatusCard";
import { NavigationButton } from "@/components/NavigationButton";
import { TechnicianLiveTracker } from "@/components/TechnicianLiveTracker";
import { usePayments } from "@/hooks/usePayments";
import { BookingDialog } from "@/components/BookingDialog";
import { BookingSlotsDialog } from "@/components/BookingSlotsDialog";
import { TechnicianActionsCard } from "@/components/TechnicianActionsCard";
import { TechnicianProposeDialog } from "@/components/TechnicianProposeDialog";
import { TechnicianJobDetailView } from "@/components/TechnicianJobDetailView";

interface Quote {
  id: string;
  description: string;
  estimated_hours: number;
  hourly_rate: number;
  total_cost: number;
  parts_cost: number;
  notes: string | null;
  status: string;
  expires_at: string;
  technicians: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface TimeSlot {
  date: string;
  start_time: string;
  end_time: string;
  label: string;
}

interface Job {
  id: string;
  user_id: string;
  created_at: string;
  scheduled_date: string | null;
  status: string;
  payment_status: string;
  diagnosis_id: string;
  technician_id: string;
  user_rating: number | null;
  user_review: string | null;
  final_cost: number | null;
  is_urgent?: boolean;
  urgency_surcharge?: number;
  preferred_slots?: TimeSlot[];
  flexible?: boolean;
  estimated_duration?: number;
  user_notes?: string;
  confirmed_slot?: TimeSlot;
  proposed_slot?: TimeSlot;
  slot_status?: string;
  diagnoses?: {
    problem_type: string;
    urgency_level: string;
    estimated_time_hours: number;
    estimated_cost_min: number;
    estimated_cost_max: number;
    ai_analysis: string;
    image_url: string;
  };
  technicians?: {
    full_name: string;
    hourly_rate: number;
    specialties: string[];
    rating: number;
    total_jobs: number;
    avatar_url?: string;
  };
  quotes?: Quote[];
  profiles?: {
    full_name: string;
    phone?: string;
  };
}

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fireMultipleConfetti } = useConfetti();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"deposit" | "balance" | "full">("deposit");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isTechnician, setIsTechnician] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingSlotsDialogOpen, setBookingSlotsDialogOpen] = useState(false);
  const [technicianProposeDialogOpen, setTechnicianProposeDialogOpen] = useState(false);
  const [urgencyFee, setUrgencyFee] = useState(30);

  const {
    payments,
    settings,
    isDepositPaid,
    isBalancePaid,
    calculateAmounts,
    refresh: refreshPayments,
  } = usePayments(id);

  useEffect(() => {
    loadJobDetails();
    loadUrgencyFee();
    
    // Controlla se è una nuova prenotazione
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('new') === 'true') {
      setShowConfirmation(true);
      // NON aprire la chat automaticamente - il tecnico la avvierà
      // Lancia i confetti per celebrare l'invio della richiesta
      setTimeout(() => fireMultipleConfetti(), 500);
      // Rimuovi il parametro dall'URL
      window.history.replaceState({}, '', `/jobs/${id}`);
    }
    // Se è stata selezionata solo il tecnico (senza prenotazione)
    if (urlParams.get('selected') === 'true') {
      window.history.replaceState({}, '', `/jobs/${id}`);
    }
    // Se il tecnico ha avviato la chat
    if (urlParams.get('startChat') === 'true') {
      setChatDialogOpen(true);
      window.history.replaceState({}, '', `/jobs/${id}`);
    }
  }, [id]);

  const loadUrgencyFee = async () => {
    const { data } = await supabase
      .from('payment_settings')
      .select('urgency_fee')
      .limit(1)
      .maybeSingle();
    
    if (data?.urgency_fee) {
      setUrgencyFee(data.urgency_fee);
    }
  };

  const loadJobDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is a technician
      const { data: technician } = await supabase
        .from("technicians")
        .select("id")
        .eq("profile_id", session.user.id)
        .single();
      
      setIsTechnician(!!technician);

      // Load user profile for location
      const { data: profile } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.latitude && profile?.longitude) {
        setUserLocation({ latitude: profile.latitude, longitude: profile.longitude });
      }
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          diagnoses (
            problem_type,
            urgency_level,
            estimated_time_hours,
            estimated_cost_min,
            estimated_cost_max,
            ai_analysis,
            image_url
          ),
          technicians (
            full_name,
            hourly_rate,
            specialties,
            rating,
            total_jobs
          ),
          quotes!quotes_job_id_fkey (
            id,
            description,
            estimated_hours,
            hourly_rate,
            total_cost,
            parts_cost,
            notes,
            status,
            expires_at,
            technicians (full_name, avatar_url)
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw error;
      }
      
      if (!data) {
        toast({
          title: "Prenotazione non trovata",
          description: "Questa prenotazione non esiste o è stata eliminata",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // Load user profile for technician view (to get client name)
      let profilesData = null;
      if (data.user_id) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', data.user_id)
          .single();
        
        profilesData = userProfile;
      }
      
      setJob({ ...data, profiles: profilesData } as unknown as Job);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare i dettagli della prenotazione",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'technician_selected':
        return { label: 'Tecnico Selezionato', icon: User, color: 'text-blue-500' };
      case 'pending_technician_confirmation':
      case 'requested':
        return { label: 'In attesa di conferma', icon: Clock, color: 'text-blue-500' };
      case 'reschedule_proposed':
        return { label: 'Nuovo orario proposto', icon: Calendar, color: 'text-orange-500' };
      case 'rejected':
        return { label: 'Richiesta rifiutata', icon: XCircle, color: 'text-red-500' };
      case 'pending':
        return { label: 'In Attesa', icon: Clock, color: 'text-yellow-600' };
      case 'confirmed':
        return { label: 'Confermato', icon: CheckCircle, color: 'text-green-600' };
      case 'scheduled':
        return { label: 'Programmato', icon: Calendar, color: 'text-blue-600' };
      case 'en_route':
        return { label: 'In Viaggio', icon: MapPin, color: 'text-orange-500' };
      case 'in_progress':
        return { label: 'In Corso', icon: AlertCircle, color: 'text-orange-600' };
      case 'completed':
        return { label: 'Completato', icon: CheckCircle, color: 'text-green-600' };
      case 'cancelled':
        return { label: 'Annullato', icon: XCircle, color: 'text-red-600' };
      default:
        return { label: status, icon: Clock, color: 'text-gray-600' };
    }
  };

  const handleCancelJob = async () => {
    if (!cancellationReason.trim()) {
      toast({
        title: "Motivo richiesto",
        description: "Inserisci il motivo dell'annullamento",
        variant: "destructive",
      });
      return;
    }

    if (cancellationReason.trim().length < 10) {
      toast({
        title: "Motivo troppo breve",
        description: "Il motivo deve essere di almeno 10 caratteri",
        variant: "destructive",
      });
      return;
    }

    try {
      // Chiama edge function per gestire rimborso se necessario
      if (isDepositPaid()) {
        const { error: refundError } = await supabase.functions.invoke("process-refund", {
          body: { jobId: id, reason: cancellationReason.trim() },
        });

        if (refundError) {
          toast({
            title: "Errore rimborso",
            description: refundError.message,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Rimborso richiesto",
          description: "Il rimborso è stato elaborato secondo la policy",
        });
      } else {
        // Se non c'è pagamento, semplicemente annulla
        const { error } = await supabase
          .from("jobs")
          .update({
            status: "cancelled",
            cancellation_reason: cancellationReason.trim(),
          })
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Prenotazione annullata",
          description: "La prenotazione è stata annullata con successo",
        });
      }

      setCancelDialogOpen(false);
      setCancellationReason("");
      loadJobDetails();
    } catch (error: any) {
      console.error("Error cancelling job:", error);
      toast({
        title: "Errore",
        description: "Impossibile annullare la prenotazione",
        variant: "destructive",
      });
    }
  };

  const openPaymentDialog = (type: "deposit" | "balance" | "full", amount: number) => {
    setPaymentType(type);
    setPaymentAmount(amount);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    loadJobDetails();
    refreshPayments();
    toast({
      title: "Pagamento completato!",
      description: "Il pagamento è stato elaborato con successo",
    });
  };

  const handleBookingConfirm = async (appointmentDate: Date, time: string) => {
    if (!job || !job.technicians) return;

    try {
      // Get user profile for notification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Aggiorna il job con la data di prenotazione e cambia lo status a 'requested'
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'requested',
          scheduled_date: appointmentDate.toISOString(),
        })
        .eq('id', job.id);

      if (error) throw error;

      // Invia notifica al tecnico
      const formattedDate = appointmentDate.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const isUrgent = job.is_urgent;
      const urgentPrefix = isUrgent ? '🚨 URGENTE: ' : '';
      await supabase
        .from('technician_notifications')
        .insert({
          technician_id: job.technician_id,
          job_id: job.id,
          type: isUrgent ? 'urgent_booking' : 'booking_request',
          title: isUrgent ? '🚨 Richiesta URGENTE!' : 'Nuova Richiesta di Prenotazione',
          message: `${urgentPrefix}${userProfile?.full_name || 'Un cliente'} ha richiesto un appuntamento per "${job.diagnoses?.problem_type}" il ${formattedDate} alle ${time}. Avvia la chat per discutere i dettagli.`
        });

      toast({
        title: isUrgent ? "Richiesta Urgente Inviata!" : "Richiesta Inviata!",
        description: `Richiesta inviata a ${job.technicians.full_name}. Il tecnico ti contatterà in chat.`,
      });

      // Lancia confetti
      fireMultipleConfetti();
      
      setShowConfirmation(true);
      loadJobDetails();
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: "Errore",
        description: "Impossibile completare la prenotazione. Riprova.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p>Caricamento...</p>
        </div>
      </MobileLayout>
    );
  }

  if (!job) {
    return null;
  }

  // Technician view for pending requests
  const isPendingRequest = job.status === 'requested' || job.status === 'pending_technician_confirmation';
  if (isTechnician && isPendingRequest && (job.preferred_slots?.length || job.flexible)) {
    return (
      <>
        <TechnicianJobDetailView
          job={job}
          clientName={job.profiles?.full_name || "Cliente"}
          onJobUpdated={loadJobDetails}
          onOpenChat={() => setChatDialogOpen(true)}
        />
        <ChatDialog
          open={chatDialogOpen}
          onOpenChange={setChatDialogOpen}
          jobId={job.id}
          technicianName={job.technicians?.full_name || ''}
          isTechnician={isTechnician}
          technicianId={job.technician_id}
          userId={job.user_id}
        />
      </>
    );
  }

  const statusInfo = getStatusInfo(job.status);
  const StatusIcon = statusInfo.icon;

  return (
    <MobileLayout>
      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <header className="bg-card border-b sticky top-0 z-40 shadow-soft">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold">Dettagli Prenotazione</h1>
                <p className="text-xs text-muted-foreground">
                  {job.diagnoses?.problem_type}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
          {/* Schermata Richiesta Inviata - pending_technician_confirmation or requested */}
          {(job.status === 'requested' || job.status === 'pending_technician_confirmation') && (job.preferred_slots?.length || job.flexible) && (
            <Card className="border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <Clock className="h-6 w-6" />
                  Richiesta inviata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Il tecnico sta valutando la disponibilità per gli orari che hai indicato. Ti avviseremo non appena risponde.
                </p>

                {/* Riepilogo */}
                <div className="bg-background rounded-lg p-4 space-y-3 border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Problema:</span>
                    <span className="font-medium">{job.diagnoses?.problem_type}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tecnico:</span>
                    <span className="font-medium">{job.technicians?.full_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Fasce orarie:</span>
                    <span className="font-medium text-right">
                      {job.flexible ? 'Prima disponibilità' : `${job.preferred_slots?.length} proposte`}
                    </span>
                  </div>
                  {job.estimated_duration && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Durata stimata:</span>
                      <span className="font-medium">{job.estimated_duration}h</span>
                    </div>
                  )}
                  {job.diagnoses?.estimated_cost_min && job.diagnoses?.estimated_cost_max && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Costo stimato:</span>
                      <span className="font-medium">€{job.diagnoses.estimated_cost_min} - €{job.diagnoses.estimated_cost_max}</span>
                    </div>
                  )}
                </div>

                {/* Stato */}
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    In attesa di conferma dal tecnico
                  </p>
                </div>

                {/* Azioni */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setBookingSlotsDialogOpen(true)}
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Modifica orari
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setCancelDialogOpen(true)}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Annulla richiesta
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Intervento Confermato Banner */}
          {job.status === 'confirmed' && job.confirmed_slot && (
            <Card className="border-2 border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                  <CheckCircle className="h-6 w-6" />
                  Intervento confermato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Il tecnico ha confermato l'appuntamento per l'intervento.
                </p>
                <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-green-700 dark:text-green-300" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100 capitalize">
                        {job.confirmed_slot.label}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Data e ora definitiva
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Richiesta Rifiutata */}
          {job.status === 'rejected' && (
            <Card className="border-2 border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
                  <XCircle className="h-6 w-6" />
                  Richiesta rifiutata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Il tecnico non è disponibile per questo intervento. Puoi selezionare un altro professionista.
                </p>
                <Button
                  onClick={() => navigate(`/results/${job.diagnosis_id}`)}
                  className="w-full"
                >
                  <User className="h-4 w-4 mr-2" />
                  Seleziona altro tecnico
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Confirmed Banner (fallback senza confirmed_slot) */}
          {job.status === 'confirmed' && !job.confirmed_slot && (
            <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      Prenotazione Confermata!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Il tecnico ha accettato la tua richiesta.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live Tracking - Show when technician is en_route or confirmed and has location */}
          {(job.status === 'en_route' || job.status === 'confirmed' || job.status === 'in_progress') && 
           userLocation && !isTechnician && (
            <TechnicianLiveTracker
              jobId={job.id}
              userLatitude={userLocation.latitude}
              userLongitude={userLocation.longitude}
              technicianName={job.technicians?.full_name}
              onArrival={() => {
                toast({
                  title: "🏠 Il Tecnico è Arrivato!",
                  description: "Apri la porta per farlo entrare",
                });
              }}
            />
          )}

          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-8 w-8 ${statusInfo.color}`} />
                <div>
                  <CardTitle>Stato: {statusInfo.label}</CardTitle>
                  <CardDescription>
                    Creato il {new Date(job.created_at).toLocaleDateString('it-IT')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Diagnosis Image */}
          {job.diagnoses?.image_url && (
            <Card>
              <CardContent className="p-4">
                <img
                  src={job.diagnoses.image_url}
                  alt="Problema"
                  className="w-full rounded-lg"
                />
              </CardContent>
            </Card>
          )}

          {/* Diagnosis Details */}
          {job.diagnoses ? (
            <Card>
              <CardHeader>
                <CardTitle>Dettagli Diagnosi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Urgenza</span>
                  <Badge 
                    variant={
                      job.diagnoses.urgency_level === 'high' 
                        ? 'destructive' 
                        : job.diagnoses.urgency_level === 'medium'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {job.diagnoses.urgency_level === 'high' ? 'Alta' : 
                     job.diagnoses.urgency_level === 'medium' ? 'Media' : 'Bassa'}
                  </Badge>
                </div>
                {job.diagnoses.estimated_time_hours && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tempo stimato</span>
                    <span className="font-medium">{job.diagnoses.estimated_time_hours}h</span>
                  </div>
                )}
                {job.diagnoses.estimated_cost_min && job.diagnoses.estimated_cost_max && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Costo stimato</span>
                    <span className="font-medium">
                      €{job.diagnoses.estimated_cost_min} - €{job.diagnoses.estimated_cost_max}
                    </span>
                  </div>
                )}
                {job.diagnoses.ai_analysis && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground">{job.diagnoses.ai_analysis}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  Dettagli diagnosi non disponibili
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quotes Section */}
          {job.quotes && job.quotes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Preventivi Ricevuti</h2>
              {job.quotes.map((quote) => (
                <QuoteRequestCard
                  key={quote.id}
                  quote={quote}
                  onQuoteUpdated={loadJobDetails}
                />
              ))}
            </div>
          )}

          {/* Technician Details */}
          {job.technicians && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {job.status === 'technician_selected' ? 'Tecnico Selezionato' : 'Tecnico Assegnato'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {job.technicians.avatar_url ? (
                    <img 
                      src={job.technicians.avatar_url} 
                      alt={job.technicians.full_name}
                      className="h-16 w-16 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{job.technicians.full_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{job.technicians.rating}/5</span>
                      <span>•</span>
                      <span>{job.technicians.total_jobs} lavori completati</span>
                    </div>
                  </div>
                </div>
                
                {/* Status line for technician_selected */}
                {job.status === 'technician_selected' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Stato:</strong> in attesa di conferma da parte del tecnico. La richiesta non è ancora definitiva.
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tariffa oraria</span>
                    <span className="font-medium">€{job.technicians.hourly_rate}/ora</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.technicians.specialties.map((specialty, idx) => (
                      <Badge key={idx} variant="outline">{specialty}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prossimo Passo Section - quando il tecnico è selezionato ma non ancora richiesto */}
          {job.status === 'technician_selected' && job.technicians && (
            <Card className="border-2 border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  Prossimo passo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Invia la richiesta al tecnico per verificare la disponibilità e confermare l'intervento. Nessun pagamento verrà effettuato in questa fase.
                </p>
                <Button
                  onClick={() => setBookingSlotsDialogOpen(true)}
                  size="lg"
                  className="w-full"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Conferma richiesta di intervento
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  La conferma dell'intervento avverrà solo dopo l'accettazione del tecnico.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Orari Proposti Section - quando la richiesta è stata inviata con slot */}
          {job.status === 'requested' && (job.preferred_slots?.length || job.flexible) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Orari proposti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.flexible ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Prima disponibilità:</strong> Hai indicato flessibilità sugli orari. Il tecnico ti proporrà un orario disponibile.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Fasce orarie proposte:</p>
                    {job.preferred_slots?.map((slot, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                      >
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize">{slot.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {job.user_notes && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Note per il tecnico:</p>
                    <p className="text-sm">{job.user_notes}</p>
                  </div>
                )}

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>In attesa di conferma.</strong> Il tecnico confermerà uno degli orari o proporrà un'alternativa.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slot Confermato dal Tecnico */}
          {job.confirmed_slot && (
            <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-5 w-5" />
                  Appuntamento Confermato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span className="font-medium capitalize">{job.confirmed_slot.label}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Slot Proposto dal Tecnico - da accettare/rifiutare */}
          {job.proposed_slot && job.slot_status === 'proposed' && (
            <Card className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <AlertCircle className="h-5 w-5" />
                  Nuovo Orario Proposto dal Tecnico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <span className="font-medium capitalize">{job.proposed_slot.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Il tecnico non è disponibile negli orari proposti e ha suggerito questo nuovo orario.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from('jobs')
                          .update({
                            confirmed_slot: JSON.parse(JSON.stringify(job.proposed_slot)),
                            proposed_slot: null,
                            slot_status: 'confirmed',
                            status: 'confirmed'
                          } as any)
                          .eq('id', job.id);

                        if (error) throw error;

                        toast({
                          title: "Orario accettato",
                          description: "L'appuntamento è stato confermato.",
                        });
                        fireMultipleConfetti();
                        loadJobDetails();
                      } catch (error) {
                        toast({
                          title: "Errore",
                          description: "Impossibile accettare l'orario.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accetta
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from('jobs')
                          .update({
                            proposed_slot: null,
                            slot_status: 'rejected'
                          })
                          .eq('id', job.id);

                        if (error) throw error;

                        toast({
                          title: "Orario rifiutato",
                          description: "Il tecnico verrà informato. Potrai proporre nuovi orari.",
                        });
                        loadJobDetails();
                      } catch (error) {
                        toast({
                          title: "Errore",
                          description: "Impossibile rifiutare l'orario.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rifiuta
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technician Actions - Azioni operative per il tecnico */}
          {isTechnician && (job.status === 'requested' || job.status === 'pending_technician_confirmation') && (
            <TechnicianActionsCard
              job={job}
              onJobUpdated={loadJobDetails}
            />
          )}

          {/* Technician Actions - Stato reschedule_proposed */}
          {isTechnician && job.status === 'reschedule_proposed' && (
            <Card className="border-2 border-orange-300 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                  <Clock className="h-5 w-5" />
                  Proposta in attesa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Hai proposto un nuovo orario. In attesa che il cliente accetti o rifiuti.
                </p>
                {job.proposed_slot && (
                  <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <p className="text-sm font-medium capitalize">{job.proposed_slot.label}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setTechnicianProposeDialogOpen(true)}
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Modifica proposta
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from('jobs')
                          .update({
                            status: 'requested',
                            slot_status: 'pending',
                            proposed_slot: null
                          })
                          .eq('id', job.id);

                        if (error) throw error;

                        toast({
                          title: "Proposta annullata",
                          description: "Puoi ora scegliere uno degli slot proposti dal cliente.",
                        });
                        loadJobDetails();
                      } catch (error) {
                        toast({
                          title: "Errore",
                          description: "Impossibile annullare la proposta.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Annulla proposta
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Appointment Details */}
          {job.scheduled_date && (
            <Card>
              <CardHeader>
                <CardTitle>Appuntamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span>
                    {new Date(job.scheduled_date).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refund Status (if applicable) */}
          {job.payment_status === "refunded" || job.payment_status === "partially_refunded" ? (
            <RefundStatusCard jobId={job.id} />
          ) : null}

          {/* Payment Section - Enhanced */}
          {job.quotes && job.quotes.length > 0 && job.quotes[0].status === "accepted" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Pagamento</CardTitle>
                  <Badge variant={job.payment_status === "paid" ? "default" : "secondary"}>
                    {job.payment_status === "pending" ? "Da pagare" :
                     job.payment_status === "deposit_pending" ? "Anticipo richiesto" :
                     job.payment_status === "deposit_paid" ? "Anticipo pagato" :
                     job.payment_status === "balance_pending" ? "Saldo richiesto" :
                     job.payment_status === "paid" ? "Pagato" :
                     job.payment_status === "refunded" ? "Rimborsato" :
                     job.payment_status === "partially_refunded" ? "Rimborsato parzialmente" :
                     job.payment_status}
                  </Badge>
                </div>
                <CardDescription>
                  Split payment: anticipo 30% + saldo 70%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings && job.quotes[0] && (() => {
                  const totalCost = parseFloat(job.quotes[0].total_cost.toString());
                  const { deposit, balance } = calculateAmounts(totalCost);

                  return (
                    <>
                      {/* Anticipo */}
                      <div className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">Anticipo (30%)</span>
                          </div>
                          <span className="text-xl font-bold">€{deposit.toFixed(2)}</span>
                        </div>
                        {isDepositPaid() ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm">Pagato</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => openPaymentDialog("deposit", deposit)}
                            className="w-full"
                            disabled={job.status === "cancelled"}
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Paga Anticipo
                          </Button>
                        )}
                      </div>

                      {/* Saldo */}
                      <div className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">Saldo (70%)</span>
                          </div>
                          <span className="text-xl font-bold">€{balance.toFixed(2)}</span>
                        </div>
                        {isBalancePaid() ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm">Pagato</span>
                          </div>
                        ) : job.status === "completed" && isDepositPaid() ? (
                          <Button
                            onClick={() => openPaymentDialog("balance", balance)}
                            className="w-full"
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Paga Saldo
                          </Button>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Disponibile dopo il completamento del lavoro
                          </p>
                        )}
                      </div>

                      {/* Totale */}
                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Totale</span>
                          <span className="text-2xl font-bold">€{totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Invoice Section */}
          {job.status === "completed" && job.payment_status === "paid" && (
            <Card>
              <CardHeader>
                <CardTitle>Fattura Elettronica</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.functions.invoke("generate-invoice", {
                        body: { jobId: job.id },
                      });

                      if (error) throw error;

                      const blob = new Blob([data.html], { type: "text/html" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `fattura-${data.invoice.invoice_number}.html`;
                      a.click();
                      URL.revokeObjectURL(url);

                      toast({
                        title: "Fattura scaricata",
                        description: "La fattura è stata scaricata con successo",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Errore",
                        description: error.message || "Impossibile scaricare la fattura",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Scarica Fattura
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="space-y-3 pb-6">
            {/* Navigation Button for Technicians */}
            {isTechnician && job.user_id && (job.status === 'confirmed' || job.status === 'in_progress') && (
              <NavigationButton
                userId={job.user_id}
                className="w-full"
                size="lg"
              />
            )}

            {/* Complete Job Button for Technicians */}
            {isTechnician && (job.status === 'confirmed' || job.status === 'in_progress') && (
              <Button
                onClick={async () => {
                  try {
                    const { error } = await supabase
                      .from('jobs')
                      .update({
                        status: 'completed',
                        completion_date: new Date().toISOString()
                      })
                      .eq('id', job.id);

                    if (error) throw error;

                    toast({
                      title: "Lavoro Completato!",
                      description: "Il cliente potrà ora lasciare un feedback.",
                    });

                    loadJobDetails();
                  } catch (error: any) {
                    toast({
                      title: "Errore",
                      description: "Impossibile completare il lavoro",
                      variant: "destructive",
                    });
                  }
                }}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Segna come Completato
              </Button>
            )}

            {(job.status === 'requested' || job.status === 'confirmed' || job.status === 'scheduled') && !isTechnician && (
              <Button
                onClick={() => setCancelDialogOpen(true)}
                size="lg"
                variant="destructive"
                className="w-full"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Annulla Prenotazione
              </Button>
            )}

            {(job.status === 'requested' || job.status === 'pending' || job.status === 'confirmed' || job.status === 'in_progress') && job.technician_id && (
              <Button
                onClick={() => setChatDialogOpen(true)}
                size="lg"
                className="w-full"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                {isTechnician ? "Apri Chat con il Cliente" : "Apri Chat con il Tecnico"}
              </Button>
            )}

            {job.status === 'completed' && !job.user_rating && (
              <Button
                onClick={() => setReviewDialogOpen(true)}
                size="lg"
                className="w-full"
              >
                <Star className="h-5 w-5 mr-2" />
                Com'è andato?
              </Button>
            )}

            {job.user_rating && (
              <Card>
                <CardHeader>
                  <CardTitle>Il Tuo Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    {job.user_rating >= 3 ? (
                      <span className="text-green-500 font-medium flex items-center gap-2 text-lg">
                        👍 Soddisfatto
                      </span>
                    ) : (
                      <span className="text-red-500 font-medium flex items-center gap-2 text-lg">
                        👎 Non soddisfatto
                      </span>
                    )}
                  </div>
                  {job.user_review && (
                    <p className="text-sm text-muted-foreground">{job.user_review}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Dialogs */}
        <ChatDialog
          open={chatDialogOpen}
          onOpenChange={setChatDialogOpen}
          jobId={job.id}
          technicianName={job.technicians?.full_name || ''}
          isTechnician={isTechnician}
          technicianId={job.technician_id}
          userId={job.user_id}
        />

        <QuickFeedbackDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          jobId={job.id}
          technicianName={job.technicians?.full_name || ''}
          onFeedbackSubmitted={loadJobDetails}
        />

        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          jobId={job.id}
          paymentType={paymentType}
          amount={paymentAmount}
          onSuccess={handlePaymentSuccess}
        />

        {job.technicians && (
          <BookingDialog
            open={bookingDialogOpen}
            onOpenChange={setBookingDialogOpen}
            technicianName={job.technicians.full_name}
            technicianId={job.technician_id}
            technicianHourlyRate={job.technicians.hourly_rate}
            estimatedHours={job.diagnoses?.estimated_time_hours || 2}
            isUrgent={job.is_urgent}
            urgencyFee={urgencyFee}
            onConfirm={handleBookingConfirm}
          />
        )}

        <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => {
          setCancelDialogOpen(open);
          if (!open) setCancellationReason("");
        }}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Annulla prenotazione</AlertDialogTitle>
              <AlertDialogDescription>
                Per favore, spiega il motivo dell'annullamento. Il tecnico riceverà questa informazione.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-2 py-4">
              <Label htmlFor="cancellation-reason">
                Motivo dell'annullamento <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cancellation-reason"
                placeholder="Es: Ho trovato un'altra soluzione, cambio di programma, ecc..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                maxLength={500}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {cancellationReason.length}/500 caratteri (minimo 10)
              </p>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Indietro</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCancelJob} 
                disabled={cancellationReason.trim().length < 10}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Conferma Annullamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Booking Slots Dialog */}
        {job && job.technicians && job.diagnoses && (
          <BookingSlotsDialog
            open={bookingSlotsDialogOpen}
            onOpenChange={setBookingSlotsDialogOpen}
            onConfirm={async (data) => {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: userProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', user.id)
                  .single();

                // Aggiorna il job con gli slot e cambia lo stato
                const { error } = await supabase
                  .from('jobs')
                  .update({
                    status: 'requested',
                    preferred_slots: data.preferred_slots as any,
                    flexible: data.flexible,
                    estimated_duration: data.estimated_duration,
                    user_notes: data.user_notes,
                    slot_status: 'pending'
                  } as any)
                  .eq('id', job.id);

                if (error) throw error;

                // Costruisci messaggio per notifica
                let slotsMessage = '';
                if (data.flexible) {
                  slotsMessage = 'Ha indicato flessibilità sugli orari (prima disponibilità).';
                } else {
                  slotsMessage = `Orari proposti: ${data.preferred_slots.map(s => s.label).join(', ')}.`;
                }

                // Invia notifica al tecnico
                await supabase
                  .from('technician_notifications')
                  .insert({
                    technician_id: job.technician_id,
                    job_id: job.id,
                    type: 'booking_request',
                    title: 'Nuova Richiesta di Intervento',
                    message: `${userProfile?.full_name || 'Un cliente'} ha inviato una richiesta per "${job.diagnoses?.problem_type}". ${slotsMessage} Durata stimata: ${data.estimated_duration}h.${data.user_notes ? ` Note: ${data.user_notes}` : ''}`
                  });

                setBookingSlotsDialogOpen(false);
                toast({
                  title: "Richiesta inviata",
                  description: "Il tecnico confermerà uno degli orari o proporrà un'alternativa.",
                });

                fireMultipleConfetti();
                setShowConfirmation(true);
                loadJobDetails();
              } catch (error: any) {
                console.error('Error sending request:', error);
                toast({
                  title: "Errore",
                  description: "Impossibile inviare la richiesta. Riprova.",
                  variant: "destructive",
                });
              }
            }}
            technicianName={job.technicians.full_name}
            problemType={job.diagnoses.problem_type}
            urgencyLevel={job.diagnoses.urgency_level}
            estimatedCostMin={job.diagnoses.estimated_cost_min}
            estimatedCostMax={job.diagnoses.estimated_cost_max}
            estimatedTimeHours={job.diagnoses.estimated_time_hours}
          />
        )}

        {/* Technician Propose Dialog (for modifying existing proposal) */}
        <TechnicianProposeDialog
          open={technicianProposeDialogOpen}
          onOpenChange={setTechnicianProposeDialogOpen}
          jobId={job.id}
          userId={job.user_id}
          onProposed={loadJobDetails}
        />
      </div>
    </MobileLayout>
  );
};

export default JobDetails;
