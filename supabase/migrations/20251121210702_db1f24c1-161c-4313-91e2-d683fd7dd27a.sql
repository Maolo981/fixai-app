-- Create quotes table for custom technician quotes
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  estimated_hours NUMERIC NOT NULL,
  hourly_rate NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  parts_cost NUMERIC DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotes
CREATE POLICY "Users can view quotes for their jobs"
  ON public.quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Technicians can view their quotes"
  ON public.quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM technicians
      WHERE technicians.profile_id = auth.uid()
      AND technicians.id = quotes.technician_id
    )
  );

CREATE POLICY "Technicians can create quotes for their jobs"
  ON public.quotes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM technicians t
      JOIN jobs j ON j.technician_id = t.id
      WHERE t.profile_id = auth.uid()
      AND t.id = quotes.technician_id
      AND j.id = quotes.job_id
    )
  );

CREATE POLICY "Users can update quote status"
  ON public.quotes FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add quote_id to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id);

-- Enable realtime for quotes
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;