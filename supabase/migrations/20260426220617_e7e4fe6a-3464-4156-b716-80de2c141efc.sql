ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS google_site_verification text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS bing_site_verification text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS google_search_console_property_url text DEFAULT '' NOT NULL;