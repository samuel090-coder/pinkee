
-- 1. Watch party enhancements
ALTER TABLE public.watch_parties
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS ai_seed_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ai_viewer_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_ai_seed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_watch_parties_short_code ON public.watch_parties(short_code);
CREATE INDEX IF NOT EXISTS idx_watch_parties_expires ON public.watch_parties(expires_at) WHERE is_active = true;

-- Short code generator
CREATE OR REPLACE FUNCTION public.generate_party_short_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  i INT;
  taken BOOLEAN;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::INT, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.watch_parties WHERE short_code = code) INTO taken;
    EXIT WHEN NOT taken;
  END LOOP;
  RETURN code;
END $$;

-- Auto-assign short_code on insert
CREATE OR REPLACE FUNCTION public.set_party_short_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.short_code IS NULL THEN
    NEW.short_code := public.generate_party_short_code();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_party_short_code ON public.watch_parties;
CREATE TRIGGER trg_party_short_code BEFORE INSERT ON public.watch_parties
  FOR EACH ROW EXECUTE FUNCTION public.set_party_short_code();

-- Backfill short codes for existing parties
UPDATE public.watch_parties SET short_code = public.generate_party_short_code() WHERE short_code IS NULL;

-- Allow reading messages in public parties without auth
DROP POLICY IF EXISTS "Party messages viewable by participants/public" ON public.watch_party_messages;
CREATE POLICY "Anyone can read messages in public parties" ON public.watch_party_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.watch_parties p WHERE p.id = watch_party_messages.party_id AND (p.is_public OR p.host_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.watch_party_participants pp WHERE pp.party_id = watch_party_messages.party_id AND pp.user_id = auth.uid())
  );

GRANT SELECT ON public.watch_party_messages TO anon;
GRANT SELECT ON public.watch_parties TO anon;
GRANT SELECT ON public.watch_party_participants TO anon;

-- Auto-expire parties
CREATE OR REPLACE FUNCTION public.expire_watch_parties()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INTEGER;
BEGIN
  UPDATE public.watch_parties
     SET is_active = FALSE, ended_at = COALESCE(ended_at, now())
   WHERE is_active = TRUE
     AND expires_at IS NOT NULL
     AND expires_at <= now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- 2. AI comments/viewers table for watch parties
CREATE TABLE IF NOT EXISTS public.watch_party_ai_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.watch_parties(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_seed TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'chat' CHECK (message_type IN ('chat','reaction','join')),
  emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wp_ai_comments_party ON public.watch_party_ai_comments(party_id, created_at DESC);
GRANT SELECT ON public.watch_party_ai_comments TO anon, authenticated;
GRANT ALL ON public.watch_party_ai_comments TO service_role;
ALTER TABLE public.watch_party_ai_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read AI comments" ON public.watch_party_ai_comments FOR SELECT USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_ai_comments;

-- 3. User setting: hide weekly digest
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS hide_weekly_digest BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Realistic engagement engine — replace flat boost with variance + virality
CREATE OR REPLACE FUNCTION public.boost_new_video_engagement()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v RECORD;
  age_hours NUMERIC;
  quality_score NUMERIC;
  momentum NUMERIC;
  view_bump INTEGER;
  like_bump INTEGER;
  sub_bump INTEGER;
  virality_roll NUMERIC;
  category_mult NUMERIC;
  hourly_rate NUMERIC;
  seed_count INTEGER;
  add_comment BOOLEAN;
  names TEXT[] := ARRAY['Ava Morgan','Jordan Blake','Noah Kim','Zara Patel','Leo Martins','Maya Reyes','Ethan Cole','Chloe Nguyen','Marcus Bello','Sofia Adeyemi','Ryan Osei','Isabella Wong','Kai Anderson','Amara Johnson','Diego Silva','Lily Thompson','Jaden Park','Aria Singh','Malik Hassan','Nia Roberts','Tobi Adekunle','Emma Rossi','Lucas Chen','Zoey Ibrahim','Ben Carter'];
  lines TEXT[] := ARRAY['This is fire 🔥','Underrated!','How is this only just showing up','Instant follow','The quality is insane','Replayed this like 5 times','Editing is clean','You cooked with this','No because how did you do that??','Vibes ✨','Straight cinema 🎬','Been waiting for this','That ending caught me off guard','Bro is built different','So underrated it hurts','This slaps','New subscriber here 👋','This deserves way more views','Adding to my playlist','Perfect timing on that drop'];
  chosen_name TEXT; chosen_line TEXT;
BEGIN
  FOR v IN
    SELECT id, views, likes_count, comments_count, category, uploader_id, created_at,
           duration_seconds, thumbnail_url
      FROM public.videos
     WHERE is_published = TRUE
     ORDER BY created_at DESC
     LIMIT 1000
  LOOP
    age_hours := EXTRACT(EPOCH FROM (now() - v.created_at)) / 3600.0;

    -- Quality signal: engagement ratio (likes+comments per view)
    quality_score := CASE
      WHEN COALESCE(v.views,0) < 20 THEN 0.5  -- unknown, give benefit of doubt
      ELSE LEAST(1.0, (COALESCE(v.likes_count,0) + COALESCE(v.comments_count,0)*2.0) / GREATEST(v.views,1)::NUMERIC * 20)
    END;

    -- Skip videos with weak signal after they've had a chance
    IF age_hours > 48 AND quality_score < 0.15 AND COALESCE(v.views,0) < 100 THEN
      CONTINUE;
    END IF;

    -- Momentum: previous velocity
    momentum := COALESCE(v.views,0)::NUMERIC / GREATEST(age_hours, 1);

    -- Category multiplier
    category_mult := CASE lower(COALESCE(v.category,''))
      WHEN 'music' THEN 1.4
      WHEN 'gaming' THEN 1.2
      WHEN 'comedy' THEN 1.3
      WHEN 'entertainment' THEN 1.15
      WHEN 'sports' THEN 1.1
      ELSE 1.0
    END;

    -- Virality dice: rare exponential burst for high-quality videos
    virality_roll := random();
    IF quality_score > 0.6 AND virality_roll < 0.03 THEN
      -- Viral burst: 500-15000 views
      view_bump := (500 + floor(random() * 14500))::INT;
    ELSIF quality_score > 0.4 AND virality_roll < 0.10 THEN
      -- Mini burst: 50-500 views
      view_bump := (50 + floor(random() * 450))::INT;
    ELSE
      -- Organic drip proportional to momentum + quality
      hourly_rate := CASE
        WHEN age_hours < 1 THEN 10 + momentum * 2
        WHEN age_hours < 6 THEN 5 + momentum * 1.5
        WHEN age_hours < 24 THEN 2 + momentum * 1.2
        WHEN age_hours < 72 THEN 1 + momentum * 0.8
        WHEN age_hours < 168 THEN momentum * 0.5
        ELSE momentum * 0.2
      END;
      view_bump := GREATEST(0, floor(hourly_rate * quality_score * category_mult * (0.5 + random()))::INT);
    END IF;

    -- Cap absurd single-tick bumps
    view_bump := LEAST(view_bump, 20000);

    like_bump := GREATEST(0, floor(view_bump * (0.02 + quality_score * 0.05 + random() * 0.02))::INT);

    -- Subscribers to the creator: rare, only on quality+momentum, ~1 per 500 real quality views
    sub_bump := 0;
    IF v.uploader_id IS NOT NULL AND quality_score > 0.35 AND view_bump > 50 THEN
      sub_bump := GREATEST(0, floor(view_bump / 500.0 * quality_score * (0.5 + random()))::INT);
      IF sub_bump > 0 THEN
        UPDATE public.profiles
           SET subscribers_count = COALESCE(subscribers_count,0) + sub_bump
         WHERE user_id = v.uploader_id;
      END IF;
    END IF;

    IF view_bump = 0 AND like_bump = 0 THEN CONTINUE; END IF;

    UPDATE public.videos
       SET views = COALESCE(views,0) + view_bump,
           likes_count = COALESCE(likes_count,0) + like_bump,
           reactions = COALESCE(reactions,0) + like_bump
     WHERE id = v.id;

    -- Comments: rate depends on virality + freshness
    SELECT COUNT(*) INTO seed_count FROM public.seed_comments WHERE video_id = v.id;
    add_comment := seed_count < 60 AND view_bump > 20 AND random() < LEAST(0.6, quality_score);

    IF add_comment THEN
      chosen_name := names[1 + floor(random() * array_length(names,1))::INT];
      chosen_line := lines[1 + floor(random() * array_length(lines,1))::INT];
      INSERT INTO public.seed_comments (video_id, display_name, avatar_url, content, likes_count)
      VALUES (v.id, chosen_name,
        'https://api.dicebear.com/7.x/avataaars/svg?seed=' || replace(chosen_name,' ',''),
        chosen_line, floor(random() * 50)::INT);
      UPDATE public.videos SET comments_count = COALESCE(comments_count,0) + 1 WHERE id = v.id;
    END IF;
  END LOOP;
END $$;
