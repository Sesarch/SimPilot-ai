-- Unified intakes table for both individual pilots and flight schools
CREATE TABLE public.intakes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  audience TEXT NOT NULL CHECK (audience IN ('pilot','school')),
  -- Contact
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  phone TEXT NULL,
  -- School-specific
  school_name TEXT NULL,
  estimated_seats INTEGER NULL,
  preferred_start_date DATE NULL,
  -- Training profile (shared)
  certificate_type TEXT NULL,
  rating_focus TEXT NULL,
  aircraft_type TEXT NULL,
  flight_hours INTEGER NULL,
  region TEXT NULL,
  proficiency TEXT NULL, -- e.g. beginner / building / proficient / checkride-ready
  training_goals TEXT NULL,
  timeline TEXT NULL,
  -- Catch-all for future fields
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can submit an intake
CREATE POLICY "Anyone can submit intakes"
  ON public.intakes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can view their own intake
CREATE POLICY "Users view own intakes"
  ON public.intakes FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- Admins can view & update all intakes
CREATE POLICY "Admins view all intakes"
  ON public.intakes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update intakes"
  ON public.intakes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_intakes_updated_at
  BEFORE UPDATE ON public.intakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_intakes_audience ON public.intakes(audience);
CREATE INDEX idx_intakes_user_id ON public.intakes(user_id);
CREATE INDEX idx_intakes_created_at ON public.intakes(created_at DESC);