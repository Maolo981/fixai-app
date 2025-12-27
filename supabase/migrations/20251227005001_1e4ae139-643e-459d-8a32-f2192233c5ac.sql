-- Add new AI diagnosis fields to diagnoses table
ALTER TABLE public.diagnoses
ADD COLUMN IF NOT EXISTS input_text text,
ADD COLUMN IF NOT EXISTS input_images text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS ai_probability integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_risk text,
ADD COLUMN IF NOT EXISTS ai_steps text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- Add comment for documentation
COMMENT ON COLUMN public.diagnoses.ai_probability IS 'AI confidence probability 0-100';
COMMENT ON COLUMN public.diagnoses.ai_risk IS 'Risk description if user delays repair';
COMMENT ON COLUMN public.diagnoses.ai_steps IS 'Array of typical intervention steps';
COMMENT ON COLUMN public.diagnoses.status IS 'draft/completed/assigned/booked/in_progress/done';