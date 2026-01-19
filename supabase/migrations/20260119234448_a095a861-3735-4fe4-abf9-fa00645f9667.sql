-- Table to track sound usage in videos (for revenue calculation)
CREATE TABLE public.sound_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL, -- The person who used the sound
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, track_id)
);

-- Artist earnings table for tracking revenue
CREATE TABLE public.artist_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  pending_withdrawal NUMERIC NOT NULL DEFAULT 0,
  last_payout_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(artist_id, track_id)
);

-- Withdrawal requests for artists
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, completed
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- In-app notifications table for comprehensive notifications
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'video_upload', 'comment', 'like', 'subscribe', 'earnings', 'withdrawal', etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  image_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.sound_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Sound usages policies
CREATE POLICY "Sound usages are publicly readable" ON public.sound_usages FOR SELECT USING (true);
CREATE POLICY "Users can track their sound usage" ON public.sound_usages FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users can delete their sound usage" ON public.sound_usages FOR DELETE USING (auth.uid() = creator_id);

-- Artist earnings policies  
CREATE POLICY "Artists can view own earnings" ON public.artist_earnings FOR SELECT USING (auth.uid() = artist_id);
CREATE POLICY "System can insert earnings" ON public.artist_earnings FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update earnings" ON public.artist_earnings FOR UPDATE USING (true);

-- Withdrawal requests policies
CREATE POLICY "Artists can view own withdrawals" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = artist_id OR is_moderator(auth.uid()));
CREATE POLICY "Artists can request withdrawals" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Moderators can update withdrawals" ON public.withdrawal_requests FOR UPDATE USING (is_moderator(auth.uid()));

-- User notifications policies
CREATE POLICY "Users can view own notifications" ON public.user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can create notifications" ON public.user_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.user_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.user_notifications FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_sound_usages_track ON public.sound_usages(track_id);
CREATE INDEX idx_sound_usages_video ON public.sound_usages(video_id);
CREATE INDEX idx_artist_earnings_artist ON public.artist_earnings(artist_id);
CREATE INDEX idx_withdrawal_requests_artist ON public.withdrawal_requests(artist_id);
CREATE INDEX idx_user_notifications_user ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_unread ON public.user_notifications(user_id, is_read) WHERE is_read = false;

-- Trigger to update artist earnings when sound usage reaches milestones
CREATE OR REPLACE FUNCTION public.update_artist_earnings()
RETURNS TRIGGER AS $$
DECLARE
  track_owner UUID;
  current_usage_count INTEGER;
  earnings_increment NUMERIC;
BEGIN
  -- Get track owner
  SELECT creator_id INTO track_owner FROM public.music_tracks WHERE id = NEW.track_id;
  
  -- Count total usages for this track
  SELECT COUNT(*) INTO current_usage_count FROM public.sound_usages WHERE track_id = NEW.track_id;
  
  -- Calculate earnings: $20 per 50 uses = $0.40 per use
  earnings_increment := 0.40;
  
  -- Upsert earnings record
  INSERT INTO public.artist_earnings (artist_id, track_id, usage_count, total_earned, pending_withdrawal)
  VALUES (track_owner, NEW.track_id, 1, earnings_increment, earnings_increment)
  ON CONFLICT (artist_id, track_id)
  DO UPDATE SET 
    usage_count = artist_earnings.usage_count + 1,
    total_earned = artist_earnings.total_earned + earnings_increment,
    pending_withdrawal = artist_earnings.pending_withdrawal + earnings_increment,
    updated_at = now();
  
  -- Create notification for artist every 10 uses
  IF current_usage_count % 10 = 0 THEN
    INSERT INTO public.user_notifications (user_id, type, title, body, link)
    VALUES (
      track_owner,
      'earnings',
      'Your sound is trending! 🎵',
      'Your track has been used ' || current_usage_count || ' times. You''ve earned $' || (current_usage_count * 0.40)::TEXT,
      '/studio/music'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_sound_usage_insert
  AFTER INSERT ON public.sound_usages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_artist_earnings();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;