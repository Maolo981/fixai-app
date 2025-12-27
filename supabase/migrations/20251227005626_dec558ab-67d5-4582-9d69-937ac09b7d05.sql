-- Add column to track if user has seen onboarding tour
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_seen_onboarding boolean DEFAULT false;