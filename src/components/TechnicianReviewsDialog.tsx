import { useEffect, useState } from "react";
import { Star, User, Calendar, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  user_rating: number;
  user_review: string | null;
  completion_date: string | null;
  created_at: string;
  user_name: string;
  problem_type: string | null;
}

interface TechnicianReviewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicianId: string;
  technicianName: string;
  technicianRating: number;
  totalJobs: number;
}

export function TechnicianReviewsDialog({
  open,
  onOpenChange,
  technicianId,
  technicianName,
  technicianRating,
  totalJobs,
}: TechnicianReviewsDialogProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    distribution: [0, 0, 0, 0, 0], // 1-5 stars
  });

  useEffect(() => {
    if (open) {
      loadReviews();
    }
  }, [open, technicianId]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_technician_reviews", {
        p_technician_id: technicianId,
      });

      if (error) throw error;

      const typedReviews = (data || []) as Review[];
      setReviews(typedReviews);

      // Calculate stats
      const distribution = [0, 0, 0, 0, 0];
      let sum = 0;
      typedReviews.forEach((review) => {
        if (review.user_rating >= 1 && review.user_rating <= 5) {
          distribution[review.user_rating - 1]++;
          sum += review.user_rating;
        }
      });

      setStats({
        total: typedReviews.length,
        average: typedReviews.length > 0 ? sum / typedReviews.length : 0,
        distribution,
      });
    } catch (error) {
      console.error("Error loading reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, size: "sm" | "lg" = "sm") => {
    const sizeClass = size === "lg" ? "h-6 w-6" : "h-4 w-4";
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getMaxDistribution = () => Math.max(...stats.distribution, 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            Recensioni di {technicianName}
          </DialogTitle>
          <DialogDescription>
            {totalJobs} lavori completati
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Rating Summary */}
            <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">
                  {stats.average.toFixed(1)}
                </div>
                {renderStars(Math.round(stats.average), "lg")}
                <div className="text-sm text-muted-foreground mt-1">
                  {stats.total} {stats.total === 1 ? "recensione" : "recensioni"}
                </div>
              </div>

              {/* Distribution Bars */}
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <div key={stars} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-muted-foreground">{stars}</span>
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all duration-500"
                        style={{
                          width: `${(stats.distribution[stars - 1] / getMaxDistribution()) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-6 text-xs text-muted-foreground text-right">
                      {stats.distribution[stars - 1]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews List */}
            <ScrollArea className="h-[300px] pr-4">
              {reviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nessuna recensione ancora</p>
                  <p className="text-sm mt-1">
                    Sii il primo a lasciare una recensione!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 border rounded-lg bg-card space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        <div>
                            <p className="font-medium text-sm">
                              {review.user_name}
                            </p>
                            {review.problem_type && (
                              <Badge variant="outline" className="text-xs mt-0.5">
                                {review.problem_type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {renderStars(review.user_rating)}
                          {review.completion_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(review.completion_date)}
                            </span>
                          )}
                        </div>
                      </div>

                      {review.user_review && (
                        <p className="text-sm text-muted-foreground pl-10">
                          "{review.user_review}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
