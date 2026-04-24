-- 1. School purchases (one row per school invoice)
CREATE TABLE public.school_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  seats_purchased INTEGER NOT NULL CHECK (seats_purchased > 0),
  discount_percent INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all school purchases"
  ON public.school_purchases FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update school purchases"
  ON public.school_purchases FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role handles inserts/updates from edge functions; no public insert policy needed.

CREATE TRIGGER update_school_purchases_updated_at
  BEFORE UPDATE ON public.school_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_school_purchases_session ON public.school_purchases(stripe_session_id);
CREATE INDEX idx_school_purchases_email ON public.school_purchases(contact_email);

-- 2. Seat codes (one row per redeemable code)
CREATE TABLE public.school_seat_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.school_purchases(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  redeemed_by_user_id UUID,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_seat_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all seat codes"
  ON public.school_seat_codes FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own redeemed code"
  ON public.school_seat_codes FOR SELECT TO authenticated
  USING (redeemed_by_user_id = auth.uid());

-- Code lookups during signup happen via SECURITY DEFINER edge functions using the service role.

CREATE INDEX idx_school_seat_codes_purchase ON public.school_seat_codes(purchase_id);
CREATE INDEX idx_school_seat_codes_redeemed_user ON public.school_seat_codes(redeemed_by_user_id);

-- 3. Extend profiles with school subscription tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_seat_code_id UUID REFERENCES public.school_seat_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_source TEXT CHECK (subscription_source IN ('school','individual','none'));

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires ON public.profiles(subscription_expires_at) WHERE subscription_expires_at IS NOT NULL;

-- 4. Helper function to validate a code without exposing other codes
CREATE OR REPLACE FUNCTION public.validate_seat_code(_code TEXT)
RETURNS TABLE(
  valid BOOLEAN,
  reason TEXT,
  school_name TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code RECORD;
  v_purchase RECORD;
BEGIN
  SELECT * INTO v_code FROM public.school_seat_codes WHERE code = UPPER(TRIM(_code));
  IF v_code.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Code not found', NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  IF v_code.redeemed_by_user_id IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 'Code already redeemed', NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  SELECT * INTO v_purchase FROM public.school_purchases WHERE id = v_code.purchase_id;
  IF v_purchase.status <> 'paid' THEN
    RETURN QUERY SELECT FALSE, 'Purchase not paid', NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  IF v_purchase.expires_at < now() THEN
    RETURN QUERY SELECT FALSE, 'Purchase expired', NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  RETURN QUERY SELECT TRUE, 'OK', v_purchase.school_name, v_purchase.expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_seat_code(TEXT) TO anon, authenticated;