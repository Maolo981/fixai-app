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
          const statusMessages: Record<string, string> = {
            confirmed: "Il tuo lavoro è stato confermato dal tecnico!",
            in_progress: "Il tecnico ha iniziato il lavoro",
            completed: "Il lavoro è stato completato! Lascia una recensione",
            cancelled: "Il lavoro è stato annullato",
          };

          if (statusMessages[job.status]) {
            sendNotification("Aggiornamento Lavoro", {
              body: statusMessages[job.status],
              tag: `job-${job.id}`,
              data: { url: `/jobs/${job.id}` },
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
          sendNotification("Nuovo Preventivo Ricevuto", {
            body: `Hai ricevuto un preventivo di €${quote.total_cost.toFixed(2)}`,
            tag: `quote-${quote.id}`,
            data: { url: `/jobs/${quote.job_id}` },
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
            sendNotification("Nuovo Messaggio", {
              body: message.message.substring(0, 100),
              tag: `message-${message.id}`,
              data: { url: `/jobs/${job.id}` },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(quotesChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [userId, permission]);

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
  };
};
