
-- Support chat sessions table
CREATE TABLE public.support_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  escalated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Support chat messages table
CREATE TABLE public.support_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.support_chats(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

-- Admins can read/delete support chats
CREATE POLICY "Admins can view support chats" ON public.support_chats
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete support chats" ON public.support_chats
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert (from edge function or anon)
CREATE POLICY "Anyone can insert support chats" ON public.support_chats
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Messages policies
CREATE POLICY "Admins can view support chat messages" ON public.support_chat_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert support chat messages" ON public.support_chat_messages
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can delete support chat messages" ON public.support_chat_messages
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
