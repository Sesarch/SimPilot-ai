
CREATE TABLE public.inbox_reply_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL,
  shortcut TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inbox_reply_templates_category ON public.inbox_reply_templates(category, sort_order);

ALTER TABLE public.inbox_reply_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reply templates"
  ON public.inbox_reply_templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert reply templates"
  ON public.inbox_reply_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reply templates"
  ON public.inbox_reply_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reply templates"
  ON public.inbox_reply_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_inbox_reply_templates_updated
  BEFORE UPDATE ON public.inbox_reply_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed common quick replies
INSERT INTO public.inbox_reply_templates (title, category, body, shortcut, sort_order) VALUES
  ('Acknowledge receipt', 'general',
   'Hi {{first_name}},

Thanks for reaching out to SimPilot — we''ve received your message and a team member will get back to you within one business day.

Blue skies,
The SimPilot Team', '/ack', 10),
  ('Need more info', 'general',
   'Hi {{first_name}},

Thanks for the message. To help you faster, could you share a bit more detail (aircraft type, what you were doing, any error messages or screenshots)?

Blue skies,
The SimPilot Team', '/info', 20),
  ('Follow-up nudge', 'general',
   'Hi {{first_name}},

Just circling back on your earlier message — let us know if you still need a hand. Happy to help whenever you''re ready.

Blue skies,
The SimPilot Team', '/followup', 30),
  ('Resolved — closing thread', 'general',
   'Hi {{first_name}},

Glad we could get that sorted. I''m closing this thread for now — just reply and it''ll reopen if anything else comes up.

Blue skies,
The SimPilot Team', '/resolved', 40),
  ('Billing question', 'billing',
   'Hi {{first_name}},

Thanks for reaching out about billing. Could you confirm the email on your SimPilot account and a brief description of the charge in question? We''ll review and get back to you shortly.

Blue skies,
The SimPilot Team', '/billing', 50),
  ('Refund acknowledged', 'billing',
   'Hi {{first_name}},

We''ve received your refund request and are processing it now. You''ll see the credit back on your original payment method within 5–10 business days.

Blue skies,
The SimPilot Team', '/refund', 60),
  ('Cancel subscription confirmed', 'billing',
   'Hi {{first_name}},

Your subscription has been canceled. You''ll keep access until the end of your current billing period. We''d love your feedback on what we could do better.

Blue skies,
The SimPilot Team', '/cancel', 70),
  ('Flight school inquiry', 'schools',
   'Hi {{first_name}},

Thanks for your interest in SimPilot for flight schools. We offer team licenses, instructor dashboards, and curriculum integration. Are you able to share rough student count and which certificates you train? I''ll send pricing and a quick demo invite.

Blue skies,
The SimPilot Team', '/school', 80),
  ('Password reset help', 'support',
   'Hi {{first_name}},

You can reset your password from the login page using the "Forgot password" link. If the email doesn''t arrive within a few minutes, please check spam — and let us know if it still doesn''t come through.

Blue skies,
The SimPilot Team', '/reset', 90),
  ('Bug report — investigating', 'support',
   'Hi {{first_name}},

Thanks for flagging this — we''ve logged it and our team is taking a look. We''ll follow up as soon as we have a fix or a workaround.

Blue skies,
The SimPilot Team', '/bug', 100);
