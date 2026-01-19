-- Fix security issues for technicians, technician_schedules, and payment_settings tables

-- 1. TECHNICIANS TABLE: Create a public view that hides sensitive data
-- Drop any existing view first
DROP VIEW IF EXISTS public.technicians_public;

-- Create a view that exposes only non-sensitive data (no GPS coordinates, no hourly_rate, no total_jobs)
CREATE VIEW public.technicians_public
WITH (security_invoker = on) AS
SELECT 
  id,
  full_name,
  rating,
  specialties,
  verified,
  avatar_url,
  bio,
  availability_status,
  portfolio_images,
  service_radius_km
FROM public.technicians
WHERE verified = true;

-- Now update RLS policies for technicians table
-- Remove the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view verified technicians" ON public.technicians;

-- Add policy: Authenticated users can view verified technicians for job searches
CREATE POLICY "Authenticated users can view verified technicians"
ON public.technicians
FOR SELECT
TO authenticated
USING (verified = true);

-- 2. TECHNICIAN_SCHEDULES: Remove public access policy
DROP POLICY IF EXISTS "Anyone can view technician schedules" ON public.technician_schedules;

-- Add policy: Users can view schedules for technicians they have jobs with
CREATE POLICY "Users can view schedules for their technicians"
ON public.technician_schedules
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN technicians t ON t.id = j.technician_id
    WHERE j.user_id = auth.uid()
    AND t.id = technician_schedules.technician_id
  )
);

-- 3. PAYMENT_SETTINGS: Restrict to authenticated users only
DROP POLICY IF EXISTS "Everyone can view payment settings" ON public.payment_settings;

-- Add policy: Only authenticated users can view payment settings
CREATE POLICY "Authenticated users can view payment settings"
ON public.payment_settings
FOR SELECT
TO authenticated
USING (true);