ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS bridge_direct_download_enabled boolean NOT NULL DEFAULT false;