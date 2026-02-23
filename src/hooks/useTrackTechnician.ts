import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TechnicianPosition {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  updatedAt: string;
}

type TrackingStatus = "waiting" | "en_route" | "nearby" | "arrived" | "working" | "completed";

interface UseTrackTechnicianReturn {
  technicianPosition: TechnicianPosition | null;
  status: TrackingStatus;
  distance: number | null;
  eta: number | null;
  isTracking: boolean;
  technicianInfo: {
    fullName: string;
    specialties: string[];
    rating: number;
    totalJobs: number;
    avatarUrl: string | null;
    phone: string | null;
  } | null;
  jobStatus: string | null;
}

const calculateDistanceMeters = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calculateETA = (distanceM: number, speedMs: number | null): number => {
  const speed = speedMs && speedMs > 0 ? speedMs : 30 / 3.6; // default 30 km/h
  return distanceM / speed / 60; // minutes
};

const getStatus = (distanceM: number, jobStatus: string | null): TrackingStatus => {
  if (jobStatus === "completed") return "completed";
  if (jobStatus === "in_progress") return "working";
  if (distanceM <= 50) return "arrived";
  if (distanceM <= 500) return "nearby";
  return "en_route";
};

export function useTrackTechnician(
  jobId: string | undefined,
  userLatitude: number | null,
  userLongitude: number | null
): UseTrackTechnicianReturn {
  const [position, setPosition] = useState<TechnicianPosition | null>(null);
  const [status, setStatus] = useState<TrackingStatus>("waiting");
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [technicianInfo, setTechnicianInfo] = useState<UseTrackTechnicianReturn["technicianInfo"]>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);

  const updateFromLocation = useCallback(
    (loc: { latitude: number; longitude: number; heading: number | null; speed: number | null; updated_at: string }) => {
      const pos: TechnicianPosition = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        heading: loc.heading,
        speed: loc.speed,
        updatedAt: loc.updated_at,
      };
      setPosition(pos);
      setIsTracking(true);

      if (userLatitude != null && userLongitude != null) {
        const dist = calculateDistanceMeters(userLatitude, userLongitude, loc.latitude, loc.longitude);
        setDistance(dist);
        setEta(calculateETA(dist, loc.speed));
        setStatus(getStatus(dist, jobStatus));
      }
    },
    [userLatitude, userLongitude, jobStatus]
  );

  // Load technician info and initial location
  useEffect(() => {
    if (!jobId) return;

    const loadData = async () => {
      // Load job with technician info
      const { data: job } = await supabase
        .from("jobs")
        .select("status, technician_id, technicians(full_name, specialties, rating, total_jobs, avatar_url)")
        .eq("id", jobId)
        .single();

      if (job) {
        setJobStatus(job.status);
        const tech = job.technicians as any;
        if (tech) {
          setTechnicianInfo({
            fullName: tech.full_name,
            specialties: tech.specialties || [],
            rating: tech.rating || 0,
            totalJobs: tech.total_jobs || 0,
            avatarUrl: tech.avatar_url || null,
            phone: null,
          });
        }
      }

      // Load latest location
      const { data: loc } = await supabase
        .from("technician_locations")
        .select("latitude, longitude, heading, speed, updated_at")
        .eq("job_id", jobId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (loc) {
        updateFromLocation(loc);
      }
    };

    loadData();
  }, [jobId, updateFromLocation]);

  // Realtime subscription for location updates
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`track-tech-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "technician_locations",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const newLoc = payload.new as any;
          if (newLoc) updateFromLocation(newLoc);
        }
      )
      .subscribe();

    // Also subscribe to job status changes
    const jobChannel = supabase
      .channel(`track-job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const newJob = payload.new as any;
          if (newJob?.status) {
            setJobStatus(newJob.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(jobChannel);
    };
  }, [jobId, updateFromLocation]);

  // Update status when jobStatus changes
  useEffect(() => {
    if (distance != null) {
      setStatus(getStatus(distance, jobStatus));
    }
  }, [jobStatus, distance]);

  return { technicianPosition: position, status, distance, eta, isTracking, technicianInfo, jobStatus };
}
