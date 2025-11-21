-- Fix search_path security warning for calculate_distance function
DROP FUNCTION IF EXISTS public.calculate_distance(DECIMAL, DECIMAL, DECIMAL, DECIMAL);

CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  radius DECIMAL := 6371; -- Earth radius in km
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  -- Handle null values
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;

  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN radius * c;
END;
$$;