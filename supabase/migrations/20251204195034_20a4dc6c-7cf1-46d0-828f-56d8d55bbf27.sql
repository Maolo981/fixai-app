-- Add technician's rating of user to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS technician_rating integer CHECK (technician_rating >= 1 AND technician_rating <= 5),
ADD COLUMN IF NOT EXISTS technician_review text;

-- Create a function to get user statistics for technicians
CREATE OR REPLACE FUNCTION public.get_user_stats(p_user_id uuid)
RETURNS TABLE(
  average_rating numeric,
  total_jobs integer,
  completed_jobs integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(j.technician_rating)::numeric(3,2), 0) as average_rating,
    COUNT(*)::integer as total_jobs,
    COUNT(*) FILTER (WHERE j.status = 'completed')::integer as completed_jobs
  FROM jobs j
  WHERE j.user_id = p_user_id;
END;
$$;