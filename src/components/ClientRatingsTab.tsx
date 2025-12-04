import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface ClientStats {
  user_id: string;
  full_name: string;
  average_rating: number;
  total_jobs: number;
  completed_jobs: number;
}

interface ClientRatingsTabProps {
  technicianId: string;
}

export function ClientRatingsTab({ technicianId }: ClientRatingsTabProps) {
  const [clients, setClients] = useState<ClientStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientRatings();
  }, [technicianId]);

  const loadClientRatings = async () => {
    setLoading(true);

    // Get all jobs for this technician with user info
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("user_id, technician_rating, status")
      .eq("technician_id", technicianId);

    if (error || !jobs) {
      setLoading(false);
      return;
    }

    // Group by user_id and calculate stats
    const userStatsMap = new Map<string, {
      total_jobs: number;
      completed_jobs: number;
      ratings: number[];
    }>();

    jobs.forEach((job) => {
      const existing = userStatsMap.get(job.user_id) || {
        total_jobs: 0,
        completed_jobs: 0,
        ratings: [],
      };
      existing.total_jobs++;
      if (job.status === "completed") existing.completed_jobs++;
      if (job.technician_rating) existing.ratings.push(job.technician_rating);
      userStatsMap.set(job.user_id, existing);
    });

    // Get profile info for each user
    const userIds = Array.from(userStatsMap.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const clientsWithStats: ClientStats[] = userIds.map((userId) => {
      const stats = userStatsMap.get(userId)!;
      const profile = profiles?.find((p) => p.id === userId);
      const avgRating = stats.ratings.length > 0
        ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length
        : 0;

      return {
        user_id: userId,
        full_name: profile?.full_name || "Cliente",
        average_rating: Math.round(avgRating * 10) / 10,
        total_jobs: stats.total_jobs,
        completed_jobs: stats.completed_jobs,
      };
    });

    // Sort by rating (lowest first to highlight problematic clients)
    clientsWithStats.sort((a, b) => {
      // Put unrated at the end
      if (a.average_rating === 0 && b.average_rating > 0) return 1;
      if (b.average_rating === 0 && a.average_rating > 0) return -1;
      return a.average_rating - b.average_rating;
    });

    setClients(clientsWithStats);
    setLoading(false);
  };

  const getRatingBadge = (rating: number) => {
    if (rating === 0) {
      return <Badge variant="secondary">Non valutato</Badge>;
    }
    if (rating < 3) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Problematico
        </Badge>
      );
    }
    if (rating >= 4) {
      return (
        <Badge variant="default" className="bg-green-500 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Ottimo
        </Badge>
      );
    }
    return <Badge variant="secondary">Nella media</Badge>;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nessun cliente trovato</p>
        <p className="text-sm text-muted-foreground mt-1">
          I clienti appariranno qui dopo i lavori completati
        </p>
      </div>
    );
  }

  const problematicClients = clients.filter((c) => c.average_rating > 0 && c.average_rating < 3);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-sm text-muted-foreground">Clienti Totali</p>
          </CardContent>
        </Card>
        <Card className={problematicClients.length > 0 ? "border-red-500/30 bg-red-500/5" : ""}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{problematicClients.length}</div>
            <p className="text-sm text-muted-foreground">Da Monitorare</p>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <div className="space-y-3">
        <h3 className="font-semibold">Tutti i Clienti</h3>
        {clients.map((client) => (
          <Card
            key={client.user_id}
            className={
              client.average_rating > 0 && client.average_rating < 3
                ? "border-red-500/30 bg-red-500/5"
                : ""
            }
          >
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{client.full_name}</p>
                  <div className="flex items-center gap-2">
                    {client.average_rating > 0 ? (
                      <>
                        {renderStars(Math.round(client.average_rating))}
                        <span className="text-sm text-muted-foreground">
                          ({client.average_rating.toFixed(1)})
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Non ancora valutato
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {client.completed_jobs}/{client.total_jobs} lavori completati
                  </p>
                </div>
                <div>{getRatingBadge(client.average_rating)}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
