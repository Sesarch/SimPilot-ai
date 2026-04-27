ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS atc_live_frequency_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS atc_guided_scenarios_enabled boolean NOT NULL DEFAULT true;