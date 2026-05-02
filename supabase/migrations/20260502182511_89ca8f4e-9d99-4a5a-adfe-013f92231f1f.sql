-- page_views: lightweight tracking for any route in the app
CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  device TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_views_path ON public.page_views(path);
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX idx_page_views_user_id ON public.page_views(user_id);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a page view"
  ON public.page_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Moderators can read page views"
  ON public.page_views FOR SELECT
  USING (public.is_moderator(auth.uid()));

-- video_watch_events: tracks how much of a video was watched
CREATE TABLE public.video_watch_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  video_id UUID,
  tmdb_id INTEGER,
  media_type TEXT,
  title TEXT,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  total_seconds INTEGER,
  percent_watched NUMERIC,
  reached_threshold BOOLEAN NOT NULL DEFAULT false,
  completed BOOLEAN NOT NULL DEFAULT false,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_vwe_video_id ON public.video_watch_events(video_id);
CREATE INDEX idx_vwe_created_at ON public.video_watch_events(created_at DESC);
CREATE INDEX idx_vwe_user_id ON public.video_watch_events(user_id);

ALTER TABLE public.video_watch_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a watch event"
  ON public.video_watch_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Moderators can read watch events"
  ON public.video_watch_events FOR SELECT
  USING (public.is_moderator(auth.uid()));