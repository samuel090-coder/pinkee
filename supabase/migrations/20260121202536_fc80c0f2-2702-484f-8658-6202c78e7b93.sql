-- Add bank details columns to music_tracks for premium sounds
ALTER TABLE public.music_tracks 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT;

-- Create purchase requests table for premium sounds
CREATE TABLE IF NOT EXISTS public.sound_purchase_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT
);

-- Enable RLS
ALTER TABLE public.sound_purchase_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Buyers can create purchase requests"
ON public.sound_purchase_requests
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can view own purchase requests"
ON public.sound_purchase_requests
FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Sellers can update purchase requests"
ON public.sound_purchase_requests
FOR UPDATE
USING (auth.uid() = seller_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_sound_purchase_requests_buyer ON public.sound_purchase_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_sound_purchase_requests_seller ON public.sound_purchase_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_sound_purchase_requests_track ON public.sound_purchase_requests(track_id);

-- Enable realtime for purchase requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.sound_purchase_requests;