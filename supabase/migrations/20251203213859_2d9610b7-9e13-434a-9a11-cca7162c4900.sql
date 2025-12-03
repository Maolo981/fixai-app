-- Create technician_notifications table
CREATE TABLE public.technician_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'booking_request', 'message', 'payment', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technician_notifications ENABLE ROW LEVEL SECURITY;

-- Technicians can view their own notifications
CREATE POLICY "Technicians can view own notifications"
ON public.technician_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM technicians
    WHERE technicians.id = technician_notifications.technician_id
    AND technicians.profile_id = auth.uid()
  )
);

-- Technicians can update (mark as read) their own notifications
CREATE POLICY "Technicians can update own notifications"
ON public.technician_notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM technicians
    WHERE technicians.id = technician_notifications.technician_id
    AND technicians.profile_id = auth.uid()
  )
);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.technician_notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.technician_notifications;