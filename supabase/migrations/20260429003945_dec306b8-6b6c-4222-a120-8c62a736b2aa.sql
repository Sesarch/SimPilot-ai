ALTER TABLE public.flight_logs
  ADD COLUMN IF NOT EXISTS dual_received_time numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dual_given_time numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS solo_time numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS day_time numeric NOT NULL DEFAULT 0;