
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
    SELECT id, views, likes_count, comments_count, category, uploader_id, created_at, duration_seconds, thumbnail_url
      FROM public.videos WHERE is_published = TRUE ORDER BY created_at DESC LIMIT 1000
  LOOP
    age_hours := EXTRACT(EPOCH FROM (now() - v.created_at)) / 3600.0;
    quality_score := CASE
      WHEN COALESCE(v.views,0) < 20 THEN 0.5
      ELSE LEAST(1.0, (COALESCE(v.likes_count,0) + COALESCE(v.comments_count,0)*2.0) / GREATEST(v.views,1)::NUMERIC * 20)
    END;
    IF age_hours > 48 AND quality_score < 0.15 AND COALESCE(v.views,0) < 100 THEN CONTINUE; END IF;
    momentum := COALESCE(v.views,0)::NUMERIC / GREATEST(age_hours, 1);
    category_mult := CASE lower(COALESCE(v.category,''))
      WHEN 'music' THEN 1.4 WHEN 'gaming' THEN 1.2 WHEN 'comedy' THEN 1.3
      WHEN 'entertainment' THEN 1.15 WHEN 'sports' THEN 1.1 ELSE 1.0 END;
    virality_roll := random();
    IF quality_score > 0.6 AND virality_roll < 0.03 THEN
      view_bump := (500 + floor(random() * 14500))::INT;
    ELSIF quality_score > 0.4 AND virality_roll < 0.10 THEN
      view_bump := (50 + floor(random() * 450))::INT;
    ELSE
      hourly_rate := CASE
        WHEN age_hours < 1 THEN 10 + momentum * 2
        WHEN age_hours < 6 THEN 5 + momentum * 1.5
        WHEN age_hours < 24 THEN 2 + momentum * 1.2
        WHEN age_hours < 72 THEN 1 + momentum * 0.8
        WHEN age_hours < 168 THEN momentum * 0.5
        ELSE momentum * 0.2 END;
      view_bump := GREATEST(0, floor(hourly_rate * quality_score * category_mult * (0.5 + random()))::INT);
    END IF;
    view_bump := LEAST(view_bump, 20000);
    like_bump := GREATEST(0, floor(view_bump * (0.02 + quality_score * 0.05 + random() * 0.02))::INT);
    sub_bump := 0;
    IF v.uploader_id IS NOT NULL AND quality_score > 0.35 AND view_bump > 50 THEN
      sub_bump := GREATEST(0, floor(view_bump / 500.0 * quality_score * (0.5 + random()))::INT);
      IF sub_bump > 0 THEN
        UPDATE public.profiles SET subscriber_count = COALESCE(subscriber_count,0) + sub_bump WHERE user_id = v.uploader_id;
      END IF;
    END IF;
    IF view_bump = 0 AND like_bump = 0 THEN CONTINUE; END IF;
    UPDATE public.videos SET views = COALESCE(views,0) + view_bump, likes_count = COALESCE(likes_count,0) + like_bump, reactions = COALESCE(reactions,0) + like_bump WHERE id = v.id;
    SELECT COUNT(*) INTO seed_count FROM public.seed_comments WHERE video_id = v.id;
    add_comment := seed_count < 60 AND view_bump > 20 AND random() < LEAST(0.6, quality_score);
    IF add_comment THEN
      chosen_name := names[1 + floor(random() * array_length(names,1))::INT];
      chosen_line := lines[1 + floor(random() * array_length(lines,1))::INT];
      INSERT INTO public.seed_comments (video_id, display_name, avatar_url, content, likes_count)
      VALUES (v.id, chosen_name, 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || replace(chosen_name,' ',''), chosen_line, floor(random() * 50)::INT);
      UPDATE public.videos SET comments_count = COALESCE(comments_count,0) + 1 WHERE id = v.id;
    END IF;
  END LOOP;
END $$;
