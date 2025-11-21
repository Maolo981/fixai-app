-- Add location columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN location_updated_at TIMESTAMP WITH TIME ZONE;

-- Create function to calculate distance between two points using Haversine formula
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
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

-- Create function to get nearby technicians
CREATE OR REPLACE FUNCTION public.get_nearby_technicians(
  user_lat DECIMAL,
  user_lon DECIMAL,
  max_distance_km INTEGER DEFAULT 50,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  specialties TEXT[],
  hourly_rate NUMERIC,
  rating NUMERIC,
  total_jobs INTEGER,
  distance_km DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.full_name,
    t.specialties,
    t.hourly_rate,
    t.rating,
    t.total_jobs,
    calculate_distance(user_lat, user_lon, t.latitude, t.longitude) as distance_km
  FROM technicians t
  WHERE 
    t.verified = true 
    AND t.latitude IS NOT NULL 
    AND t.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lon, t.latitude, t.longitude) <= max_distance_km
  ORDER BY distance_km ASC
  LIMIT limit_count;
END;
$$;