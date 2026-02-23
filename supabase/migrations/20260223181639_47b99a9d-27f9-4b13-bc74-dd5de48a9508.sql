
-- Add new Italian-named columns to existing diagnoses table
ALTER TABLE public.diagnoses
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS user_description text,
  ADD COLUMN IF NOT EXISTS tipo_problema text,
  ADD COLUMN IF NOT EXISTS descrizione_problema text,
  ADD COLUMN IF NOT EXISTS gravita text,
  ADD COLUMN IF NOT EXISTS gravita_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS azioni_immediate text,
  ADD COLUMN IF NOT EXISTS preventivo_min decimal,
  ADD COLUMN IF NOT EXISTS preventivo_max decimal,
  ADD COLUMN IF NOT EXISTS tempo_stimato text,
  ADD COLUMN IF NOT EXISTS professionista_necessario text,
  ADD COLUMN IF NOT EXISTS note_aggiuntive text,
  ADD COLUMN IF NOT EXISTS professional_id uuid,
  ADD COLUMN IF NOT EXISTS matched_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS completion_photo_url text,
  ADD COLUMN IF NOT EXISTS final_price decimal,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';

-- Add constraint for gravita_score range
ALTER TABLE public.diagnoses
  ADD CONSTRAINT chk_gravita_score CHECK (gravita_score >= 0 AND gravita_score <= 10);

-- Create updated_at trigger for diagnoses
CREATE OR REPLACE TRIGGER update_diagnoses_updated_at
  BEFORE UPDATE ON public.diagnoses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create diagnosis-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('diagnosis-photos', 'diagnosis-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for diagnosis-photos
CREATE POLICY "Authenticated users can upload diagnosis photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'diagnosis-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view diagnosis photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'diagnosis-photos');

CREATE POLICY "Users can delete own diagnosis photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'diagnosis-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add RLS policy for professionals to see pending diagnoses
CREATE POLICY "Professionals can view pending diagnoses"
ON public.diagnoses FOR SELECT
USING (
  status = 'pending' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_technician = true
  )
);

-- Professionals can view diagnoses assigned to them
CREATE POLICY "Professionals can view assigned diagnoses"
ON public.diagnoses FOR SELECT
USING (professional_id = auth.uid());

-- Allow updating diagnoses (for status changes, assignment, etc.)
CREATE POLICY "Users can update own diagnoses"
ON public.diagnoses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Professionals can update assigned diagnoses"
ON public.diagnoses FOR UPDATE
USING (professional_id = auth.uid());
