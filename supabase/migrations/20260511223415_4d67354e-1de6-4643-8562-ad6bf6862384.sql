ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_plan TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;