-- Creator Earnings table for view-based monetization ($2 per 500 views)
CREATE TABLE public.creator_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  views_counted INTEGER NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  pending_withdrawal NUMERIC NOT NULL DEFAULT 0,
  last_payout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(creator_id, video_id)
);

-- Enable RLS
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Creators can view own earnings" ON public.creator_earnings
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "System can insert earnings" ON public.creator_earnings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update earnings" ON public.creator_earnings
  FOR UPDATE USING (true);

-- Creator withdrawal requests table
CREATE TABLE public.creator_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Creators can view own withdrawals" ON public.creator_withdrawals
  FOR SELECT USING (auth.uid() = creator_id OR is_moderator(auth.uid()));

CREATE POLICY "Creators can request withdrawals" ON public.creator_withdrawals
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Moderators can update withdrawals" ON public.creator_withdrawals
  FOR UPDATE USING (is_moderator(auth.uid()));

-- Add bank details columns to profiles for creator payouts
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS account_name TEXT;

-- Function to update creator earnings when views are incremented
CREATE OR REPLACE FUNCTION public.update_creator_earnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  video_owner UUID;
  current_views INTEGER;
  new_views INTEGER;
  earnings_increment NUMERIC;
  milestones_reached INTEGER;
  prev_milestones INTEGER;
BEGIN
  -- Get video owner and current views
  video_owner := NEW.uploader_id;
  
  IF video_owner IS NULL THEN
    RETURN NEW;
  END IF;
  
  current_views := COALESCE(OLD.views, 0);
  new_views := COALESCE(NEW.views, 0);
  
  -- Calculate how many $2 milestones (500 views each) were crossed
  prev_milestones := current_views / 500;
  milestones_reached := new_views / 500;
  
  IF milestones_reached > prev_milestones THEN
    earnings_increment := (milestones_reached - prev_milestones) * 2.00;
    
    -- Upsert earnings record
    INSERT INTO public.creator_earnings (creator_id, video_id, views_counted, total_earned, pending_withdrawal)
    VALUES (video_owner, NEW.id, new_views, earnings_increment, earnings_increment)
    ON CONFLICT (creator_id, video_id)
    DO UPDATE SET 
      views_counted = new_views,
      total_earned = creator_earnings.total_earned + earnings_increment,
      pending_withdrawal = creator_earnings.pending_withdrawal + earnings_increment,
      updated_at = now();
    
    -- Notify creator
    INSERT INTO public.user_notifications (user_id, type, title, body, link)
    VALUES (
      video_owner,
      'earnings',
      'You earned $' || earnings_increment::TEXT || '! 💰',
      'Your video reached ' || new_views || ' views.',
      '/studio/monetization'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for creator earnings
DROP TRIGGER IF EXISTS trigger_update_creator_earnings ON public.videos;
CREATE TRIGGER trigger_update_creator_earnings
  AFTER UPDATE OF views ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_creator_earnings();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_earnings_creator ON public.creator_earnings(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_withdrawals_creator ON public.creator_withdrawals(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_withdrawals_status ON public.creator_withdrawals(status);

-- Enable realtime for creator earnings
ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_earnings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_withdrawals;