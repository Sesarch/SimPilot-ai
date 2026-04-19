ALTER TABLE public.flight_logs
ADD COLUMN IF NOT EXISTS pmdg_debrief JSONB;

COMMENT ON COLUMN public.flight_logs.pmdg_debrief IS
  'AI-generated airline-style post-flight debrief for PMDG flights. Schema: { generated_at, variant, summary, automation: {...}, flap_schedule: {...}, stable_approach: {...}, recommendations: string[], event_timeline: [...] }';