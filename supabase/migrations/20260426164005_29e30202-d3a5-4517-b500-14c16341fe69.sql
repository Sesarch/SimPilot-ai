-- Model settings (singleton row, admin-managed)
CREATE TABLE IF NOT EXISTS public.model_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  primary_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  reviewer_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-pro',
  reviewer_enabled BOOLEAN NOT NULL DEFAULT true,
  reviewer_scope TEXT NOT NULL DEFAULT 'all', -- 'all' | 'oral_exam' | 'training' | 'off'
  guardrails_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT model_settings_singleton CHECK (id = 1)
);

INSERT INTO public.model_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.model_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read model settings"
  ON public.model_settings FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "Admins can update model settings"
  ON public.model_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_model_settings_updated_at
  BEFORE UPDATE ON public.model_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();