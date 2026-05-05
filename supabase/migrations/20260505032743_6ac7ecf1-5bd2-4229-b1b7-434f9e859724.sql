
CREATE TABLE public.error_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  session_id TEXT,
  release TEXT,
  environment TEXT NOT NULL DEFAULT 'production',
  source TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  stack TEXT,
  component_stack TEXT,
  url TEXT,
  route TEXT,
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  status_code INTEGER,
  endpoint TEXT,
  fingerprint TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_error_events_created ON public.error_events (created_at DESC);
CREATE INDEX idx_error_events_fingerprint ON public.error_events (fingerprint);
CREATE INDEX idx_error_events_user ON public.error_events (user_id);
CREATE INDEX idx_error_events_source ON public.error_events (source);
CREATE INDEX idx_error_events_route ON public.error_events (route);

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert error events"
  ON public.error_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view error events"
  ON public.error_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete error events"
  ON public.error_events FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
