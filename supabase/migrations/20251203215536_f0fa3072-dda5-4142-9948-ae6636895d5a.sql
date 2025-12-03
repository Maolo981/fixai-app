
-- Create table to track technician busy slots
CREATE TABLE public.technician_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked', -- booked, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technician_schedules ENABLE ROW LEVEL SECURITY;

-- Everyone can view schedules (to check availability)
CREATE POLICY "Anyone can view technician schedules"
  ON public.technician_schedules
  FOR SELECT
  USING (true);

-- Technicians can manage their own schedules
CREATE POLICY "Technicians can manage own schedules"
  ON public.technician_schedules
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM technicians
    WHERE technicians.id = technician_schedules.technician_id
    AND technicians.profile_id = auth.uid()
  ));

-- System can insert schedules (for booking flow)
CREATE POLICY "System can insert schedules"
  ON public.technician_schedules
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_technician_schedules_technician_time 
  ON public.technician_schedules(technician_id, start_time, end_time);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_schedules;
