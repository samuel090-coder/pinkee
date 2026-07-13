
CREATE TABLE IF NOT EXISTS public.seed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  content TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seed_comments_video ON public.seed_comments(video_id, created_at DESC);

GRANT SELECT ON public.seed_comments TO anon, authenticated;
GRANT ALL ON public.seed_comments TO service_role;

ALTER TABLE public.seed_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seed comments are publicly readable"
  ON public.seed_comments FOR SELECT USING (true);

CREATE POLICY "Admins manage seed comments"
  ON public.seed_comments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.seed_comments;

CREATE OR REPLACE FUNCTION public.boost_new_video_engagement()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  age_hours NUMERIC;
  view_bump INTEGER;
  like_bump INTEGER;
  add_comment BOOLEAN;
  names TEXT[] := ARRAY[
    'Ava Morgan','Jordan Blake','Noah Kim','Zara Patel','Leo Martins',
    'Maya Reyes','Ethan Cole','Chloe Nguyen','Marcus Bello','Sofia Adeyemi',
    'Ryan Osei','Isabella Wong','Kai Anderson','Amara Johnson','Diego Silva',
    'Lily Thompson','Jaden Park','Aria Singh','Malik Hassan','Nia Roberts',
    'Tobi Adekunle','Emma Rossi','Lucas Chen','Zoey Ibrahim','Ben Carter',
    'Riya Kapoor','Omar Farouk','Grace Wallace','Kenji Tanaka','Yara Diallo'
  ];
  lines TEXT[] := ARRAY[
    'This is fire 🔥','Underrated content, keep going!','Bro this deserves way more views',
    'How is this only just showing up on my feed 😭','Instant follow','The quality is insane',
    'Replayed this like 5 times already','Wait this is actually so good','Editing is clean 🔥',
    'You cooked with this one','First!!','No because how did you do that??',
    'This popped up right when I needed it','Sending this to my group chat rn','Vibes ✨',
    'Straight cinema 🎬','Notification squad where you at','Your content is elite',
    'Been waiting for someone to post this','The transitions >>>','This slaps',
    'Okay you got a new subscriber','I could watch this on loop','That ending caught me off guard',
    'Bro is built different','Add me to the notification list please','So underrated it hurts',
    'Instant like from me','This gave me goosebumps','Legend behavior 👑'
  ];
  avatars TEXT[] := ARRAY[
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Ava',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Noah',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Zara',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Chloe',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Kai',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Amara',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Diego',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Omar'
  ];
  chosen_name TEXT;
  chosen_line TEXT;
  chosen_avatar TEXT;
  seed_count INTEGER;
BEGIN
  FOR v IN
    SELECT id, views, likes_count, comments_count, created_at
    FROM public.videos
    WHERE is_published = TRUE
      AND created_at > now() - INTERVAL '14 days'
    ORDER BY created_at DESC
    LIMIT 500
  LOOP
    age_hours := EXTRACT(EPOCH FROM (now() - v.created_at)) / 3600.0;

    IF age_hours < 1 THEN
      view_bump := 20 + floor(random() * 60)::INT;
    ELSIF age_hours < 6 THEN
      view_bump := 8  + floor(random() * 25)::INT;
    ELSIF age_hours < 24 THEN
      view_bump := 3  + floor(random() * 12)::INT;
    ELSIF age_hours < 72 THEN
      view_bump := 1  + floor(random() * 6)::INT;
    ELSE
      view_bump := CASE WHEN random() < 0.5 THEN 1 + floor(random() * 3)::INT ELSE 0 END;
    END IF;

    like_bump := GREATEST(0, floor(view_bump * (0.03 + random() * 0.05))::INT);

    IF age_hours < 1 THEN
      add_comment := random() < 0.55;
    ELSIF age_hours < 24 THEN
      add_comment := random() < 0.20;
    ELSE
      add_comment := random() < 0.05;
    END IF;

    SELECT COUNT(*) INTO seed_count FROM public.seed_comments WHERE video_id = v.id;
    IF seed_count >= 40 THEN
      add_comment := FALSE;
    END IF;

    UPDATE public.videos
    SET views = COALESCE(views,0) + view_bump,
        likes_count = COALESCE(likes_count,0) + like_bump,
        reactions = COALESCE(reactions,0) + like_bump
    WHERE id = v.id;

    IF add_comment THEN
      chosen_name := names[1 + floor(random() * array_length(names,1))::INT];
      chosen_line := lines[1 + floor(random() * array_length(lines,1))::INT];
      chosen_avatar := avatars[1 + floor(random() * array_length(avatars,1))::INT];

      INSERT INTO public.seed_comments (video_id, display_name, avatar_url, content, likes_count)
      VALUES (v.id, chosen_name, chosen_avatar, chosen_line, floor(random() * 25)::INT);

      UPDATE public.videos
      SET comments_count = COALESCE(comments_count,0) + 1
      WHERE id = v.id;
    END IF;
  END LOOP;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'boost_new_video_engagement') THEN
    PERFORM cron.unschedule('boost_new_video_engagement');
  END IF;
  PERFORM cron.schedule(
    'boost_new_video_engagement',
    '*/2 * * * *',
    $cron$ SELECT public.boost_new_video_engagement(); $cron$
  );
END $$;
