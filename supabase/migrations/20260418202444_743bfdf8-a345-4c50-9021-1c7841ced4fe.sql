CREATE TABLE public.flight_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  flight_date DATE NOT NULL DEFAULT CURRENT_DATE,
  aircraft_type TEXT,
  tail_number TEXT,
  departure TEXT,
  destination TEXT,
  route TEXT,
  total_time NUMERIC(5,1) NOT NULL DEFAULT 0,
  pic_time NUMERIC(5,1) NOT NULL DEFAULT 0,
  sic_time NUMERIC(5,1) NOT NULL DEFAULT 0,
  cross_country_time NUMERIC(5,1) NOT NULL DEFAULT 0,
  night_time NUMERIC(5,1) NOT NULL DEFAULT 0,
  instrument_time NUMERIC(5,1) NOT NULL DEFAULT 0,
  simulated_instrument_time NUMERIC(5,1) NOT NULL DEFAULT 0,
  day_landings INTEGER NOT NULL DEFAULT 0,
  night_landings INTEGER NOT NULL DEFAULT 0,
  approaches INTEGER NOT NULL DEFAULT 0,
  remarks TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  source_session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT flight_logs_status_check CHECK (status IN ('draft','final')),
  CONSTRAINT flight_logs_source_check CHECK (source IN ('manual','atc_session'))
);

CREATE INDEX idx_flight_logs_user_date ON public.flight_logs(user_id, flight_date DESC);
CREATE INDEX idx_flight_logs_source_session ON public.flight_logs(source_session_id) WHERE source_session_id IS NOT NULL;

ALTER TABLE public.flight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flight logs"
ON public.flight_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flight logs"
ON public.flight_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flight logs"
ON public.flight_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own flight logs"
ON public.flight_logs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_flight_logs_updated_at
BEFORE UPDATE ON public.flight_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();