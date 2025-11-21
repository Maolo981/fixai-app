import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface TechnicianForMap {
  id: string;
  full_name: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  hourly_rate: number;
  rating: number;
  distance_km?: number;
  total_jobs?: number;
}

interface TechnicianMapProps {
  userLocation: { latitude: number; longitude: number };
  technicians: TechnicianForMap[];
  onTechnicianSelect?: (technician: TechnicianForMap) => void;
}

export function TechnicianMap({
  userLocation,
  technicians,
  onTechnicianSelect,
}: TechnicianMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    const initMap = async () => {
      if (!mapContainer.current) return;

      try {
        // Get Mapbox token from edge function
        const { data, error } = await supabase.functions.invoke(
          "get-mapbox-token"
        );

        if (error) throw error;

        mapboxgl.accessToken = data.token;

        // Initialize map centered on user location
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [userLocation.longitude, userLocation.latitude],
          zoom: 12,
        });

        // Add navigation controls
        map.current.addControl(
          new mapboxgl.NavigationControl(),
          "top-right"
        );

        // Add user location marker
        const userMarker = document.createElement("div");
        userMarker.className = "w-8 h-8 bg-primary rounded-full border-4 border-white shadow-lg";
        
        new mapboxgl.Marker(userMarker)
          .setLngLat([userLocation.longitude, userLocation.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              '<div class="p-2"><strong>La tua posizione</strong></div>'
            )
          )
          .addTo(map.current);

        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing map:", error);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      map.current?.remove();
    };
  }, [userLocation]);

  useEffect(() => {
    if (!map.current || isLoading) return;

    // Clear existing technician markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add technician markers
    technicians.forEach((tech) => {
      if (!map.current) return;

      const el = document.createElement("div");
      el.className = "cursor-pointer";
      el.innerHTML = `
        <div class="relative">
          <div class="w-10 h-10 bg-secondary rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-secondary-foreground">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-white text-xs flex items-center justify-center font-bold">
            ${tech.rating.toFixed(1)}
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-3 min-w-[200px]">
          <h3 class="font-semibold text-base mb-2">${tech.full_name}</h3>
          <div class="space-y-1 text-sm">
            <div class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>${tech.rating.toFixed(1)} stelle</span>
            </div>
            <div class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>${tech.distance_km.toFixed(1)} km di distanza</span>
            </div>
            <div class="text-primary font-semibold">€${tech.hourly_rate}/ora</div>
            <div class="text-xs text-muted-foreground mt-2">
              ${tech.specialties.join(", ")}
            </div>
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([tech.longitude, tech.latitude])
        .setPopup(popup)
        .addTo(map.current);

      el.addEventListener("click", () => {
        if (onTechnicianSelect) {
          onTechnicianSelect(tech);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    if (technicians.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([userLocation.longitude, userLocation.latitude]);
      technicians.forEach((tech) => {
        bounds.extend([tech.longitude, tech.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [technicians, isLoading, userLocation, onTechnicianSelect]);

  if (isLoading) {
    return (
      <div className="w-full h-[500px] rounded-lg overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute top-4 left-4 bg-card p-3 rounded-lg shadow-md">
        <div className="text-sm font-semibold mb-2">Legenda</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded-full"></div>
            <span>La tua posizione</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-secondary rounded-full"></div>
            <span>Tecnici disponibili</span>
          </div>
        </div>
      </div>
    </div>
  );
}
