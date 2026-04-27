-- Add trial tracking columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Backfill all existing users: fresh 7-day trial starting now
UPDATE public.profiles
SET trial_started_at = now(),
    trial_ends_at = now() + INTERVAL '7 days'
WHERE trial_ends_at IS NULL;

-- Update the new-user trigger to set trial dates on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, trial_started_at, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    now(),
    now() + INTERVAL '7 days'
  );
  RETURN NEW;
END;
$function$;