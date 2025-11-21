-- Function to update technician rating
CREATE OR REPLACE FUNCTION public.update_technician_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating NUMERIC;
  rated_jobs INTEGER;
BEGIN
  -- Calculate average rating and count of rated jobs for the technician
  SELECT 
    AVG(user_rating)::NUMERIC(3,2),
    COUNT(*)
  INTO avg_rating, rated_jobs
  FROM jobs
  WHERE technician_id = NEW.technician_id
    AND user_rating IS NOT NULL;
  
  -- Update technician's rating
  UPDATE technicians
  SET 
    rating = COALESCE(avg_rating, 0),
    total_jobs = (SELECT COUNT(*) FROM jobs WHERE technician_id = NEW.technician_id AND status = 'completed')
  WHERE id = NEW.technician_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to update technician rating when a job is rated
DROP TRIGGER IF EXISTS trigger_update_technician_rating ON jobs;
CREATE TRIGGER trigger_update_technician_rating
AFTER UPDATE OF user_rating ON jobs
FOR EACH ROW
WHEN (NEW.user_rating IS NOT NULL AND OLD.user_rating IS DISTINCT FROM NEW.user_rating)
EXECUTE FUNCTION public.update_technician_rating();