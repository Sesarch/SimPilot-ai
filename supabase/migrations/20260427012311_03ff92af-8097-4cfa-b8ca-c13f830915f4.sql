CREATE TABLE public.mock_oral_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'private',
  focus_area TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_oral_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mock oral sessions"
ON public.mock_oral_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own mock oral sessions"
ON public.mock_oral_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own mock oral sessions"
ON public.mock_oral_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own mock oral sessions"
ON public.mock_oral_sessions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all mock oral sessions"
ON public.mock_oral_sessions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_mock_oral_sessions_user_scheduled
  ON public.mock_oral_sessions (user_id, scheduled_at);

CREATE TRIGGER update_mock_oral_sessions_updated_at
BEFORE UPDATE ON public.mock_oral_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();