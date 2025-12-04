-- Add new fields for technician public profile
ALTER TABLE public.technicians 
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS portfolio_images text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS service_prices jsonb DEFAULT '[]';

-- Add comments for documentation
COMMENT ON COLUMN public.technicians.bio IS 'Technician biography and service description';
COMMENT ON COLUMN public.technicians.portfolio_images IS 'Array of URLs for portfolio work images';
COMMENT ON COLUMN public.technicians.certifications IS 'JSON array of certifications with name and year';
COMMENT ON COLUMN public.technicians.service_prices IS 'JSON array of service prices with name and price';