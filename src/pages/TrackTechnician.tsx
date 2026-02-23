import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useTrackTechnician } from "@/hooks/useTrackTechnician";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Star,
  Navigation,
  Clock,
  MapPin,
  CheckCircle2,
  Wrench,
  CreditCard,
  Timer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  waiting: { label: "In attesa", color: "text-muted-foreground", bgColor: "bg-muted" },
  en_route: { label: "In arrivo", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  nearby: { label: "Nelle vicinanze", color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  arrived: { label: "È arrivato", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  working: { label: "Lavoro in corso", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  completed: { label: "Completato", color: "text-green-700", bgColor: "bg-green-100 dark:bg-green-900/30" },
};

const formatDistance = (meters: number | null): string => {
  if (meters == null) return "--";
  if (meters < 100) return "Arrivato!";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const formatETA = (minutes: number | null): string => {
  if (minutes == null) return "--";
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}min`;
};

export default function TrackTechnician() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { coordinates } = useGeolocation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const techMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const routeLayerAdded = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [workTimer, setWorkTimer] = useState(0);
  const workTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    technicianPosition,
    status,
    distance,
    eta,
    isTracking,
    technicianInfo,
    jobStatus,
  } = useTrackTechnician(jobId, coordinates?.latitude ?? null, coordinates?.longitude ?? null);

  const cfg = statusConfig[status] || statusConfig.waiting;

  // Work timer
  useEffect(() => {
    if (status === "working") {
      workTimerRef.current = setInterval(() => setWorkTimer((t) => t + 1), 1000);
    } else {
      if (workTimerRef.current) clearInterval(workTimerRef.current);
      setWorkTimer(0);
    }
    return () => {
      if (workTimerRef.current) clearInterval(workTimerRef.current);
    };
  }, [status]);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !coordinates) return;

    const initMap = async () => {
      try {
        const { data } = await supabase.functions.invoke("get-mapbox-token");
        if (!data?.token) return;

        mapboxgl.accessToken = data.token;

        const map = new mapboxgl.Map({
          container: mapContainer.current!,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [coordinates.longitude, coordinates.latitude],
          zoom: 14,
          attributionControl: false,
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

        // User marker (blue)
        const userEl = document.createElement("div");
        userEl.innerHTML = `
          <div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
            <div style="width:16px;height:16px;background:hsl(221,83%,53%);border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
            <div style="position:absolute;width:32px;height:32px;background:hsl(221,83%,53%,0.2);border-radius:50%;animation:pulse 2s infinite;"></div>
          </div>
        `;
        userMarkerRef.current = new mapboxgl.Marker(userEl)
          .setLngLat([coordinates.longitude, coordinates.latitude])
          .addTo(map);

        map.on("load", () => setMapReady(true));
        mapRef.current = map;
      } catch (e) {
        console.error("Map init error:", e);
      }
    };

    initMap();
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [coordinates]);

  // Update technician marker
  useEffect(() => {
    if (!mapRef.current || !mapReady || !technicianPosition) return;

    const map = mapRef.current;
    const { latitude, longitude } = technicianPosition;

    if (!techMarkerRef.current) {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="width:44px;height:44px;position:relative;">
          <div style="width:44px;height:44px;background:hsl(25,95%,53%);border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <div style="position:absolute;width:52px;height:52px;top:-4px;left:-4px;background:hsl(25,95%,53%,0.25);border-radius:50%;animation:pulse 1.5s infinite;"></div>
        </div>
      `;
      techMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([longitude, latitude])
        .addTo(map);
    } else {
      techMarkerRef.current.setLngLat([longitude, latitude]);
    }

    // Draw route line
    if (coordinates) {
      const routeCoords = [
        [coordinates.longitude, coordinates.latitude],
        [longitude, latitude],
      ];

      if (map.getSource("route")) {
        (map.getSource("route") as mapboxgl.GeoJSONSource).setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: routeCoords },
        });
      } else if (map.isStyleLoaded()) {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: routeCoords },
          },
        });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "hsl(25, 95%, 53%)",
            "line-width": 4,
            "line-dasharray": [2, 1],
          },
        });
      }

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([coordinates.longitude, coordinates.latitude]);
      bounds.extend([longitude, latitude]);
      map.fitBounds(bounds, { padding: 80, maxZoom: 16 });
    }
  }, [technicianPosition, mapReady, coordinates]);

  // Add pulse keyframe
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@keyframes pulse{0%{transform:scale(1);opacity:0.6}50%{transform:scale(1.4);opacity:0}100%{transform:scale(1);opacity:0.6}}`;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col relative bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-area-top">
        <div className="flex items-center gap-3 p-3 bg-background/90 backdrop-blur-md border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {technicianInfo && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={technicianInfo.avatarUrl || undefined} />
                <AvatarFallback>{technicianInfo.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{technicianInfo.fullName}</p>
                {technicianInfo.specialties.length > 0 && (
                  <Badge variant="secondary" className="text-xs mt-0.5">
                    {technicianInfo.specialties[0]}
                  </Badge>
                )}
              </div>
            </div>
          )}
          <Badge className={`${cfg.bgColor} ${cfg.color} border-0 shrink-0`}>
            {cfg.label}
          </Badge>
        </div>

        {/* ETA bar */}
        {isTracking && status !== "completed" && status !== "working" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-4 px-4 py-2 bg-primary/10 backdrop-blur-md"
          >
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{formatETA(eta)}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <Navigation className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{formatDistance(distance)}</span>
            </div>
          </motion.div>
        )}

        {status === "working" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 backdrop-blur-md"
          >
            <Timer className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-mono font-semibold text-blue-600">{formatTimer(workTimer)}</span>
            <span className="text-xs text-blue-500">lavoro in corso</span>
          </motion.div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1">
        {!coordinates ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : (
          <div ref={mapContainer} className="w-full h-full" />
        )}
      </div>

      {/* Bottom Sheet */}
      <AnimatePresence>
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="absolute bottom-0 left-0 right-0 z-10 safe-area-bottom"
        >
          <Card className="rounded-b-none rounded-t-2xl shadow-2xl border-t">
            <CardContent className="pt-4 pb-6 space-y-4">
              {/* Handle */}
              <div className="flex justify-center">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>

              {/* Technician info */}
              {technicianInfo && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={technicianInfo.avatarUrl || undefined} />
                      <AvatarFallback className="text-lg">{technicianInfo.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{technicianInfo.fullName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span>{technicianInfo.rating.toFixed(1)}</span>
                        <span>·</span>
                        <span>{technicianInfo.totalJobs} interventi</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Distance & ETA cards */}
              {isTracking && status !== "completed" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <Navigation className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-lg font-bold">{formatDistance(distance)}</p>
                    <p className="text-xs text-muted-foreground">Distanza</p>
                  </div>
                  <div className="bg-primary/5 rounded-xl p-3 text-center">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold text-primary">
                      {status === "working" ? formatTimer(workTimer) : formatETA(eta)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {status === "working" ? "Tempo lavoro" : "ETA"}
                    </p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {status === "completed" ? (
                  <Button
                    className="flex-1"
                    onClick={() => navigate(`/jobs/${jobId}`)}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Conferma e Paga
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/jobs/${jobId}?startChat=true`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        if (technicianInfo?.phone) {
                          window.open(`tel:${technicianInfo.phone}`, "_self");
                        }
                      }}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Chiama
                    </Button>
                  </>
                )}
              </div>

              {/* Not tracking message */}
              {!isTracking && (
                <div className="text-center text-sm text-muted-foreground py-2">
                  <MapPin className="h-5 w-5 mx-auto mb-1" />
                  In attesa che il tecnico avvii il tracking...
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
