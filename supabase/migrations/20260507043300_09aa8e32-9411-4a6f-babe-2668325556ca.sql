-- Per-topic quiz attempt history for Ground One-on-One
CREATE TABLE public.topic_quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic_id TEXT NOT NULL,
  certificate_level TEXT,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  /* Per-question breakdown:
     [{ question, options:[a,b,c,d], correct, user_answer, acs_code, explanation }] */
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_topic_quiz_attempts_user_topic
  ON public.topic_quiz_attempts (user_id, topic_id, created_at DESC);

ALTER TABLE public.topic_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own quiz attempts"
  ON public.topic_quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own quiz attempts"
  ON public.topic_quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all quiz attempts"
  ON public.topic_quiz_attempts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));