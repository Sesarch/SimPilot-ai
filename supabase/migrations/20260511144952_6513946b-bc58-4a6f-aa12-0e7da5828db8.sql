
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  connected_account_id text,
  livemode boolean NOT NULL DEFAULT false,
  object_id text,
  customer_id text,
  subscription_id text,
  invoice_id text,
  checkout_session_id text,
  user_id uuid,
  status text,
  amount_total integer,
  currency text,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_webhook_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_events_account ON public.stripe_webhook_events(connected_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_events_customer ON public.stripe_webhook_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_user ON public.stripe_webhook_events(user_id);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read stripe webhook events"
  ON public.stripe_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
