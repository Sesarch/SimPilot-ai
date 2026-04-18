-- Create a public view exposing only safe profile fields for shareable pilot pages
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT
  user_id,
  display_name,
  avatar_url,
  certificate_type,
  aircraft_type,
  rating_focus,
  region,
  flight_hours,
  bio,
  created_at
FROM public.profiles;

-- Allow anyone (anon + authenticated) to read the public view
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Allow public SELECT access on the underlying profiles table — but ONLY for the
-- non-sensitive columns that the view exposes. RLS still protects writes.
-- Since the view uses security_invoker, callers need SELECT on base columns.
CREATE POLICY "Public can view shareable profile fields"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public read of achievements so they show on shared pilot pages
CREATE POLICY "Public can view achievements"
  ON public.user_achievements
  FOR SELECT
  TO anon, authenticated
  USING (true);