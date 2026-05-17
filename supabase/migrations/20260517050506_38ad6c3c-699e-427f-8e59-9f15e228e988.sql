
-- 1) PROFILES: drop public-SELECT policy. Owner + admin policies remain.
DROP POLICY IF EXISTS "Public can view shareable profile fields" ON public.profiles;

-- Ensure profiles_public view runs as invoker so RLS on base table applies via grants.
-- Recreate view with security_invoker so callers' privileges are used; grant SELECT to anon+authenticated.
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT user_id, display_name, avatar_url, certificate_type, flight_hours,
         bio, region, aircraft_type, rating_focus, created_at, profile_public
  FROM public.profiles
  WHERE profile_public = true;

-- The view needs to read base table; add a narrow SELECT policy permitting only shareable rows
-- via the view by allowing anon/authenticated to SELECT when profile_public is true.
-- However that would still expose all columns at base table level. Safer: grant SELECT on view to
-- anon/authenticated and add a permissive base-table policy that ONLY matches when the request
-- comes via the view? Postgres can't detect that. Instead, mark view as SECURITY DEFINER owner.
-- Use security_definer view (owned by postgres which bypasses RLS):
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = off) AS
  SELECT user_id, display_name, avatar_url, certificate_type, flight_hours,
         bio, region, aircraft_type, rating_focus, created_at, profile_public
  FROM public.profiles
  WHERE profile_public = true;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 2) MODEL_SETTINGS: restrict read to admins only.
DROP POLICY IF EXISTS "Anyone can read model settings" ON public.model_settings;
CREATE POLICY "Admins can read model settings"
ON public.model_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) AI_SAFETY_FLAGS realtime: restrict realtime.messages subscriptions to owner.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users see only their own safety flag events" ON realtime.messages';
    EXECUTE $POL$
      CREATE POLICY "Users see only their own safety flag events"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        (realtime.topic() NOT LIKE 'ai_safety_flags%')
        OR (auth.uid()::text = split_part(realtime.topic(), ':', 2))
      )
    $POL$;
  END IF;
END $$;

-- 4) USER_ACHIEVEMENTS: remove open INSERT + public SELECT; add SECURITY DEFINER award function.
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Public can view achievements" ON public.user_achievements;

-- Public profile page needs to read achievements for users whose profile is public.
CREATE POLICY "Public can view achievements of public profiles"
ON public.user_achievements
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_achievements.user_id
      AND p.profile_public = true
  )
);

-- Server-validated award function: verifies exam_score (when provided) belongs to the user,
-- recomputes percentile from get_exam_percentile, and inserts on behalf of the caller.
CREATE OR REPLACE FUNCTION public.award_achievement(
  _tier text,
  _exam_type text,
  _exam_score_id uuid DEFAULT NULL,
  _percentile_hint integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_score RECORD;
  v_pct integer;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _exam_score_id IS NOT NULL THEN
    SELECT * INTO v_score
    FROM public.exam_scores
    WHERE id = _exam_score_id AND user_id = v_user;
    IF v_score.id IS NULL THEN
      RAISE EXCEPTION 'Exam score not found for this user';
    END IF;
    SELECT percentile INTO v_pct
    FROM public.get_exam_percentile(v_score.exam_type, v_score.score, v_score.total_questions, NULL);
  ELSE
    v_pct := COALESCE(_percentile_hint, 0);
  END IF;

  INSERT INTO public.user_achievements (user_id, tier, exam_type, exam_score_id, percentile)
  VALUES (v_user, _tier, _exam_type, _exam_score_id, v_pct)
  ON CONFLICT (user_id, tier) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.award_achievement(text, text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_achievement(text, text, uuid, integer) TO authenticated;
