import { useState } from "react";
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface QuickFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  technicianName: string;
  onFeedbackSubmitted: () => void;
}

export function QuickFeedbackDialog({
  open,
  onOpenChange,
  jobId,
  technicianName,
  onFeedbackSubmitted,
}: QuickFeedbackDialogProps) {
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null);
  const [showExpandedReview, setShowExpandedReview] = useState(false);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleQuickFeedback = async (type: "positive" | "negative") => {
    setFeedback(type);
    
    // Auto-submit after short delay if no expansion
    if (!showExpandedReview) {
      setTimeout(async () => {
        await submitFeedback(type, "");
      }, 500);
    }
  };

  const submitFeedback = async (
    feedbackType: "positive" | "negative",
    reviewText: string
  ) => {
    setIsSubmitting(true);

    // Map thumbs to rating: positive = 5, negative = 1
    const rating = feedbackType === "positive" ? 5 : 1;

    const { error } = await supabase
      .from("jobs")
      .update({
        user_rating: rating,
        user_review: reviewText || null,
      })
      .eq("id", jobId);

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile salvare il feedback",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: feedbackType === "positive" ? "Grazie! 🎉" : "Feedback ricevuto",
      description:
        feedbackType === "positive"
          ? "Siamo felici che sia andato tutto bene!"
          : "Ci dispiace, faremo meglio la prossima volta.",
    });

    resetAndClose();
    onFeedbackSubmitted();
  };

  const handleExpandedSubmit = async () => {
    if (!feedback) {
      toast({
        title: "Seleziona un feedback",
        description: "Indica se sei soddisfatto o meno",
        variant: "destructive",
      });
      return;
    }
    await submitFeedback(feedback, review);
  };

  const resetAndClose = () => {
    setFeedback(null);
    setShowExpandedReview(false);
    setReview("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl">Soddisfatto?</DialogTitle>
          <DialogDescription>
            Com'è andato il lavoro con {technicianName}?
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Quick Thumbs Feedback */}
          <div className="flex justify-center gap-8">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickFeedback("positive")}
              disabled={isSubmitting}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                feedback === "positive"
                  ? "bg-green-500/20 ring-2 ring-green-500"
                  : "hover:bg-muted"
              }`}
            >
              <div
                className={`p-4 rounded-full transition-colors ${
                  feedback === "positive"
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <ThumbsUp className="h-8 w-8" />
              </div>
              <span
                className={`text-sm font-medium ${
                  feedback === "positive" ? "text-green-500" : "text-muted-foreground"
                }`}
              >
                Sì!
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleQuickFeedback("negative")}
              disabled={isSubmitting}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                feedback === "negative"
                  ? "bg-red-500/20 ring-2 ring-red-500"
                  : "hover:bg-muted"
              }`}
            >
              <div
                className={`p-4 rounded-full transition-colors ${
                  feedback === "negative"
                    ? "bg-red-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <ThumbsDown className="h-8 w-8" />
              </div>
              <span
                className={`text-sm font-medium ${
                  feedback === "negative" ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                No
              </span>
            </motion.button>
          </div>

          {/* Expand Button */}
          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExpandedReview(!showExpandedReview)}
              className="text-muted-foreground"
            >
              {showExpandedReview ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Chiudi dettagli
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Vuoi aggiungere un commento?
                </>
              )}
            </Button>
          </div>

          {/* Expanded Review Section */}
          <AnimatePresence>
            {showExpandedReview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 space-y-4">
                  <Textarea
                    placeholder="Raccontaci la tua esperienza..."
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={resetAndClose}
                      disabled={isSubmitting}
                    >
                      Annulla
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleExpandedSubmit}
                      disabled={isSubmitting || !feedback}
                    >
                      {isSubmitting ? "Invio..." : "Invia"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submitting indicator */}
          {isSubmitting && !showExpandedReview && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-sm text-muted-foreground mt-4"
            >
              Invio in corso...
            </motion.p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
