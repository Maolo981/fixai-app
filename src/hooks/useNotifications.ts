import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useNotifications(userId: string | undefined) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const { toast } = useToast();

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Non supportato",
        description: "Il tuo browser non supporta le notifiche",
        variant: "destructive",
      });
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      toast({
        title: "Notifiche attivate",
        description: "Riceverai notifiche per aggiornamenti importanti",
      });
      return true;
    } else if (result === "denied") {
      toast({
        title: "Notifiche bloccate",
        description: "Puoi attivarle nelle impostazioni del browser",
        variant: "destructive",
      });
      return false;
    }
    return false;
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (permission !== "granted") return;

    // Check if the page is visible
    if (document.hidden) {
      new Notification(title, {
        icon: "/icon-512x512.png",
        badge: "/icon-512x512.png",
        ...options,
      });
    }
  };

  // Subscribe to job status changes
  useEffect(() => {
    if (!userId || permission !== "granted") return;

    const jobsChannel = supabase
      .channel(`jobs-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newJob = payload.new as any;
          const oldJob = payload.old as any;

          if (newJob.status !== oldJob.status) {
            let statusText = "";
            switch (newJob.status) {
              case "confirmed":
                statusText = "confermato";
                break;
              case "in_progress":
                statusText = "in corso";
                break;
              case "completed":
                statusText = "completato";
                break;
              case "cancelled":
                statusText = "cancellato";
                break;
            }

            showNotification("Aggiornamento Lavoro", {
              body: `Il tuo lavoro è stato ${statusText}`,
              tag: `job-${newJob.id}`,
              requireInteraction: true,
            });
          }

          if (newJob.scheduled_date !== oldJob.scheduled_date && newJob.scheduled_date) {
            const date = new Date(newJob.scheduled_date);
            showNotification("Appuntamento Programmato", {
              body: `Nuovo appuntamento: ${date.toLocaleString("it-IT")}`,
              tag: `job-scheduled-${newJob.id}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
    };
  }, [userId, permission]);

  // Subscribe to new chat messages
  useEffect(() => {
    if (!userId || permission !== "granted") return;

    const messagesChannel = supabase
      .channel(`messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // Only show notification if message is not from current user
          if (newMessage.sender_id !== userId) {
            // Get job info to check if user is involved
            const { data: job } = await supabase
              .from("jobs")
              .select("*, technicians(full_name)")
              .eq("id", newMessage.job_id)
              .single();

            if (job && job.user_id === userId) {
              showNotification("Nuovo Messaggio", {
                body: `${job.technicians?.full_name || "Tecnico"}: ${newMessage.message.substring(0, 50)}${newMessage.message.length > 50 ? "..." : ""}`,
                tag: `message-${newMessage.id}`,
                requireInteraction: false,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [userId, permission]);

  // Check for upcoming appointments
  useEffect(() => {
    if (!userId || permission !== "granted") return;

    const checkUpcomingAppointments = async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const { data: jobs } = await supabase
        .from("jobs")
        .select("*, technicians(full_name)")
        .eq("user_id", userId)
        .eq("status", "scheduled")
        .gte("scheduled_date", now.toISOString())
        .lte("scheduled_date", tomorrow.toISOString());

      if (jobs && jobs.length > 0) {
        jobs.forEach((job: any) => {
          const scheduledDate = new Date(job.scheduled_date);
          const hoursUntil = Math.round(
            (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60)
          );

          if (hoursUntil <= 24 && hoursUntil > 0) {
            showNotification("Promemoria Appuntamento", {
              body: `Appuntamento con ${job.technicians?.full_name || "tecnico"} tra ${hoursUntil} ore`,
              tag: `reminder-${job.id}`,
              requireInteraction: true,
            });
          }
        });
      }
    };

    // Check immediately and then every hour
    checkUpcomingAppointments();
    const interval = setInterval(checkUpcomingAppointments, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId, permission]);

  return {
    permission,
    requestPermission,
    showNotification,
  };
}
