-- Track ACS codes that surfaced in the UI but aren't in our task lookup
CREATE TABLE public.missing_acs_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  hit_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_missing_acs_codes_last_seen ON public.missing_acs_codes(last_seen_at DESC);

ALTER TABLE public.missing_acs_codes ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can log a missing code
CREATE POLICY "Anyone can log missing ACS codes"
ON public.missing_acs_codes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Anyone can bump the counter on existing rows (UPDATE is needed for upsert/onConflict)
CREATE POLICY "Anyone can bump missing ACS code counters"
ON public.missing_acs_codes
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Only admins can read the list
CREATE POLICY "Admins can view missing ACS codes"
ON public.missing_acs_codes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete entries (after they've been added to the lookup)
CREATE POLICY "Admins can delete missing ACS codes"
ON public.missing_acs_codes
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Atomic upsert function so a single client call increments hit_count safely
CREATE OR REPLACE FUNCTION public.log_missing_acs_code(_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.missing_acs_codes (code, hit_count, first_seen_at, last_seen_at)
  VALUES (UPPER(TRIM(_code)), 1, now(), now())
  ON CONFLICT (code) DO UPDATE
    SET hit_count = public.missing_acs_codes.hit_count + 1,
        last_seen_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_missing_acs_code(TEXT) TO anon, authenticated;