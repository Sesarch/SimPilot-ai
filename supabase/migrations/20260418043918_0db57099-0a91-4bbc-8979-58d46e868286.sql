ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_public boolean NOT NULL DEFAULT true;

DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT
  user_id,
  display_name,
  avatar_url,
  certificate_type,
  flight_hours,
  bio,
  region,
  aircraft_type,
  rating_focus,
  created_at,
  profile_public
FROM public.profiles;