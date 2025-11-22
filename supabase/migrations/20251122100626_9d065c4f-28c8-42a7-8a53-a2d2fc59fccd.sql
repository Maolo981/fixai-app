-- Aggiungi una policy per permettere agli utenti di vedere i tecnici dei loro job
CREATE POLICY "Users can view technicians for their jobs"
ON technicians
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.technician_id = technicians.id
    AND jobs.user_id = auth.uid()
  )
);