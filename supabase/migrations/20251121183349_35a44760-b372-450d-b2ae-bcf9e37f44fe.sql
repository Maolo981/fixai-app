-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

-- Create index for faster queries
CREATE INDEX idx_chat_messages_job_id ON public.chat_messages(job_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for their own jobs
CREATE POLICY "Users can view messages for their jobs"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = chat_messages.job_id
    AND jobs.user_id = auth.uid()
  )
);

-- Policy: Technicians can view messages for their jobs
CREATE POLICY "Technicians can view messages for their jobs"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    JOIN public.technicians ON technicians.id = jobs.technician_id
    WHERE jobs.id = chat_messages.job_id
    AND technicians.profile_id = auth.uid()
  )
);

-- Policy: Users can send messages for their own jobs
CREATE POLICY "Users can send messages for their jobs"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = chat_messages.job_id
    AND jobs.user_id = auth.uid()
  )
);

-- Policy: Technicians can send messages for their jobs
CREATE POLICY "Technicians can send messages for their jobs"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.jobs
    JOIN public.technicians ON technicians.id = jobs.technician_id
    WHERE jobs.id = chat_messages.job_id
    AND technicians.profile_id = auth.uid()
  )
);

-- Policy: Users can mark their received messages as read
CREATE POLICY "Users can mark messages as read"
ON public.chat_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = chat_messages.job_id
    AND jobs.user_id = auth.uid()
    AND chat_messages.sender_id != auth.uid()
  )
);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;