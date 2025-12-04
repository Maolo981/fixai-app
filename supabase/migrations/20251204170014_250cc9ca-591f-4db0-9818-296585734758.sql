-- Add urgency fields to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS is_urgent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS urgency_surcharge numeric DEFAULT 0;

-- Add urgency_fee to payment_settings
ALTER TABLE public.payment_settings
ADD COLUMN IF NOT EXISTS urgency_fee numeric DEFAULT 30;