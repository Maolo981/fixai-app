-- Add INSERT policy for technicians to allow users to register as technicians
CREATE POLICY "Users can register as technicians"
  ON public.technicians FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Also allow technicians to view their own profile even if not verified yet
CREATE POLICY "Technicians can view own profile"
  ON public.technicians FOR SELECT
  USING (profile_id = auth.uid());