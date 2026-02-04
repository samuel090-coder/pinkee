-- Add user currency preference (default Nigeria)
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NGN';

-- Enable realtime updates for dashboard feed (videos table)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;