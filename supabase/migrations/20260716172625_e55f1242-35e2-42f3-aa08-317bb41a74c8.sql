
-- ============================================================
-- 1. DAILY STREAKS: extend reward_settings with NGN bonuses
-- ============================================================
ALTER TABLE public.reward_settings
  ADD COLUMN IF NOT EXISTS daily_checkin_ngn NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS streak_bonus_ngn_7 NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS streak_bonus_ngn_30 NUMERIC(10,2) NOT NULL DEFAULT 300.00,
  ADD COLUMN IF NOT EXISTS streak_bonus_ngn_100 NUMERIC(10,2) NOT NULL DEFAULT 1500.00;

-- Wallet-based daily checkin (in addition to existing points version)
CREATE OR REPLACE FUNCTION public.claim_daily_wallet_checkin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  s RECORD;
  ur RECORD;
  last_day DATE;
  today DATE := (now() AT TIME ZONE 'UTC')::DATE;
  new_streak INTEGER;
  base_ngn NUMERIC(10,2);
  bonus_ngn NUMERIC(10,2) := 0;
  total_ngn NUMERIC(10,2);
  ok BOOLEAN;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  PERFORM public.ensure_user_rewards(uid);
  SELECT * INTO s FROM public.reward_settings WHERE id IS TRUE;
  SELECT * INTO ur FROM public.user_rewards WHERE user_id = uid FOR UPDATE;

  last_day := (ur.last_checkin_at AT TIME ZONE 'UTC')::DATE;
  IF last_day = today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_checked_in_today', 'streak', ur.current_streak);
  END IF;

  IF last_day = today - 1 THEN
    new_streak := COALESCE(ur.current_streak, 0) + 1;
  ELSE
    new_streak := 1;
  END IF;

  base_ngn := s.daily_checkin_ngn;
  IF new_streak = 100 THEN
    bonus_ngn := s.streak_bonus_ngn_100;
  ELSIF new_streak = 30 THEN
    bonus_ngn := s.streak_bonus_ngn_30;
  ELSIF new_streak % 7 = 0 THEN
    bonus_ngn := s.streak_bonus_ngn_7;
  END IF;

  total_ngn := base_ngn + bonus_ngn;

  UPDATE public.user_rewards
    SET current_streak = new_streak,
        longest_streak = GREATEST(longest_streak, new_streak),
        last_checkin_at = now(),
        lifetime_ngn = lifetime_ngn + total_ngn
    WHERE user_id = uid;

  ok := public.process_wallet_payment(
    uid, total_ngn, 'earning',
    'Daily check-in (streak ' || new_streak || ')',
    'streak:' || uid::TEXT || ':' || today::TEXT
  );

  RETURN jsonb_build_object(
    'ok', ok,
    'streak', new_streak,
    'base_ngn', base_ngn,
    'bonus_ngn', bonus_ngn,
    'total_ngn', total_ngn
  );
END $$;

GRANT EXECUTE ON FUNCTION public.claim_daily_wallet_checkin() TO authenticated;

-- ============================================================
-- 2. WATCH PARTIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.watch_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Watch Party',
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'movie', 'tv')),
  content_ref TEXT NOT NULL, -- video_id UUID (as text), or tmdb id, or "tmdb_id:season:episode"
  content_title TEXT,
  content_poster TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_time_seconds NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_playing BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  participant_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_parties TO authenticated;
GRANT SELECT ON public.watch_parties TO anon;
GRANT ALL ON public.watch_parties TO service_role;
ALTER TABLE public.watch_parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public active parties"
  ON public.watch_parties FOR SELECT
  USING (is_public = true OR host_id = auth.uid());
CREATE POLICY "Authenticated can create parties"
  ON public.watch_parties FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update own party"
  ON public.watch_parties FOR UPDATE TO authenticated
  USING (auth.uid() = host_id);
CREATE POLICY "Host can delete own party"
  ON public.watch_parties FOR DELETE TO authenticated
  USING (auth.uid() = host_id);

CREATE TABLE IF NOT EXISTS public.watch_party_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE (party_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_party_participants TO authenticated;
GRANT SELECT ON public.watch_party_participants TO anon;
GRANT ALL ON public.watch_party_participants TO service_role;
ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants viewable by anyone on public parties or self"
  ON public.watch_party_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.watch_parties p WHERE p.id = party_id AND (p.is_public OR p.host_id = auth.uid()))
  );
CREATE POLICY "Users can join parties"
  ON public.watch_party_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own participation"
  ON public.watch_party_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can leave parties"
  ON public.watch_party_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.watch_party_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'chat' CHECK (message_type IN ('chat', 'reaction', 'system')),
  content TEXT NOT NULL,
  emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.watch_party_messages TO authenticated;
GRANT SELECT ON public.watch_party_messages TO anon;
GRANT ALL ON public.watch_party_messages TO service_role;
ALTER TABLE public.watch_party_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Party messages viewable by participants/public"
  ON public.watch_party_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.watch_parties p WHERE p.id = party_id AND (p.is_public OR p.host_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.watch_party_participants pp WHERE pp.party_id = party_id AND pp.user_id = auth.uid())
  );
CREATE POLICY "Users post their own messages"
  ON public.watch_party_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own messages"
  ON public.watch_party_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_watch_parties_public_active ON public.watch_parties(is_public, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_party_messages_party ON public.watch_party_messages(party_id, created_at DESC);

CREATE TRIGGER trg_watch_parties_updated_at
  BEFORE UPDATE ON public.watch_parties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_parties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_messages;

-- ============================================================
-- 3. CREATOR TIPPING / SUPER CHATS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.creator_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_creator_id UUID NOT NULL,
  video_id UUID,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  creator_amount NUMERIC(10,2) NOT NULL,
  message TEXT,
  is_super_chat BOOLEAN NOT NULL DEFAULT false,
  color_tier TEXT, -- for super chat display: blue/green/yellow/orange/magenta/red
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.creator_tips TO authenticated;
GRANT ALL ON public.creator_tips TO service_role;
ALTER TABLE public.creator_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see tips they sent or received"
  ON public.creator_tips FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_creator_id);
CREATE POLICY "Users insert own tips"
  ON public.creator_tips FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE INDEX IF NOT EXISTS idx_creator_tips_creator ON public.creator_tips(to_creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_tips_video ON public.creator_tips(video_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.send_creator_tip(
  _to_creator_id UUID,
  _amount NUMERIC,
  _video_id UUID DEFAULT NULL,
  _message TEXT DEFAULT NULL,
  _is_super_chat BOOLEAN DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  fee NUMERIC(10,2);
  creator_amt NUMERIC(10,2);
  color TEXT := NULL;
  ok BOOLEAN;
  tip_id UUID;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF uid = _to_creator_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_tip_self');
  END IF;
  IF _amount IS NULL OR _amount < 50 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount_too_small', 'min', 50);
  END IF;

  fee := ROUND(_amount * 0.10, 2);
  creator_amt := _amount - fee;

  IF _is_super_chat THEN
    color := CASE
      WHEN _amount >= 10000 THEN 'red'
      WHEN _amount >= 5000 THEN 'magenta'
      WHEN _amount >= 2000 THEN 'orange'
      WHEN _amount >= 1000 THEN 'yellow'
      WHEN _amount >= 500 THEN 'green'
      ELSE 'blue'
    END;
  END IF;

  -- Debit tipper
  ok := public.process_wallet_payment(uid, _amount, 'purchase',
    'Tip to creator' || COALESCE(' — ' || _message, ''),
    NULL);
  IF NOT ok THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  END IF;

  -- Credit creator
  PERFORM public.process_wallet_payment(_to_creator_id, creator_amt, 'earning',
    'Tip received from a fan' || COALESCE(' — ' || _message, ''), NULL);

  INSERT INTO public.creator_tips
    (from_user_id, to_creator_id, video_id, amount, platform_fee, creator_amount, message, is_super_chat, color_tier)
  VALUES (uid, _to_creator_id, _video_id, _amount, fee, creator_amt, _message, _is_super_chat, color)
  RETURNING id INTO tip_id;

  -- Notify creator
  INSERT INTO public.user_notifications (user_id, type, title, body, link)
  VALUES (_to_creator_id, 'tip',
    '💝 You received a tip!',
    'Someone sent you ₦' || creator_amt::TEXT || COALESCE(' — "' || _message || '"', ''),
    '/wallet');

  RETURN jsonb_build_object('ok', true, 'tip_id', tip_id, 'creator_amount', creator_amt, 'fee', fee, 'color', color);
END $$;

GRANT EXECUTE ON FUNCTION public.send_creator_tip(UUID, NUMERIC, UUID, TEXT, BOOLEAN) TO authenticated;

-- ============================================================
-- 4. AI WEEKLY DIGEST
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weekly_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_key TEXT NOT NULL, -- e.g. "2026-W29"
  content JSONB NOT NULL, -- { headline, highlights[], recommendations[], stats{} }
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  UNIQUE (user_id, week_key)
);

GRANT SELECT, INSERT, UPDATE ON public.weekly_digests TO authenticated;
GRANT ALL ON public.weekly_digests TO service_role;
ALTER TABLE public.weekly_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own digests"
  ON public.weekly_digests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users mark own digests opened"
  ON public.weekly_digests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_digests_user_week ON public.weekly_digests(user_id, week_key DESC);
