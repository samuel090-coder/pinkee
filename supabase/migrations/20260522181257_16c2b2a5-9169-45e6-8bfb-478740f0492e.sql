
-- Support conversations (one per user)
CREATE TABLE public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_admin INTEGER NOT NULL DEFAULT 0,
  unread_user INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own conversation" ON public.support_conversations
  FOR SELECT USING (auth.uid() = user_id OR public.is_moderator(auth.uid()));
CREATE POLICY "Users insert own conversation" ON public.support_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conversation" ON public.support_conversations
  FOR UPDATE USING (auth.uid() = user_id OR public.is_moderator(auth.uid()));

-- Support messages
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user','ai','admin')),
  content TEXT,
  image_url TEXT,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_conv ON public.support_messages(conversation_id, created_at);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View messages in own conversation" ON public.support_messages
  FOR SELECT USING (
    public.is_moderator(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );
CREATE POLICY "Insert messages in own conversation" ON public.support_messages
  FOR INSERT WITH CHECK (
    public.is_moderator(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- Support settings (single row)
CREATE TABLE public.support_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads support settings" ON public.support_settings
  FOR SELECT USING (true);
CREATE POLICY "Moderators update support settings" ON public.support_settings
  FOR UPDATE USING (public.is_moderator(auth.uid()));
CREATE POLICY "Moderators insert support settings" ON public.support_settings
  FOR INSERT WITH CHECK (public.is_moderator(auth.uid()));

INSERT INTO public.support_settings (ai_enabled) VALUES (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.support_conversations REPLICA IDENTITY FULL;

-- Storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('support-attachments','support-attachments', false);

CREATE POLICY "Users upload own support attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'support-attachments' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Users read own support attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'support-attachments' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR public.is_moderator(auth.uid())
    )
  );

-- Public RPC for welcome back lookup
CREATE OR REPLACE FUNCTION public.get_public_profile_by_email(_email TEXT)
RETURNS TABLE (display_name TEXT, username TEXT, avatar_url TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.display_name, p.username, p.avatar_url
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE lower(u.email) = lower(_email)
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_by_email(TEXT) TO anon, authenticated;

-- Updated_at trigger
CREATE TRIGGER tg_support_conv_updated BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
