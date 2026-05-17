ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS social_facebook_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_instagram_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_youtube_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_x_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_linkedin_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_tiktok_url text NOT NULL DEFAULT '';