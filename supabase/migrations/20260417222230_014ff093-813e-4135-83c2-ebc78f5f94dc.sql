CREATE OR REPLACE FUNCTION public.get_exam_percentile(
  _exam_type TEXT,
  _score INT,
  _total INT,
  _stress_mode BOOLEAN DEFAULT NULL
)
RETURNS TABLE(
  sample_size INT,
  at_or_below INT,
  percentile INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_pct NUMERIC;
BEGIN
  IF _total <= 0 THEN
    RETURN QUERY SELECT 0::INT, 0::INT, 0::INT;
    RETURN;
  END IF;

  user_pct := (_score::NUMERIC / _total::NUMERIC) * 100;

  RETURN QUERY
  WITH peers AS (
    SELECT (es.score::NUMERIC / NULLIF(es.total_questions, 0)::NUMERIC) * 100 AS pct
    FROM public.exam_scores es
    WHERE es.exam_type = _exam_type
      AND es.total_questions > 0
      AND es.result <> 'INCOMPLETE'
      AND (_stress_mode IS NULL OR es.stress_mode = _stress_mode)
  )
  SELECT
    COUNT(*)::INT AS sample_size,
    COUNT(*) FILTER (WHERE pct <= user_pct)::INT AS at_or_below,
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE pct <= user_pct)::NUMERIC / COUNT(*)::NUMERIC) * 100)::INT
    END AS percentile
  FROM peers;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_exam_percentile(TEXT, INT, INT, BOOLEAN) TO anon, authenticated;