
ALTER TABLE public.topic_quiz_attempts
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_topic_active
  ON public.topic_quiz_attempts (user_id, topic_id, created_at DESC)
  WHERE archived_at IS NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quiz_history_limit INTEGER NOT NULL DEFAULT 10
    CHECK (quiz_history_limit BETWEEN 1 AND 50);

CREATE POLICY "Users archive own quiz attempts"
  ON public.topic_quiz_attempts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.archive_old_quiz_attempts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
BEGIN
  SELECT COALESCE(quiz_history_limit, 10) INTO v_limit
  FROM public.profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  IF v_limit IS NULL THEN
    v_limit := 10;
  END IF;

  UPDATE public.topic_quiz_attempts t
  SET archived_at = now()
  WHERE t.user_id = NEW.user_id
    AND t.topic_id = NEW.topic_id
    AND t.archived_at IS NULL
    AND t.id NOT IN (
      SELECT id FROM public.topic_quiz_attempts
      WHERE user_id = NEW.user_id
        AND topic_id = NEW.topic_id
        AND archived_at IS NULL
      ORDER BY created_at DESC
      LIMIT v_limit
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_old_quiz_attempts ON public.topic_quiz_attempts;
CREATE TRIGGER trg_archive_old_quiz_attempts
AFTER INSERT ON public.topic_quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION public.archive_old_quiz_attempts();
