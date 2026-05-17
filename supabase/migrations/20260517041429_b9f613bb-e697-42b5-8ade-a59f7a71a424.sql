
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_accepted_ip text,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS target_rating text,
  ADD COLUMN IF NOT EXISTS lifetime_access_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS lifetime_target_passed_at timestamptz;
