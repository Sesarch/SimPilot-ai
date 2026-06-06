-- Phase 1: ATC Training curriculum schema

-- 1. Categories
CREATE TABLE public.atc_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  certificate_level text NOT NULL DEFAULT 'PPL',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.atc_categories TO anon, authenticated;
GRANT ALL ON public.atc_categories TO service_role;
ALTER TABLE public.atc_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read atc_categories" ON public.atc_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage atc_categories" ON public.atc_categories FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Lessons
CREATE TABLE public.atc_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.atc_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_markdown text NOT NULL,
  example_transmission text,
  example_response text,
  display_order integer NOT NULL DEFAULT 0,
  certificate_level text NOT NULL DEFAULT 'PPL',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.atc_lessons TO anon, authenticated;
GRANT ALL ON public.atc_lessons TO service_role;
ALTER TABLE public.atc_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read atc_lessons" ON public.atc_lessons FOR SELECT USING (true);
CREATE POLICY "Admins manage atc_lessons" ON public.atc_lessons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX atc_lessons_category_idx ON public.atc_lessons(category_id, display_order);

-- 3. Drills
CREATE TABLE public.atc_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.atc_categories(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.atc_lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  situation text NOT NULL,
  controller_transmission text,
  expected_phraseology text NOT NULL,
  key_elements jsonb NOT NULL DEFAULT '[]'::jsonb,
  difficulty text NOT NULL DEFAULT 'beginner',
  display_order integer NOT NULL DEFAULT 0,
  certificate_level text NOT NULL DEFAULT 'PPL',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.atc_drills TO anon, authenticated;
GRANT ALL ON public.atc_drills TO service_role;
ALTER TABLE public.atc_drills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read atc_drills" ON public.atc_drills FOR SELECT USING (true);
CREATE POLICY "Admins manage atc_drills" ON public.atc_drills FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX atc_drills_category_idx ON public.atc_drills(category_id, display_order);

-- 4. Drill attempts
CREATE TABLE public.atc_drill_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drill_id uuid NOT NULL REFERENCES public.atc_drills(id) ON DELETE CASCADE,
  student_response text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  feedback text,
  elements_hit jsonb NOT NULL DEFAULT '[]'::jsonb,
  elements_missed jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.atc_drill_attempts TO authenticated;
GRANT ALL ON public.atc_drill_attempts TO service_role;
ALTER TABLE public.atc_drill_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own drill attempts" ON public.atc_drill_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own drill attempts" ON public.atc_drill_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all drill attempts" ON public.atc_drill_attempts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX atc_drill_attempts_user_drill_idx ON public.atc_drill_attempts(user_id, drill_id, created_at DESC);

-- 5. Mastery
CREATE TABLE public.atc_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.atc_categories(id) ON DELETE CASCADE,
  mastery_score integer NOT NULL DEFAULT 0,
  drills_attempted integer NOT NULL DEFAULT 0,
  drills_passed integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id)
);
GRANT SELECT, INSERT, UPDATE ON public.atc_mastery TO authenticated;
GRANT ALL ON public.atc_mastery TO service_role;
ALTER TABLE public.atc_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own mastery" ON public.atc_mastery FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mastery" ON public.atc_mastery FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mastery" ON public.atc_mastery FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all mastery" ON public.atc_mastery FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));