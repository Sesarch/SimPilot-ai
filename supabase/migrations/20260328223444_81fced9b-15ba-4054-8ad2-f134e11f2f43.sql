ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS aircraft_type text,
  ADD COLUMN IF NOT EXISTS rating_focus text,
  ADD COLUMN IF NOT EXISTS region text;