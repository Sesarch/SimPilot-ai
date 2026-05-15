CREATE TABLE IF NOT EXISTS public.stripe_webhook_signing_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id text NOT NULL UNIQUE,
  signing_secret text NOT NULL,
  livemode boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_signing_secrets_active
  ON public.stripe_webhook_signing_secrets(active, livemode);

ALTER TABLE public.stripe_webhook_signing_secrets ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_stripe_webhook_signing_secrets_updated_at
  ON public.stripe_webhook_signing_secrets;

CREATE TRIGGER update_stripe_webhook_signing_secrets_updated_at
BEFORE UPDATE ON public.stripe_webhook_signing_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();