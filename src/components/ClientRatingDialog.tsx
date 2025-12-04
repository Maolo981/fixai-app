import { useState } from "react";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ClientRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  clientName: string;
  onRatingSubmitted: () => void;
}

export function ClientRatingDialog({
  open,
  onOpenChange,
  jobId,
  clientName,
  onRatingSubmitted,
}: ClientRatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Errore",
        description: "Seleziona una valutazione con le stelle",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("jobs")
      .update({
        technician_rating: rating,
        technician_review: review || null,
      })
      .eq("id", jobId);

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile salvare la valutazione",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Valutazione inviata",
      description: "Grazie per il tuo feedback!",
    });

    setRating(0);
    setReview("");
    onOpenChange(false);
    onRatingSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Valuta il cliente</DialogTitle>
          <DialogDescription>
            Come è stata l'esperienza con {clientName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Valutazione</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="review" className="text-sm font-medium">
              Note (opzionale)
            </label>
            <Textarea
              id="review"
              placeholder="Descrivi la tua esperienza con il cliente..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Invio..." : "Invia valutazione"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
