ALTER TABLE public.school_inquiries
  ADD COLUMN IF NOT EXISTS preferred_start_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

CREATE TRIGGER trg_school_inquiries_updated_at
BEFORE UPDATE ON public.school_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins can update school inquiries"
ON public.school_inquiries
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_school_inquiries_created_at ON public.school_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_inquiries_status ON public.school_inquiries (status);