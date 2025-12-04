-- Create a security definer function to fetch public reviews for a technician
CREATE OR REPLACE FUNCTION public.get_technician_reviews(p_technician_id uuid)
RETURNS TABLE (
  id uuid,
  user_rating integer,
  user_review text,
  completion_date timestamp with time zone,
  created_at timestamp with time zone,
  user_name text,
  problem_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.user_rating,
    j.user_review,
    j.completion_date,
    j.created_at,
    COALESCE(p.full_name, 'Cliente') as user_name,
    d.problem_type
  FROM jobs j
  LEFT JOIN profiles p ON p.id = j.user_id
  LEFT JOIN diagnoses d ON d.id = j.diagnosis_id
  WHERE j.technician_id = p_technician_id
    AND j.user_rating IS NOT NULL
  ORDER BY j.completion_date DESC NULLS LAST;
END;
$$;