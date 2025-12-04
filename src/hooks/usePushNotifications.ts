import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const usePushNotifications = (userId: string | undefined) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const { toast } = useToast();

  useEffect(() => {
    // Verifica supporto notifiche e service worker
    const supported = "Notification" in window && "serviceWorker" in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registrato:", registration);
    } catch (error) {
      console.error("Errore registrazione Service Worker:", error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      toast({
        title: "Non supportato",
        description: "Il tuo browser non supporta le notifiche push",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        toast({
          title: "Notifiche attivate",
          description: "Riceverai notifiche per aggiornamenti importanti",
        });
        return true;
      } else {
        toast({
          title: "Notifiche disattivate",
          description: "Hai rifiutato le notifiche",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Errore richiesta permesso:", error);
      return false;
    }
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (permission !== "granted") return;

    if (document.hidden) {
      // Usa il Service Worker per notifiche in background
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: "/icon-512x512.png",
          badge: "/icon-512x512.png",
          ...options,
        });
      });
    } else {
      // Notifica diretta quando l'app è visibile
      new Notification(title, {
        icon: "/icon-512x512.png",
        ...options,
      });
    }
  };

  useEffect(() => {
    if (!userId || permission !== "granted") return;

    // Sottoscrivi aggiornamenti jobs
    const jobsChannel = supabase
      .channel("push-jobs")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const job = payload.new as any;
          const oldJob = payload.old as any;
          
          const statusConfig: Record<string, { title: string; body: string; icon?: string }> = {
            confirmed: {
              title: "✅ Prenotazione Confermata!",
              body: "Il tecnico ha accettato la tua richiesta",
            },
            en_route: {
              title: "🚗 Tecnico in Viaggio!",
              body: "Il tecnico sta arrivando da te. Traccia la sua posizione in tempo reale!",
            },
            in_progress: {
              title: "🔧 Lavoro Iniziato",
              body: "Il tecnico ha iniziato il lavoro",
            },
            completed: {
              title: "🎉 Lavoro Completato!",
              body: "Il lavoro è stato completato. Lascia una recensione!",
            },
            cancelled: {
              title: "❌ Lavoro Annullato",
              body: "Il lavoro è stato annullato",
            },
          };

          const config = statusConfig[job.status];
          if (config && job.status !== oldJob?.status) {
            sendNotification(config.title, {
              body: config.body,
              tag: `job-status-${job.id}-${job.status}`,
              data: { url: `/jobs/${job.id}` },
              requireInteraction: job.status === "en_route" || job.status === "completed",
            });
          }
        }
      )
      .subscribe();

    // Sottoscrivi nuovi preventivi
    const quotesChannel = supabase
      .channel("push-quotes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quotes",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const quote = payload.new as any;
          sendNotification("🎉 Nuovo Preventivo Ricevuto", {
            body: `Hai ricevuto un preventivo di €${quote.total_cost.toFixed(2)}`,
            tag: `quote-${quote.id}`,
            data: { url: `/jobs/${quote.job_id}` },
            badge: "/icon-512x512.png",
            requireInteraction: true,
          });
        }
      )
      .subscribe();

    // Sottoscrivi chat messages
    const messagesChannel = supabase
      .channel("push-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          const message = payload.new as any;
          if (message.sender_id === userId) return;

          const { data: job } = await supabase
            .from("jobs")
            .select("id")
            .eq("id", message.job_id)
            .eq("user_id", userId)
            .single();

          if (job) {
            sendNotification("💬 Nuovo Messaggio", {
              body: message.message.substring(0, 100),
              tag: `message-${message.id}`,
              data: { url: `/jobs/${job.id}` },
            });
          }
        }
      )
      .subscribe();

    // Sottoscrivi tracking GPS tecnico
    const locationChannel = supabase
      .channel("push-technician-location")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "technician_locations",
        },
        async (payload) => {
          const location = payload.new as any;
          
          // Verifica se è un job dell'utente
          const { data: job } = await supabase
            .from("jobs")
            .select("id, user_id, scheduled_date, status")
            .eq("id", location.job_id)
            .eq("user_id", userId)
            .single();

          if (!job || job.status !== "confirmed") return;

          // Ottieni location utente dal profilo
          const { data: profile } = await supabase
            .from("profiles")
            .select("latitude, longitude")
            .eq("id", userId)
            .single();

          if (!profile?.latitude || !profile?.longitude) return;

          // Calcola distanza (approssimativa)
          const toRad = (deg: number) => (deg * Math.PI) / 180;
          const R = 6371; // km
          const dLat = toRad(location.latitude - profile.latitude);
          const dLon = toRad(location.longitude - profile.longitude);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(profile.latitude)) *
              Math.cos(toRad(location.latitude)) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c * 1000; // metri

          // Notifiche basate sulla distanza con soglie multiple
          if (distance <= 50) {
            // Tecnico arrivato
            sendNotification("🏠 Il Tecnico è Arrivato!", {
              body: "Il tecnico è alla tua porta. Apri per farlo entrare!",
              tag: `technician-arrived-${job.id}`,
              data: { url: `/jobs/${job.id}` },
              requireInteraction: true,
            });
          } else if (distance <= 500) {
            // Tecnico nelle vicinanze
            sendNotification("📍 Tecnico Nelle Vicinanze!", {
              body: `Il tecnico è a ${Math.round(distance)}m. Arriva tra pochi minuti!`,
              tag: `technician-nearby-${job.id}`,
              data: { url: `/jobs/${job.id}` },
              requireInteraction: true,
            });
          } else if (distance <= 2000) {
            // Tecnico in avvicinamento
            const etaMinutes = location.speed && location.speed > 0 
              ? Math.round((distance / location.speed) / 60) 
              : Math.round(distance / 500); // ~30km/h avg
            
            sendNotification("🚗 Tecnico in Arrivo", {
              body: `Distanza: ${(distance/1000).toFixed(1)}km - ETA: ~${etaMinutes} min`,
              tag: `technician-approaching-${job.id}`,
              data: { url: `/jobs/${job.id}` },
            });
          }
        }
      )
      .subscribe();

    // Sottoscrivi richiesta recensione post-lavoro
    const reviewChannel = supabase
      .channel("push-review-request")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const job = payload.new as any;
          const oldJob = payload.old as any;

          // Se cambiato a completed e non ha recensione
          if (
            job.status === "completed" &&
            oldJob.status !== "completed" &&
            !job.user_rating
          ) {
            // Aspetta 1 ora prima di chiedere recensione
            setTimeout(() => {
              sendNotification("⭐ Come è andato il lavoro?", {
                body: "Lascia una recensione e aiuta altri utenti!",
                tag: `review-request-${job.id}`,
                data: { url: `/jobs/${job.id}` },
                requireInteraction: true,
              });
            }, 60 * 60 * 1000); // 1 ora
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(quotesChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(reviewChannel);
    };
  }, [userId, permission]);

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
  };
};
