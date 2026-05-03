
-- 1. Extend profiles with unified pilot context
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tail_number TEXT,
  ADD COLUMN IF NOT EXISTS license_level TEXT,
  ADD COLUMN IF NOT EXISTS training_progress JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Audit queue: every Technical/Operational response is enqueued here
CREATE TABLE IF NOT EXISTS public.ai_audit_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id UUID,
  message_id UUID,
  task_type TEXT NOT NULL,         -- 'technical' | 'operational' | 'vision'
  primary_model TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  pilot_context JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | reviewing | clean | flagged | error
  attempts INT NOT NULL DEFAULT 0,
  audit_started_at TIMESTAMPTZ,
  audit_completed_at TIMESTAMPTZ,
  audit_model TEXT,
  audit_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_queue_status ON public.ai_audit_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_queue_user ON public.ai_audit_queue(user_id);

ALTER TABLE public.ai_audit_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage audit queue"
  ON public.ai_audit_queue FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own audit rows"
  ON public.ai_audit_queue FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Safety flags: Severity 1 contradictions surfaced to UI
CREATE TABLE IF NOT EXISTS public.ai_safety_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_queue_id UUID REFERENCES public.ai_audit_queue(id) ON DELETE CASCADE,
  user_id UUID,
  session_id UUID,
  message_id UUID,
  severity INT NOT NULL DEFAULT 1, -- 1 = block + disclaimer
  category TEXT NOT NULL,          -- e.g. 'poh_contradiction', 'reg_violation', 'emergency_proc'
  contradiction TEXT NOT NULL,
  poh_reference TEXT,
  auditor_model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_safety_flags_user ON public.ai_safety_flags(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_flags_message ON public.ai_safety_flags(message_id);

ALTER TABLE public.ai_safety_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage safety flags"
  ON public.ai_safety_flags FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own safety flags"
  ON public.ai_safety_flags FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Per-task model overrides on model_settings
ALTER TABLE public.model_settings
  ADD COLUMN IF NOT EXISTS technical_model TEXT NOT NULL DEFAULT 'anthropic/claude-3-5-sonnet-latest',
  ADD COLUMN IF NOT EXISTS operational_model TEXT NOT NULL DEFAULT 'openai/gpt-4o',
  ADD COLUMN IF NOT EXISTS vision_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-pro',
  ADD COLUMN IF NOT EXISTS auditor_model TEXT NOT NULL DEFAULT 'openai/o1',
  ADD COLUMN IF NOT EXISTS shadow_audit_enabled BOOLEAN NOT NULL DEFAULT true;
