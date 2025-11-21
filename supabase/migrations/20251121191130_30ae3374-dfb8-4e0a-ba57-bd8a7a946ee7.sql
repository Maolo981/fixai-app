-- Aggiungi policy per eliminare le proprie diagnosi
CREATE POLICY "Users can delete own diagnoses"
ON public.diagnoses
FOR DELETE
USING (auth.uid() = user_id);