ALTER TABLE public.admin_settings 
  ADD COLUMN IF NOT EXISTS youtube_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS youtube_channel_id text DEFAULT 'UCJ5v_MCY6GNUBTO8-D3XoAg';