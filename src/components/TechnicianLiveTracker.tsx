import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Car, 
  CheckCircle2,
  Phone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TechnicianLiveTrackerProps {
  jobId: string;
  userLatitude: number;
  userLongitude: number;
  technicianName?: string;
  technicianPhone?: string;
  onArrival?: () => void;
}

interface TechnicianLocation {
  latitude: number;
  longitude: number;
  updated_at: string;
  speed: number | null;
  heading: number | null;
}

type TrackingStatus = "waiting" | "en_route" | "nearby" | "arrived";

export function TechnicianLiveTracker({
  jobId,
  userLatitude,
  userLongitude,
  technicianName = "Il Tecnico",
  technicianPhone,
  onArrival,
}: TechnicianLiveTrackerProps) {
  const [location, setLocation] = useState<TechnicianLocation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [status, setStatus] = useState<TrackingStatus>("waiting");
  const [isTracking, setIsTracking] = useState(false);
  const previousDistanceRef = useRef<number | null>(null);
  const arrivedNotifiedRef = useRef(false);

  // Calculate distance using Haversine formula
  const calculateDistance = (techLat: number, techLon: number): number => {
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
    return R * c * 1000; // meters
  };

  // Calculate ETA based on speed and distance
  const calculateETA = (distanceM: number, speedMs: number | null): number | null => {
    if (!speedMs || speedMs <= 0) {
      // Assume average speed of 30 km/h in city
      const avgSpeedMs = 30 / 3.6;
      return (distanceM / avgSpeedMs) / 60; // minutes
    }
    return (distanceM / speedMs) / 60; // minutes
  };

  // Determine tracking status based on distance
  const getTrackingStatus = (distanceM: number): TrackingStatus => {
    if (distanceM <= 50) return "arrived";
    if (distanceM <= 500) return "nearby";
    return "en_route";
  };

  useEffect(() => {
    const loadLocation = async () => {
      const { data } = await supabase
        .from("technician_locations")
        .select("latitude, longitude, updated_at, speed, heading")
        .eq("job_id", jobId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setLocation(data);
        setIsTracking(true);
        const dist = calculateDistance(data.latitude, data.longitude);
        setDistance(dist);
        setEta(calculateETA(dist, data.speed));
        setStatus(getTrackingStatus(dist));
        previousDistanceRef.current = dist;
      }
    };

    loadLocation();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`live-tracker-${jobId}`)
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
          setIsTracking(true);
          
          const dist = calculateDistance(newLocation.latitude, newLocation.longitude);
          setDistance(dist);
          setEta(calculateETA(dist, newLocation.speed));
          
          const newStatus = getTrackingStatus(dist);
          setStatus(newStatus);
          
          // Trigger arrival callback
          if (newStatus === "arrived" && !arrivedNotifiedRef.current) {
            arrivedNotifiedRef.current = true;
            onArrival?.();
          }
          
          previousDistanceRef.current = dist;
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, userLatitude, userLongitude, onArrival]);

  if (!isTracking) {
    return (
      <Card className="border-muted">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <div>
              <p className="font-medium">In attesa del tecnico</p>
              <p className="text-sm">Il tracking si attiverà quando il tecnico partirà</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusConfig = () => {
    switch (status) {
      case "arrived":
        return {
          icon: CheckCircle2,
          title: "Il Tecnico è Arrivato!",
          subtitle: "Sta arrivando alla tua porta",
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          badgeVariant: "default" as const,
          badgeText: "Arrivato",
        };
      case "nearby":
        return {
          icon: MapPin,
          title: "Tecnico Nelle Vicinanze",
          subtitle: "Sta arrivando tra poco",
          color: "text-orange-500",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/30",
          badgeVariant: "secondary" as const,
          badgeText: "Vicino",
        };
      default:
        return {
          icon: Car,
          title: `${technicianName} è in viaggio`,
          subtitle: "Tracciamento in tempo reale attivo",
          color: "text-primary",
          bgColor: "bg-primary/10",
          borderColor: "border-primary/30",
          badgeVariant: "outline" as const,
          badgeText: "In viaggio",
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  // Calculate progress (0-100) based on distance, max 5km
  const progress = Math.max(0, Math.min(100, 100 - ((distance || 0) / 5000) * 100));

  // Format distance text
  const formatDistance = (meters: number): string => {
    if (meters < 100) return "Arrivato!";
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Format ETA text
  const formatETA = (minutes: number | null): string => {
    if (!minutes) return "--";
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`${config.borderColor} ${config.bgColor} overflow-hidden`}>
          <CardContent className="pt-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={status !== "arrived" ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <StatusIcon className={`h-6 w-6 ${config.color}`} />
                </motion.div>
                <div>
                  <h3 className="font-semibold">{config.title}</h3>
                  <p className="text-sm text-muted-foreground">{config.subtitle}</p>
                </div>
              </div>
              <Badge variant={config.badgeVariant}>{config.badgeText}</Badge>
            </div>

            {/* Stats Grid */}
            {status !== "arrived" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Navigation className="h-4 w-4" />
                    <span className="text-xs">Distanza</span>
                  </div>
                  <p className="text-xl font-bold">
                    {distance !== null ? formatDistance(distance) : "--"}
                  </p>
                </div>
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Arrivo stimato</span>
                  </div>
                  <p className="text-xl font-bold text-primary">
                    {formatETA(eta)}
                  </p>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="relative">
                <Progress value={progress} className="h-3" />
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ left: `${Math.min(progress, 95)}%` }}
                  animate={{ x: [0, 2, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <div className={`w-4 h-4 rounded-full ${config.bgColor} border-2 ${config.borderColor} flex items-center justify-center`}>
                    <Car className={`h-2.5 w-2.5 ${config.color}`} />
                  </div>
                </motion.div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Partenza</span>
                <span>La tua posizione</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {technicianPhone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(`tel:${technicianPhone}`, "_self")}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Chiama
                </Button>
              )}
              {location && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${userLatitude},${userLongitude}&origin=${location.latitude},${location.longitude}`,
                      "_blank"
                    );
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Mappa
                </Button>
              )}
            </div>

            {/* Last Update */}
            {location && (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <motion.div
                  className="w-2 h-2 rounded-full bg-green-500"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span>
                  Aggiornato {new Date(location.updated_at).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
