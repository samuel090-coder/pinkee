
CREATE TABLE IF NOT EXISTS public.stream_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_name text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('movie','tv')),
  tmdb_id integer NOT NULL,
  season integer,
  episode integer,
  embed_url text,
  error_reason text,
  user_id uuid,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stream_failures_created_at ON public.stream_failures (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stream_failures_server ON public.stream_failures (server_name);
CREATE INDEX IF NOT EXISTS idx_stream_failures_tmdb ON public.stream_failures (media_type, tmdb_id);

ALTER TABLE public.stream_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log stream failures"
  ON public.stream_failures FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Moderators can read stream failures"
  ON public.stream_failures FOR SELECT
  TO public
  USING (public.is_moderator(auth.uid()));
