import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TechnicianLocationTrackerProps {
  jobId: string;
  technicianId: string;
  enabled?: boolean;
}

export function TechnicianLocationTracker({
  jobId,
  technicianId,
  enabled = true,
}: TechnicianLocationTrackerProps) {
  const [tracking, setTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled || !technicianId || !jobId) return;

    // Verifica supporto geolocalizzazione
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return;
    }

    const startTracking = () => {
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, heading, speed } = position.coords;

          try {
            // Upsert location nel database
            const { error } = await supabase.from("technician_locations").upsert(
              {
                technician_id: technicianId,
                job_id: jobId,
                latitude,
                longitude,
                heading: heading || null,
                speed: speed || null,
                accuracy: position.coords.accuracy,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "technician_id,job_id",
                ignoreDuplicates: false,
              }
            );

            if (error) throw error;

            setLastUpdate(new Date());
            setTracking(true);
          } catch (error) {
            console.error("Error updating location:", error);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setTracking(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );

      setWatchId(id);
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setTracking(false);
      }
    };
  }, [enabled, technicianId, jobId]);

  if (!enabled) return null;

  return (
    <Card className="border-primary/20">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className={`h-4 w-4 ${tracking ? "text-green-500" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium">
              GPS Tracking
            </span>
          </div>
          <Badge variant={tracking ? "default" : "secondary"}>
            {tracking ? "Attivo" : "Inattivo"}
          </Badge>
        </div>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground mt-2">
            Ultimo aggiornamento: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
