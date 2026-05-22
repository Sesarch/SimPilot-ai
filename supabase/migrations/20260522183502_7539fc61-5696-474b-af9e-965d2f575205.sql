
-- ============================================================
-- Support Inbox: unified queue across all customer touchpoints
-- ============================================================

-- 1. inbox_threads -------------------------------------------------
CREATE TABLE public.inbox_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('contact_form','support_chat','school_inquiry','lead_email','inbound_email')),
  source_id uuid,
  subject text NOT NULL DEFAULT '(no subject)',
  from_email text,
  from_name text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','open','pending','resolved','archived')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  assigned_to uuid,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);
CREATE INDEX idx_inbox_threads_status ON public.inbox_threads (status);
CREATE INDEX idx_inbox_threads_source ON public.inbox_threads (source);
CREATE INDEX idx_inbox_threads_last_message_at ON public.inbox_threads (last_message_at DESC);
CREATE INDEX idx_inbox_threads_from_email ON public.inbox_threads (from_email);

-- 2. inbox_messages ------------------------------------------------
CREATE TABLE public.inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.inbox_threads(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  body_text text,
  body_html text,
  from_email text,
  from_name text,
  to_email text,
  cc text,
  bcc text,
  email_message_id text,
  in_reply_to text,
  email_references text,
  delivery_status text CHECK (delivery_status IN ('pending','sent','failed','delivered')),
  delivery_error text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbox_messages_thread ON public.inbox_messages (thread_id, created_at);
CREATE INDEX idx_inbox_messages_email_message_id ON public.inbox_messages (email_message_id);

-- 3. inbox_notes ---------------------------------------------------
CREATE TABLE public.inbox_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.inbox_threads(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbox_notes_thread ON public.inbox_notes (thread_id, created_at);

-- 4. RLS -----------------------------------------------------------
ALTER TABLE public.inbox_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage inbox threads"
  ON public.inbox_threads FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role writes inbox threads"
  ON public.inbox_threads FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins manage inbox messages"
  ON public.inbox_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role writes inbox messages"
  ON public.inbox_messages FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins manage inbox notes"
  ON public.inbox_notes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Updated-at trigger -------------------------------------------
CREATE TRIGGER inbox_threads_updated_at
  BEFORE UPDATE ON public.inbox_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Source auto-seed triggers ------------------------------------
CREATE OR REPLACE FUNCTION public.inbox_seed_from_contact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_thread_id uuid;
BEGIN
  INSERT INTO public.inbox_threads (source, source_id, subject, from_email, from_name, last_message_at)
  VALUES ('contact_form', NEW.id, COALESCE(NULLIF(NEW.subject,''), 'Contact form'), NEW.email, NEW.name, NEW.created_at)
  ON CONFLICT (source, source_id) DO NOTHING
  RETURNING id INTO v_thread_id;
  IF v_thread_id IS NOT NULL THEN
    INSERT INTO public.inbox_messages (thread_id, direction, body_text, from_email, from_name, created_at)
    VALUES (v_thread_id, 'inbound', NEW.message, NEW.email, NEW.name, NEW.created_at);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_inbox_seed_contact
  AFTER INSERT ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.inbox_seed_from_contact();

CREATE OR REPLACE FUNCTION public.inbox_seed_from_support_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.inbox_threads (source, source_id, subject, from_email, last_message_at)
  VALUES ('support_chat', NEW.id, 'Support chat', NEW.email, NEW.created_at)
  ON CONFLICT (source, source_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_inbox_seed_support_chat
  AFTER INSERT ON public.support_chats
  FOR EACH ROW EXECUTE FUNCTION public.inbox_seed_from_support_chat();

CREATE OR REPLACE FUNCTION public.inbox_seed_from_support_chat_msg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_thread_id uuid; v_email text;
BEGIN
  SELECT id, email INTO v_thread_id, v_email
  FROM public.inbox_threads t
  WHERE t.source = 'support_chat' AND t.source_id = NEW.chat_id;
  IF v_thread_id IS NULL THEN
    SELECT email INTO v_email FROM public.support_chats WHERE id = NEW.chat_id;
    INSERT INTO public.inbox_threads (source, source_id, subject, from_email, last_message_at)
    VALUES ('support_chat', NEW.chat_id, 'Support chat', v_email, NEW.created_at)
    RETURNING id INTO v_thread_id;
  END IF;
  INSERT INTO public.inbox_messages (thread_id, direction, body_text, from_email, created_at)
  VALUES (
    v_thread_id,
    CASE WHEN NEW.role = 'user' THEN 'inbound' ELSE 'outbound' END,
    NEW.content,
    CASE WHEN NEW.role = 'user' THEN v_email ELSE 'assistant@simpilot.ai' END,
    NEW.created_at
  );
  IF NEW.role = 'user' THEN
    UPDATE public.inbox_threads
    SET last_message_at = NEW.created_at, unread_count = unread_count + 1,
        status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END
    WHERE id = v_thread_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_inbox_seed_support_chat_msg
  AFTER INSERT ON public.support_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.inbox_seed_from_support_chat_msg();

CREATE OR REPLACE FUNCTION public.inbox_seed_from_school_inquiry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_thread_id uuid;
BEGIN
  INSERT INTO public.inbox_threads (source, source_id, subject, from_email, from_name, last_message_at)
  VALUES ('school_inquiry', NEW.id, 'School inquiry — ' || NEW.school_name, NEW.contact_email, NEW.contact_name, NEW.created_at)
  ON CONFLICT (source, source_id) DO NOTHING
  RETURNING id INTO v_thread_id;
  IF v_thread_id IS NOT NULL AND NEW.message IS NOT NULL THEN
    INSERT INTO public.inbox_messages (thread_id, direction, body_text, from_email, from_name, created_at)
    VALUES (v_thread_id, 'inbound', NEW.message, NEW.contact_email, NEW.contact_name, NEW.created_at);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_inbox_seed_school_inquiry
  AFTER INSERT ON public.school_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.inbox_seed_from_school_inquiry();

CREATE OR REPLACE FUNCTION public.inbox_seed_from_lead_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_thread_id uuid;
BEGIN
  INSERT INTO public.inbox_threads (source, source_id, subject, from_email, last_message_at)
  VALUES ('lead_email', NEW.id, 'Lead capture', NEW.email, NEW.created_at)
  ON CONFLICT (source, source_id) DO NOTHING
  RETURNING id INTO v_thread_id;
  IF v_thread_id IS NOT NULL THEN
    INSERT INTO public.inbox_messages (thread_id, direction, body_text, from_email, created_at)
    VALUES (v_thread_id, 'inbound',
      'New lead captured from chat funnel.' ||
      COALESCE(E'\n\nContext: ' || NEW.pilot_context::text, ''),
      NEW.email, NEW.created_at);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_inbox_seed_lead_email
  AFTER INSERT ON public.lead_emails
  FOR EACH ROW EXECUTE FUNCTION public.inbox_seed_from_lead_email();

-- 7. Backfill -----------------------------------------------------
INSERT INTO public.inbox_threads (source, source_id, subject, from_email, from_name, last_message_at, created_at)
SELECT 'contact_form', id, COALESCE(NULLIF(subject,''), 'Contact form'), email, name, created_at, created_at
FROM public.contact_submissions
ON CONFLICT DO NOTHING;

INSERT INTO public.inbox_messages (thread_id, direction, body_text, from_email, from_name, created_at)
SELECT t.id, 'inbound', c.message, c.email, c.name, c.created_at
FROM public.contact_submissions c
JOIN public.inbox_threads t ON t.source='contact_form' AND t.source_id=c.id
WHERE NOT EXISTS (SELECT 1 FROM public.inbox_messages m WHERE m.thread_id=t.id);

INSERT INTO public.inbox_threads (source, source_id, subject, from_email, last_message_at, created_at)
SELECT 'support_chat', id, 'Support chat', email, updated_at, created_at
FROM public.support_chats
ON CONFLICT DO NOTHING;

INSERT INTO public.inbox_messages (thread_id, direction, body_text, from_email, created_at)
SELECT t.id,
       CASE WHEN scm.role='user' THEN 'inbound' ELSE 'outbound' END,
       scm.content,
       CASE WHEN scm.role='user' THEN sc.email ELSE 'assistant@simpilot.ai' END,
       scm.created_at
FROM public.support_chat_messages scm
JOIN public.support_chats sc ON sc.id = scm.chat_id
JOIN public.inbox_threads t ON t.source='support_chat' AND t.source_id=sc.id;

INSERT INTO public.inbox_threads (source, source_id, subject, from_email, from_name, last_message_at, created_at)
SELECT 'school_inquiry', id, 'School inquiry — ' || school_name, contact_email, contact_name, updated_at, created_at
FROM public.school_inquiries
ON CONFLICT DO NOTHING;

INSERT INTO public.inbox_messages (thread_id, direction, body_text, from_email, from_name, created_at)
SELECT t.id, 'inbound', s.message, s.contact_email, s.contact_name, s.created_at
FROM public.school_inquiries s
JOIN public.inbox_threads t ON t.source='school_inquiry' AND t.source_id=s.id
WHERE s.message IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.inbox_messages m WHERE m.thread_id=t.id);

INSERT INTO public.inbox_threads (source, source_id, subject, from_email, last_message_at, created_at)
SELECT 'lead_email', id, 'Lead capture', email, created_at, created_at
FROM public.lead_emails
ON CONFLICT DO NOTHING;

INSERT INTO public.inbox_messages (thread_id, direction, body_text, from_email, created_at)
SELECT t.id, 'inbound',
       'New lead captured from chat funnel.' ||
       COALESCE(E'\n\nContext: ' || l.pilot_context::text, ''),
       l.email, l.created_at
FROM public.lead_emails l
JOIN public.inbox_threads t ON t.source='lead_email' AND t.source_id=l.id
WHERE NOT EXISTS (SELECT 1 FROM public.inbox_messages m WHERE m.thread_id=t.id);

-- 8. Realtime -----------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_notes;
