
-- Track which ground school topics a user has completed
CREATE TABLE public.topic_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_id text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);

ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topic progress" ON public.topic_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topic progress" ON public.topic_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic progress" ON public.topic_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Track oral exam scores over time
CREATE TABLE public.exam_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_type text NOT NULL,
  score integer NOT NULL,
  total_questions integer NOT NULL,
  result text NOT NULL DEFAULT 'INCOMPLETE',
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exam scores" ON public.exam_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exam scores" ON public.exam_scores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
