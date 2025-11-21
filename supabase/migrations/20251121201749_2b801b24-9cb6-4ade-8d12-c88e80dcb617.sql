-- Elimina la vecchia funzione e ricreala con avatar_url
DROP FUNCTION IF EXISTS public.get_nearby_technicians(numeric, numeric, integer, integer);

CREATE FUNCTION public.get_nearby_technicians(user_lat numeric, user_lon numeric, max_distance_km integer DEFAULT 50, limit_count integer DEFAULT 10)
 RETURNS TABLE(id uuid, full_name text, specialties text[], hourly_rate numeric, rating numeric, total_jobs integer, distance_km numeric, avatar_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.full_name,
    t.specialties,
    t.hourly_rate,
    t.rating,
    t.total_jobs,
    calculate_distance(user_lat, user_lon, t.latitude, t.longitude) as distance_km,
    t.avatar_url
  FROM technicians t
  WHERE 
    t.verified = true 
    AND t.latitude IS NOT NULL 
    AND t.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lon, t.latitude, t.longitude) <= max_distance_km
  ORDER BY t.rating DESC, t.total_jobs DESC, distance_km ASC
  LIMIT limit_count;
END;
$function$;