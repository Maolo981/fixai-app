import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface TechnicianDistanceIndicatorProps {
  jobId: string;
  userLatitude: number;
  userLongitude: number;
}

interface TechnicianLocation {
  latitude: number;
  longitude: number;
  updated_at: string;
  speed: number | null;
}

export function TechnicianDistanceIndicator({
  jobId,
  userLatitude,
  userLongitude,
}: TechnicianDistanceIndicatorProps) {
  const [location, setLocation] = useState<TechnicianLocation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);

  useEffect(() => {
    // Carica posizione iniziale
    const loadLocation = async () => {
      const { data } = await supabase
        .from("technician_locations")
        .select("latitude, longitude, updated_at, speed")
        .eq("job_id", jobId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setLocation(data);
        calculateDistance(data.latitude, data.longitude);
        if (data.speed) {
          calculateETA(data.latitude, data.longitude, data.speed);
        }
      }
    };

    loadLocation();

    // Sottoscrivi aggiornamenti realtime
    const channel = supabase
      .channel(`technician-location-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "technician_locations",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const newLocation = payload.new as TechnicianLocation;
          setLocation(newLocation);
          calculateDistance(newLocation.latitude, newLocation.longitude);
          if (newLocation.speed) {
            calculateETA(newLocation.latitude, newLocation.longitude, newLocation.speed);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, userLatitude, userLongitude]);

  const calculateDistance = (techLat: number, techLon: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(techLat - userLatitude);
    const dLon = toRad(techLon - userLongitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(userLatitude)) *
        Math.cos(toRad(techLat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    setDistance(distanceKm * 1000); // converti in metri
  };

  const calculateETA = (techLat: number, techLon: number, speedMs: number) => {
    if (distance === null || speedMs <= 0) return;
    
    const speedKmh = speedMs * 3.6; // converti m/s in km/h
    const distanceKm = distance / 1000;
    const etaHours = distanceKm / speedKmh;
    setEta(etaHours * 60); // minuti
  };

  if (!location || distance === null) return null;

  const distanceText =
    distance < 100
      ? "È arrivato!"
      : distance < 1000
      ? `${Math.round(distance)}m di distanza`
      : `${(distance / 1000).toFixed(1)}km di distanza`;

  const progress = Math.max(0, Math.min(100, 100 - (distance / 5000) * 100));

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary animate-pulse" />
            <div>
              <p className="font-semibold">Il Tecnico Sta Arrivando</p>
              <p className="text-sm text-muted-foreground">{distanceText}</p>
            </div>
          </div>
          {eta && eta < 60 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">ETA</p>
              <p className="text-lg font-bold text-primary">
                {Math.round(eta)}min
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Tracciamento attivo
            </span>
            <span>
              Aggiornato {new Date(location.updated_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
