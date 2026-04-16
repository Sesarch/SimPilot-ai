
CREATE TABLE public.site_settings (
  id integer PRIMARY KEY DEFAULT 1,
  maintenance_mode boolean NOT NULL DEFAULT false,
  announcement text NOT NULL DEFAULT '',
  signup_enabled boolean NOT NULL DEFAULT true,
  chat_enabled boolean NOT NULL DEFAULT true,
  ground_school_enabled boolean NOT NULL DEFAULT true,
  weather_enabled boolean NOT NULL DEFAULT true,
  live_tools_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed the single row
INSERT INTO public.site_settings (id) VALUES (1);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for maintenance mode check etc)
CREATE POLICY "Anyone can read site settings"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can update
CREATE POLICY "Admins can update site settings"
ON public.site_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
