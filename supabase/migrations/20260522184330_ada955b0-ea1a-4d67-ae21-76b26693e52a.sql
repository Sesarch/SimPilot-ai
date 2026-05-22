
-- =========================================================
-- Inbox Routing: mailboxes + rules + auto-assignment
-- =========================================================

-- 1. Mailboxes -------------------------------------------------------
CREATE TABLE public.inbox_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  color text NOT NULL DEFAULT '#009199',
  forward_to_email text,
  default_assignee uuid,
  sort_order integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbox_mailboxes_slug ON public.inbox_mailboxes (slug);

ALTER TABLE public.inbox_mailboxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage mailboxes" ON public.inbox_mailboxes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role reads mailboxes" ON public.inbox_mailboxes
  FOR SELECT TO public USING (auth.role() = 'service_role');

CREATE TRIGGER inbox_mailboxes_updated_at
  BEFORE UPDATE ON public.inbox_mailboxes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Routing rules ---------------------------------------------------
CREATE TABLE public.inbox_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  priority integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  match_source text,
  match_from_domain text,
  match_keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  set_mailbox uuid REFERENCES public.inbox_mailboxes(id) ON DELETE SET NULL,
  set_assignee uuid,
  set_priority text CHECK (set_priority IN ('low','normal','high')),
  add_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbox_routing_rules_priority ON public.inbox_routing_rules (priority);

ALTER TABLE public.inbox_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage routing rules" ON public.inbox_routing_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role reads routing rules" ON public.inbox_routing_rules
  FOR SELECT TO public USING (auth.role() = 'service_role');

CREATE TRIGGER inbox_routing_rules_updated_at
  BEFORE UPDATE ON public.inbox_routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add mailbox_id to threads --------------------------------------
ALTER TABLE public.inbox_threads
  ADD COLUMN mailbox_id uuid REFERENCES public.inbox_mailboxes(id) ON DELETE SET NULL;
CREATE INDEX idx_inbox_threads_mailbox ON public.inbox_threads (mailbox_id);

-- 4. Seed default mailboxes -----------------------------------------
INSERT INTO public.inbox_mailboxes (name, slug, description, color, sort_order) VALUES
  ('Support',  'support',  'Customer support questions and product issues', '#009199', 10),
  ('Sales',    'sales',    'Sales inquiries, pricing, and leads',           '#22c55e', 20),
  ('Schools',  'schools',  'Flight schools and bulk seat purchases',        '#f59e0b', 30),
  ('Billing',  'billing',  'Invoices, refunds, subscription changes',       '#a855f7', 40),
  ('Spam',     'spam',     'Auto-classified spam / low-quality messages',   '#64748b', 99);

-- 5. Seed default routing rules -------------------------------------
INSERT INTO public.inbox_routing_rules (name, priority, match_source, set_mailbox, set_priority, add_tags)
SELECT 'School inquiries → Schools', 10, 'school_inquiry', id, 'high', ARRAY['school']
FROM public.inbox_mailboxes WHERE slug = 'schools';

INSERT INTO public.inbox_routing_rules (name, priority, match_source, set_mailbox, set_priority, add_tags)
SELECT 'Lead emails → Sales', 20, 'lead_email', id, 'normal', ARRAY['lead']
FROM public.inbox_mailboxes WHERE slug = 'sales';

INSERT INTO public.inbox_routing_rules (name, priority, match_source, set_mailbox, set_priority, add_tags)
SELECT 'Support chats → Support', 30, 'support_chat', id, 'normal', ARRAY['chat']
FROM public.inbox_mailboxes WHERE slug = 'support';

INSERT INTO public.inbox_routing_rules (name, priority, match_source, set_mailbox, set_priority, add_tags)
SELECT 'Contact form → Support', 40, 'contact_form', id, 'normal', ARRAY['contact']
FROM public.inbox_mailboxes WHERE slug = 'support';

INSERT INTO public.inbox_routing_rules (name, priority, match_source, match_keywords, set_mailbox, set_priority, add_tags)
SELECT 'Billing keywords → Billing', 5, NULL,
  ARRAY['refund','invoice','billing','charge','payment','subscription','cancel'],
  id, 'high', ARRAY['billing']
FROM public.inbox_mailboxes WHERE slug = 'billing';

INSERT INTO public.inbox_routing_rules (name, priority, match_source, match_keywords, set_mailbox, set_priority, add_tags)
SELECT 'Spam keywords → Spam', 1, NULL,
  ARRAY['seo services','crypto','loan offer','make money fast','viagra','casino'],
  id, 'low', ARRAY['spam']
FROM public.inbox_mailboxes WHERE slug = 'spam';

INSERT INTO public.inbox_routing_rules (name, priority, match_source, set_mailbox, set_priority, add_tags)
SELECT 'Inbound emails → Support (fallback)', 90, 'inbound_email', id, 'normal', ARRAY[]::text[]
FROM public.inbox_mailboxes WHERE slug = 'support';

-- 6. Routing function -----------------------------------------------
CREATE OR REPLACE FUNCTION public.inbox_route_thread(p_thread_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_thread public.inbox_threads%ROWTYPE;
  v_rule   public.inbox_routing_rules%ROWTYPE;
  v_hay    text;
  v_domain text;
  v_kw     text;
  v_matched boolean;
BEGIN
  SELECT * INTO v_thread FROM public.inbox_threads WHERE id = p_thread_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Build search haystack from subject + last inbound message body
  v_hay := lower(COALESCE(v_thread.subject, '') || ' ' || COALESCE(v_thread.from_email,'') || ' ' ||
    COALESCE((
      SELECT string_agg(COALESCE(body_text,''), ' ')
      FROM public.inbox_messages
      WHERE thread_id = p_thread_id AND direction = 'inbound'
    ), ''));

  v_domain := lower(COALESCE(split_part(v_thread.from_email, '@', 2), ''));

  FOR v_rule IN
    SELECT * FROM public.inbox_routing_rules
    WHERE enabled = true
    ORDER BY priority ASC, created_at ASC
  LOOP
    v_matched := true;

    IF v_rule.match_source IS NOT NULL AND v_rule.match_source <> v_thread.source THEN
      v_matched := false;
    END IF;

    IF v_matched AND v_rule.match_from_domain IS NOT NULL
       AND v_rule.match_from_domain <> '' AND v_rule.match_from_domain <> v_domain THEN
      v_matched := false;
    END IF;

    IF v_matched AND array_length(v_rule.match_keywords, 1) IS NOT NULL THEN
      v_matched := false;
      FOREACH v_kw IN ARRAY v_rule.match_keywords LOOP
        IF v_kw IS NOT NULL AND v_kw <> '' AND position(lower(v_kw) IN v_hay) > 0 THEN
          v_matched := true;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF v_matched THEN
      UPDATE public.inbox_threads SET
        mailbox_id   = COALESCE(v_rule.set_mailbox, mailbox_id),
        assigned_to  = COALESCE(assigned_to,
                                 v_rule.set_assignee,
                                 (SELECT default_assignee FROM public.inbox_mailboxes
                                  WHERE id = v_rule.set_mailbox)),
        priority     = COALESCE(v_rule.set_priority, priority),
        tags         = (SELECT ARRAY(SELECT DISTINCT unnest(tags || v_rule.add_tags)))
      WHERE id = p_thread_id;
      RETURN;
    END IF;
  END LOOP;
END $$;

-- 7. Trigger on inbox_threads ---------------------------------------
CREATE OR REPLACE FUNCTION public.inbox_route_thread_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only auto-route when mailbox is not yet set
  IF NEW.mailbox_id IS NULL THEN
    PERFORM public.inbox_route_thread(NEW.id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_inbox_route_thread
  AFTER INSERT ON public.inbox_threads
  FOR EACH ROW EXECUTE FUNCTION public.inbox_route_thread_trigger();

-- Also re-route after the FIRST inbound message lands (keywords may now match)
CREATE OR REPLACE FUNCTION public.inbox_route_after_inbound_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mailbox uuid;
BEGIN
  IF NEW.direction = 'inbound' THEN
    SELECT mailbox_id INTO v_mailbox FROM public.inbox_threads WHERE id = NEW.thread_id;
    -- Only re-evaluate if no mailbox or default-source-only mailbox was assigned
    PERFORM public.inbox_route_thread(NEW.thread_id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_inbox_route_after_inbound
  AFTER INSERT ON public.inbox_messages
  FOR EACH ROW EXECUTE FUNCTION public.inbox_route_after_inbound_message();

-- 8. Backfill existing threads --------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.inbox_threads WHERE mailbox_id IS NULL LOOP
    PERFORM public.inbox_route_thread(r.id);
  END LOOP;
END $$;
