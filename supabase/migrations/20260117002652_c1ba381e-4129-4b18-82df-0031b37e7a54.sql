-- Creator access requests table
CREATE TABLE public.creator_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    portfolio_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_requests ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own requests
CREATE POLICY "Users can view own requests"
ON public.creator_requests
FOR SELECT
USING (auth.uid() = user_id OR public.is_moderator(auth.uid()));

CREATE POLICY "Users can create own requests"
ON public.creator_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Moderators can update requests
CREATE POLICY "Moderators can update requests"
ON public.creator_requests
FOR UPDATE
USING (public.is_moderator(auth.uid()));

-- Music marketplace tables
CREATE TABLE public.music_tracks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    artist_name TEXT,
    audio_url TEXT NOT NULL,
    cover_url TEXT,
    duration INTEGER DEFAULT 0,
    genre TEXT,
    bpm INTEGER,
    key TEXT,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    license_type TEXT NOT NULL DEFAULT 'standard' CHECK (license_type IN ('free', 'standard', 'premium', 'exclusive')),
    is_published BOOLEAN DEFAULT true,
    downloads_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Music tracks are publicly readable"
ON public.music_tracks
FOR SELECT
USING (is_published = true OR auth.uid() = creator_id);

CREATE POLICY "Creators can insert own tracks"
ON public.music_tracks
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own tracks"
ON public.music_tracks
FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own tracks"
ON public.music_tracks
FOR DELETE
USING (auth.uid() = creator_id);

-- Music purchases/licenses
CREATE TABLE public.music_licenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    track_id UUID NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    license_type TEXT NOT NULL,
    price_paid DECIMAL(10,2) NOT NULL,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(track_id, buyer_id)
);

ALTER TABLE public.music_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own licenses"
ON public.music_licenses
FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = (SELECT creator_id FROM public.music_tracks WHERE id = track_id));

CREATE POLICY "Users can purchase licenses"
ON public.music_licenses
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

-- Enable realtime for comments and video_likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_likes;