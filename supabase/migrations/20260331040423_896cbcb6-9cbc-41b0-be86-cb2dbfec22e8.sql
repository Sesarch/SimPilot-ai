CREATE TABLE public.lead_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pilot_context JSONB
);

-- Allow anonymous inserts (lead capture)
ALTER TABLE public.lead_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert lead emails"
  ON public.lead_emails
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Only admins can view lead emails"
  ON public.lead_emails
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));