
-- =====================================================
-- REWARD CENTER + MISSIONS
-- =====================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.reward_status AS ENUM ('pending','approved','rejected','reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mission_period AS ENUM ('daily','weekly','monthly','seasonal','one_time');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.redemption_status AS ENUM ('pending','approved','rejected','paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- REWARD SETTINGS ----------
CREATE TABLE IF NOT EXISTS public.reward_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ngn_per_point NUMERIC(10,4) NOT NULL DEFAULT 1.0000,
  min_redemption_points INTEGER NOT NULL DEFAULT 500,
  daily_checkin_points INTEGER NOT NULL DEFAULT 10,
  streak_bonus_points INTEGER NOT NULL DEFAULT 5,
  streak_bonus_every INTEGER NOT NULL DEFAULT 7,
  referral_points_referrer INTEGER NOT NULL DEFAULT 200,
  referral_points_referred INTEGER NOT NULL DEFAULT 100,
  max_points_per_user_per_day INTEGER NOT NULL DEFAULT 1000,
  max_points_per_ip_per_day INTEGER NOT NULL DEFAULT 1500,
  require_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT ON public.reward_settings TO anon, authenticated;
GRANT ALL ON public.reward_settings TO service_role;
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reward settings"
  ON public.reward_settings FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage reward settings"
  ON public.reward_settings FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.reward_settings (id) VALUES (TRUE) ON CONFLICT DO NOTHING;

-- ---------- REWARD ACTIVITIES ----------
CREATE TABLE IF NOT EXISTS public.reward_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'engagement',
  icon TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  cooldown_seconds INTEGER NOT NULL DEFAULT 0,
  daily_cap INTEGER,
  total_cap INTEGER,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reward_activities TO anon, authenticated;
GRANT ALL ON public.reward_activities TO service_role;
ALTER TABLE public.reward_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled activities"
  ON public.reward_activities FOR SELECT USING (enabled OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage activities"
  ON public.reward_activities FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- REWARD MISSIONS ----------
CREATE TABLE IF NOT EXISTS public.reward_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  period public.mission_period NOT NULL DEFAULT 'daily',
  activity_code TEXT,
  target_count INTEGER NOT NULL DEFAULT 1,
  reward_points INTEGER NOT NULL DEFAULT 50,
  icon TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reward_missions TO anon, authenticated;
GRANT ALL ON public.reward_missions TO service_role;
ALTER TABLE public.reward_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled missions"
  ON public.reward_missions FOR SELECT USING (enabled OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage missions"
  ON public.reward_missions FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- USER REWARDS (wallet) ----------
CREATE TABLE IF NOT EXISTS public.user_rewards (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  lifetime_ngn NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_at TIMESTAMPTZ,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_rewards TO authenticated;
GRANT ALL ON public.user_rewards TO service_role;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own rewards"
  ON public.user_rewards FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update rewards"
  ON public.user_rewards FOR UPDATE
  USING (public.has_role(auth.uid(),'admin'));

-- ---------- REWARD LEDGER ----------
CREATE TABLE IF NOT EXISTS public.reward_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_code TEXT,
  mission_id UUID REFERENCES public.reward_missions(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  status public.reward_status NOT NULL DEFAULT 'approved',
  source TEXT NOT NULL DEFAULT 'system',
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ip_address TEXT,
  device_fingerprint TEXT,
  idempotency_key TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reward_ledger_idem_idx
  ON public.reward_ledger (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS reward_ledger_user_created_idx
  ON public.reward_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reward_ledger_status_idx
  ON public.reward_ledger (status, created_at DESC);

GRANT SELECT ON public.reward_ledger TO authenticated;
GRANT ALL ON public.reward_ledger TO service_role;
ALTER TABLE public.reward_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own ledger"
  ON public.reward_ledger FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage ledger"
  ON public.reward_ledger FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- USER MISSION PROGRESS ----------
CREATE TABLE IF NOT EXISTS public.user_mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.reward_missions(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id, period_key)
);

GRANT SELECT, INSERT, UPDATE ON public.user_mission_progress TO authenticated;
GRANT ALL ON public.user_mission_progress TO service_role;
ALTER TABLE public.user_mission_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own mission progress"
  ON public.user_mission_progress FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage mission progress"
  ON public.user_mission_progress FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- REFERRALS ----------
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referred_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_id);

GRANT SELECT, INSERT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage referrals"
  ON public.referrals FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- REWARD REDEMPTIONS ----------
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  ngn_amount NUMERIC(14,2) NOT NULL,
  status public.redemption_status NOT NULL DEFAULT 'approved',
  notes TEXT,
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage redemptions"
  ON public.reward_redemptions FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- updated_at triggers ----------
DROP TRIGGER IF EXISTS trg_reward_settings_updated ON public.reward_settings;
CREATE TRIGGER trg_reward_settings_updated BEFORE UPDATE ON public.reward_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_reward_activities_updated ON public.reward_activities;
CREATE TRIGGER trg_reward_activities_updated BEFORE UPDATE ON public.reward_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_reward_missions_updated ON public.reward_missions;
CREATE TRIGGER trg_reward_missions_updated BEFORE UPDATE ON public.reward_missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_rewards_updated ON public.user_rewards;
CREATE TRIGGER trg_user_rewards_updated BEFORE UPDATE ON public.user_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_mission_progress_updated ON public.user_mission_progress;
CREATE TRIGGER trg_user_mission_progress_updated BEFORE UPDATE ON public.user_mission_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Period key helper (UTC)
CREATE OR REPLACE FUNCTION public.mission_period_key(_period public.mission_period, _at TIMESTAMPTZ DEFAULT now())
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _period
    WHEN 'daily' THEN to_char(_at AT TIME ZONE 'UTC','YYYY-MM-DD')
    WHEN 'weekly' THEN to_char(_at AT TIME ZONE 'UTC','IYYY-"W"IW')
    WHEN 'monthly' THEN to_char(_at AT TIME ZONE 'UTC','YYYY-MM')
    WHEN 'seasonal' THEN to_char(_at AT TIME ZONE 'UTC','YYYY-"Q"Q')
    ELSE 'all-time'
  END
$$;

-- Ensure a user_rewards row exists
CREATE OR REPLACE FUNCTION public.ensure_user_rewards(_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_rewards (user_id) VALUES (_user)
  ON CONFLICT (user_id) DO NOTHING;
END $$;

-- Core: credit points (atomic), enforce daily caps, idempotency
CREATE OR REPLACE FUNCTION public.credit_reward_points(
  _user UUID,
  _points INTEGER,
  _activity_code TEXT,
  _mission_id UUID,
  _source TEXT,
  _description TEXT,
  _metadata JSONB,
  _idempotency TEXT,
  _ip TEXT,
  _device TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s RECORD;
  today_total INTEGER;
  ip_today_total INTEGER;
  existing_id UUID;
  new_id UUID;
BEGIN
  IF _points <= 0 THEN
    RETURN jsonb_build_object('ok',false,'error','points_must_be_positive');
  END IF;

  SELECT * INTO s FROM public.reward_settings WHERE id IS TRUE;
  IF NOT s.enabled THEN
    RETURN jsonb_build_object('ok',false,'error','rewards_disabled');
  END IF;

  -- Idempotency
  IF _idempotency IS NOT NULL THEN
    SELECT id INTO existing_id FROM public.reward_ledger
      WHERE user_id = _user AND idempotency_key = _idempotency LIMIT 1;
    IF existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok',true,'duplicate',true,'ledger_id',existing_id);
    END IF;
  END IF;

  PERFORM public.ensure_user_rewards(_user);

  -- Daily cap per user
  SELECT COALESCE(SUM(points),0) INTO today_total
    FROM public.reward_ledger
   WHERE user_id = _user
     AND status = 'approved'
     AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
  IF today_total + _points > s.max_points_per_user_per_day THEN
    INSERT INTO public.reward_ledger
      (user_id, activity_code, mission_id, points, status, source, description, metadata, ip_address, device_fingerprint, idempotency_key)
    VALUES (_user, _activity_code, _mission_id, _points, 'rejected', _source,
            COALESCE(_description,'')||' [daily_user_cap]', _metadata, _ip, _device, _idempotency)
    RETURNING id INTO new_id;
    RETURN jsonb_build_object('ok',false,'error','daily_user_cap','ledger_id',new_id);
  END IF;

  -- Daily cap per IP
  IF _ip IS NOT NULL THEN
    SELECT COALESCE(SUM(points),0) INTO ip_today_total
      FROM public.reward_ledger
     WHERE ip_address = _ip
       AND status = 'approved'
       AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
    IF ip_today_total + _points > s.max_points_per_ip_per_day THEN
      INSERT INTO public.reward_ledger
        (user_id, activity_code, mission_id, points, status, source, description, metadata, ip_address, device_fingerprint, idempotency_key)
      VALUES (_user, _activity_code, _mission_id, _points, 'rejected', _source,
              COALESCE(_description,'')||' [daily_ip_cap]', _metadata, _ip, _device, _idempotency)
      RETURNING id INTO new_id;
      RETURN jsonb_build_object('ok',false,'error','daily_ip_cap','ledger_id',new_id);
    END IF;
  END IF;

  -- Insert approved ledger entry
  INSERT INTO public.reward_ledger
    (user_id, activity_code, mission_id, points, status, source, description, metadata, ip_address, device_fingerprint, idempotency_key)
  VALUES (_user, _activity_code, _mission_id, _points, 'approved', _source, _description, _metadata, _ip, _device, _idempotency)
  RETURNING id INTO new_id;

  -- Update balance
  UPDATE public.user_rewards
     SET points_balance = points_balance + _points,
         lifetime_points = lifetime_points + _points,
         updated_at = now()
   WHERE user_id = _user;

  RETURN jsonb_build_object('ok',true,'ledger_id',new_id,'points',_points);
END $$;

GRANT EXECUTE ON FUNCTION public.credit_reward_points(UUID,INTEGER,TEXT,UUID,TEXT,TEXT,JSONB,TEXT,TEXT,TEXT) TO authenticated, service_role;

-- Public RPC: claim an activity (cooldown + caps enforced)
CREATE OR REPLACE FUNCTION public.claim_activity(
  _activity_code TEXT,
  _idempotency TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::JSONB,
  _device TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a RECORD;
  uid UUID := auth.uid();
  last_at TIMESTAMPTZ;
  today_count INTEGER;
  total_count INTEGER;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;

  SELECT * INTO a FROM public.reward_activities WHERE code = _activity_code AND enabled = TRUE;
  IF a IS NULL THEN RETURN jsonb_build_object('ok',false,'error','activity_not_found'); END IF;

  -- Cooldown
  IF a.cooldown_seconds > 0 THEN
    SELECT MAX(created_at) INTO last_at FROM public.reward_ledger
      WHERE user_id = uid AND activity_code = a.code AND status = 'approved';
    IF last_at IS NOT NULL AND last_at > now() - make_interval(secs => a.cooldown_seconds) THEN
      RETURN jsonb_build_object('ok',false,'error','cooldown',
        'next_at', last_at + make_interval(secs => a.cooldown_seconds));
    END IF;
  END IF;

  -- Per-activity daily cap (count)
  IF a.daily_cap IS NOT NULL THEN
    SELECT COUNT(*) INTO today_count FROM public.reward_ledger
      WHERE user_id = uid AND activity_code = a.code AND status = 'approved'
        AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');
    IF today_count >= a.daily_cap THEN
      RETURN jsonb_build_object('ok',false,'error','daily_cap_reached');
    END IF;
  END IF;

  IF a.total_cap IS NOT NULL THEN
    SELECT COUNT(*) INTO total_count FROM public.reward_ledger
      WHERE user_id = uid AND activity_code = a.code AND status = 'approved';
    IF total_count >= a.total_cap THEN
      RETURN jsonb_build_object('ok',false,'error','total_cap_reached');
    END IF;
  END IF;

  RETURN public.credit_reward_points(uid, a.points, a.code, NULL, 'activity', a.name, _metadata, _idempotency, NULL, _device);
END $$;

GRANT EXECUTE ON FUNCTION public.claim_activity(TEXT,TEXT,JSONB,TEXT) TO authenticated;

-- Public RPC: daily check-in with streak
CREATE OR REPLACE FUNCTION public.claim_daily_checkin(_device TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  s RECORD;
  ur RECORD;
  last_day DATE;
  today DATE := (now() AT TIME ZONE 'UTC')::DATE;
  new_streak INTEGER;
  total_points INTEGER;
  bonus INTEGER := 0;
  result JSONB;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  PERFORM public.ensure_user_rewards(uid);

  SELECT * INTO s FROM public.reward_settings WHERE id IS TRUE;
  SELECT * INTO ur FROM public.user_rewards WHERE user_id = uid FOR UPDATE;

  last_day := (ur.last_checkin_at AT TIME ZONE 'UTC')::DATE;
  IF last_day = today THEN
    RETURN jsonb_build_object('ok',false,'error','already_checked_in_today');
  END IF;

  IF last_day = today - 1 THEN
    new_streak := COALESCE(ur.current_streak,0) + 1;
  ELSE
    new_streak := 1;
  END IF;

  IF s.streak_bonus_every > 0 AND new_streak % s.streak_bonus_every = 0 THEN
    bonus := s.streak_bonus_points;
  END IF;
  total_points := s.daily_checkin_points + bonus;

  UPDATE public.user_rewards
     SET current_streak = new_streak,
         longest_streak = GREATEST(longest_streak, new_streak),
         last_checkin_at = now()
   WHERE user_id = uid;

  result := public.credit_reward_points(
    uid, total_points, 'daily_checkin', NULL, 'checkin',
    'Daily check-in (streak '||new_streak||')',
    jsonb_build_object('streak',new_streak,'bonus',bonus),
    'checkin:'||uid::TEXT||':'||today::TEXT, NULL, _device
  );

  RETURN result || jsonb_build_object('streak',new_streak,'bonus',bonus,'points',total_points);
END $$;

GRANT EXECUTE ON FUNCTION public.claim_daily_checkin(TEXT) TO authenticated;

-- Public RPC: increment mission progress (called from app when an action happens)
CREATE OR REPLACE FUNCTION public.increment_mission_progress(
  _activity_code TEXT,
  _amount INTEGER DEFAULT 1
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  m RECORD;
  pk TEXT;
  prog RECORD;
  affected INTEGER := 0;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;

  FOR m IN
    SELECT * FROM public.reward_missions
     WHERE enabled = TRUE
       AND activity_code = _activity_code
       AND (starts_at IS NULL OR starts_at <= now())
       AND (ends_at IS NULL OR ends_at >= now())
  LOOP
    pk := public.mission_period_key(m.period);
    INSERT INTO public.user_mission_progress (user_id, mission_id, period_key, progress)
    VALUES (uid, m.id, pk, _amount)
    ON CONFLICT (user_id, mission_id, period_key)
    DO UPDATE SET progress = user_mission_progress.progress + _amount,
                  updated_at = now()
    RETURNING * INTO prog;

    IF prog.progress >= m.target_count AND prog.completed_at IS NULL THEN
      UPDATE public.user_mission_progress
         SET completed_at = now()
       WHERE id = prog.id;
    END IF;
    affected := affected + 1;
  END LOOP;

  RETURN jsonb_build_object('ok',true,'missions_updated',affected);
END $$;

GRANT EXECUTE ON FUNCTION public.increment_mission_progress(TEXT,INTEGER) TO authenticated;

-- Public RPC: claim mission reward
CREATE OR REPLACE FUNCTION public.claim_mission_reward(_mission_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  m RECORD;
  pk TEXT;
  prog RECORD;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;

  SELECT * INTO m FROM public.reward_missions WHERE id = _mission_id AND enabled = TRUE;
  IF m IS NULL THEN RETURN jsonb_build_object('ok',false,'error','mission_not_found'); END IF;

  pk := public.mission_period_key(m.period);
  SELECT * INTO prog FROM public.user_mission_progress
    WHERE user_id = uid AND mission_id = m.id AND period_key = pk FOR UPDATE;

  IF prog IS NULL OR prog.progress < m.target_count THEN
    RETURN jsonb_build_object('ok',false,'error','not_completed');
  END IF;
  IF prog.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok',false,'error','already_claimed');
  END IF;

  UPDATE public.user_mission_progress SET claimed_at = now() WHERE id = prog.id;

  RETURN public.credit_reward_points(
    uid, m.reward_points, m.activity_code, m.id, 'mission',
    'Mission: '||m.title, jsonb_build_object('period_key',pk),
    'mission:'||m.id::TEXT||':'||pk, NULL, NULL
  );
END $$;

GRANT EXECUTE ON FUNCTION public.claim_mission_reward(UUID) TO authenticated;

-- Public RPC: register a referral (called once at signup)
CREATE OR REPLACE FUNCTION public.register_referral(_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  referrer UUID;
  s RECORD;
  existing UUID;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  IF _code IS NULL OR length(_code) < 4 THEN RETURN jsonb_build_object('ok',false,'error','invalid_code'); END IF;

  SELECT id INTO existing FROM public.referrals WHERE referred_id = uid;
  IF existing IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','already_referred'); END IF;

  SELECT user_id INTO referrer FROM public.profiles WHERE username = _code OR user_id::TEXT = _code LIMIT 1;
  IF referrer IS NULL OR referrer = uid THEN RETURN jsonb_build_object('ok',false,'error','invalid_referrer'); END IF;

  SELECT * INTO s FROM public.reward_settings WHERE id IS TRUE;

  INSERT INTO public.referrals (referrer_id, referred_id, code, status, rewarded_at)
  VALUES (referrer, uid, _code, 'rewarded', now());

  PERFORM public.credit_reward_points(referrer, s.referral_points_referrer, 'referral', NULL, 'referral',
    'Referral bonus', jsonb_build_object('referred_id',uid),
    'ref:'||referrer::TEXT||':'||uid::TEXT, NULL, NULL);
  PERFORM public.credit_reward_points(uid, s.referral_points_referred, 'referred_signup', NULL, 'referral',
    'Welcome bonus', jsonb_build_object('referrer_id',referrer),
    'ref-welcome:'||uid::TEXT, NULL, NULL);

  RETURN jsonb_build_object('ok',true);
END $$;

GRANT EXECUTE ON FUNCTION public.register_referral(TEXT) TO authenticated;

-- Public RPC: redeem points → wallet (NGN)
CREATE OR REPLACE FUNCTION public.redeem_points_to_wallet(_points INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid UUID := auth.uid();
  s RECORD;
  ur RECORD;
  ngn NUMERIC(14,2);
  ok BOOLEAN;
  redemption_id UUID;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_authenticated'); END IF;
  IF _points IS NULL OR _points <= 0 THEN RETURN jsonb_build_object('ok',false,'error','invalid_amount'); END IF;

  SELECT * INTO s FROM public.reward_settings WHERE id IS TRUE;
  IF _points < s.min_redemption_points THEN
    RETURN jsonb_build_object('ok',false,'error','below_minimum','min',s.min_redemption_points);
  END IF;

  SELECT * INTO ur FROM public.user_rewards WHERE user_id = uid FOR UPDATE;
  IF ur IS NULL OR ur.points_balance < _points THEN
    RETURN jsonb_build_object('ok',false,'error','insufficient_points');
  END IF;
  IF ur.flagged THEN
    RETURN jsonb_build_object('ok',false,'error','account_flagged');
  END IF;

  ngn := (_points::NUMERIC * s.ngn_per_point)::NUMERIC(14,2);

  UPDATE public.user_rewards
     SET points_balance = points_balance - _points,
         lifetime_ngn = lifetime_ngn + ngn
   WHERE user_id = uid;

  INSERT INTO public.reward_redemptions (user_id, points, ngn_amount, status, processed_at)
  VALUES (uid, _points, ngn, 'paid', now())
  RETURNING id INTO redemption_id;

  INSERT INTO public.reward_ledger (user_id, points, status, source, description, metadata)
  VALUES (uid, -_points, 'approved', 'redemption',
          'Redeemed '||_points||' pts → ₦'||ngn,
          jsonb_build_object('redemption_id',redemption_id,'ngn',ngn));

  ok := public.process_wallet_payment(uid, ngn, 'earning', 'Reward Center redemption', redemption_id::TEXT);

  RETURN jsonb_build_object('ok',ok,'redemption_id',redemption_id,'ngn',ngn);
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_points_to_wallet(INTEGER) TO authenticated;

-- =====================================================
-- SEED: default activities & missions (admin can edit)
-- =====================================================

INSERT INTO public.reward_activities (code,name,description,category,points,cooldown_seconds,daily_cap,sort_order)
VALUES
  ('daily_checkin','Daily check-in','Open the app every day to claim your reward','checkin',10,0,1,1),
  ('watch_video','Watch a video','Watch any video to completion','engagement',2,60,20,2),
  ('like_video','Like a video','Support creators with a like','engagement',1,30,15,3),
  ('comment_video','Leave a comment','Engage thoughtfully with creators','engagement',3,120,10,4),
  ('share_video','Share a video','Share Pinkee content with friends','engagement',5,300,5,5),
  ('complete_profile','Complete your profile','Add avatar, bio and username','onboarding',50,0,1,6),
  ('upload_video','Upload a video','Publish original content','creator',25,0,3,7),
  ('subscribe_creator','Subscribe to a creator','Follow new creators you love','engagement',2,60,10,8)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.reward_missions (code,title,description,period,activity_code,target_count,reward_points,sort_order)
VALUES
  ('daily_watch_5','Watch 5 videos today','Discover what''s trending today','daily','watch_video',5,30,1),
  ('daily_engage_3','Engage 3 times today','Like, comment or share to support creators','daily','like_video',3,20,2),
  ('weekly_watch_30','Watch 30 videos this week','Stay tuned in all week','weekly','watch_video',30,200,3),
  ('weekly_creator_1','Upload 1 video this week','Keep creating consistently','weekly','upload_video',1,500,4),
  ('monthly_invite_5','Invite 5 friends this month','Grow the Pinkee community','monthly','referral',5,1500,5)
ON CONFLICT (code) DO NOTHING;
