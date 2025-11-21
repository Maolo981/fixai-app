import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: string;
  user_id: string;
  diagnoses: {
    problem_type: string;
  } | null;
}

interface CreateQuoteDialogProps {
  job: Job | null;
  technicianId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuoteCreated: () => void;
}

export function CreateQuoteDialog({
  job,
  technicianId,
  open,
  onOpenChange,
  onQuoteCreated,
}: CreateQuoteDialogProps) {
  const [description, setDescription] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const calculateTotal = () => {
    const hours = parseFloat(estimatedHours) || 0;
    const rate = parseFloat(hourlyRate) || 0;
    const parts = parseFloat(partsCost) || 0;
    return hours * rate + parts;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || !technicianId) return;

    setLoading(true);

    const { error } = await supabase.from("quotes").insert({
      job_id: job.id,
      technician_id: technicianId,
      user_id: job.user_id,
      description,
      estimated_hours: parseFloat(estimatedHours),
      hourly_rate: parseFloat(hourlyRate),
      parts_cost: parseFloat(partsCost) || 0,
      total_cost: calculateTotal(),
      notes,
      status: "pending",
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile creare il preventivo",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Successo",
        description: "Preventivo inviato al cliente",
      });
      resetForm();
      onQuoteCreated();
    }
  };

  const resetForm = () => {
    setDescription("");
    setEstimatedHours("");
    setHourlyRate("");
    setPartsCost("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crea Preventivo Personalizzato</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Descrizione Lavoro</Label>
            <Textarea
              id="description"
              placeholder="Descrivi dettagliatamente il lavoro da svolgere..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hours">Ore Stimate</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0.5"
                placeholder="2.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="rate">Tariffa Oraria (€)</Label>
              <Input
                id="rate"
                type="number"
                step="1"
                min="1"
                placeholder="50"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="parts">Costo Materiali (€)</Label>
            <Input
              id="parts"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              value={partsCost}
              onChange={(e) => setPartsCost(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Note Aggiuntive</Label>
            <Textarea
              id="notes"
              placeholder="Informazioni extra per il cliente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Totale Preventivo:</span>
              <span className="text-2xl font-bold text-primary">
                €{calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Invio..." : "Invia Preventivo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
