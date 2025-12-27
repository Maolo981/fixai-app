-- Add new columns to jobs table for booking slots flow
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS preferred_slots jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS flexible boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS estimated_duration numeric DEFAULT 2,
ADD COLUMN IF NOT EXISTS user_notes text,
ADD COLUMN IF NOT EXISTS confirmed_slot jsonb,
ADD COLUMN IF NOT EXISTS proposed_slot jsonb,
ADD COLUMN IF NOT EXISTS slot_status text DEFAULT 'pending';

-- Add comment for documentation
COMMENT ON COLUMN public.jobs.preferred_slots IS 'Array of preferred time slots: [{date, start_time, end_time}]';
COMMENT ON COLUMN public.jobs.flexible IS 'If true, user accepts first available slot';
COMMENT ON COLUMN public.jobs.confirmed_slot IS 'The slot confirmed by technician: {date, start_time, end_time}';
COMMENT ON COLUMN public.jobs.proposed_slot IS 'Alternative slot proposed by technician: {date, start_time, end_time}';