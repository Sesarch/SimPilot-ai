CREATE TABLE public.stripe_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_payout_id TEXT NOT NULL UNIQUE,
  connected_account_id TEXT,
  livemode BOOLEAN NOT NULL DEFAULT false,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  type TEXT,
  method TEXT,
  source_type TEXT,
  statement_descriptor TEXT,
  description TEXT,
  failure_code TEXT,
  failure_message TEXT,
  arrival_date TIMESTAMPTZ,
  stripe_created_at TIMESTAMPTZ,
  payload JSONB NOT NULL,
  last_event_type TEXT,
  last_event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stripe_payouts_account ON public.stripe_payouts(connected_account_id);
CREATE INDEX idx_stripe_payouts_status ON public.stripe_payouts(status);
CREATE INDEX idx_stripe_payouts_arrival ON public.stripe_payouts(arrival_date DESC);

ALTER TABLE public.stripe_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read payouts"
ON public.stripe_payouts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_stripe_payouts_updated_at
BEFORE UPDATE ON public.stripe_payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();