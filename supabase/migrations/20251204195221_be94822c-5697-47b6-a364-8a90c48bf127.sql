-- Allow technicians to update jobs they are assigned to (for rating clients)
CREATE POLICY "Technicians can update their assigned jobs"
ON public.jobs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM technicians
    WHERE technicians.profile_id = auth.uid()
    AND technicians.id = jobs.technician_id
  )
);