-- Create videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  duration INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  is_subscription_only BOOLEAN DEFAULT false,
  cta_link TEXT,
  cta_text TEXT,
  is_published BOOLEAN DEFAULT true,
  watch_time INTEGER DEFAULT 0,
  thumbnail_alt TEXT,
  thumbnail_b TEXT,
  ad_frequency INTEGER DEFAULT 5,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create admin_settings table (single row for app config)
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name TEXT DEFAULT 'Opay',
  bank_account_name TEXT DEFAULT 'Samuel Sunday',
  bank_account_number TEXT DEFAULT '9066423764',
  admin_password TEXT DEFAULT '0704',
  ad_code TEXT DEFAULT 'https://serious-sample.com/d/m.FRz/d/G_NMvkZLGAUf/JeKmg9cu/ZGUhlGklPDT/Yp3-MjTpYy1NO/ThETtWNDjYc/xvN_jAUZ5TMkga',
  default_ad_frequency INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Videos are publicly readable (no login required)
CREATE POLICY "Videos are publicly readable"
  ON public.videos FOR SELECT
  USING (true);

-- Admin settings are publicly readable (for payment page)
CREATE POLICY "Admin settings are publicly readable"
  ON public.admin_settings FOR SELECT
  USING (true);

-- Public can increment views and reactions (no auth needed)
CREATE POLICY "Anyone can update video stats"
  ON public.videos FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Public insert for videos (admin will authenticate via password in app)
CREATE POLICY "Anyone can insert videos"
  ON public.videos FOR INSERT
  WITH CHECK (true);

-- Public delete for videos
CREATE POLICY "Anyone can delete videos"
  ON public.videos FOR DELETE
  USING (true);

-- Public update for admin settings
CREATE POLICY "Anyone can update admin settings"
  ON public.admin_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Public insert for admin settings
CREATE POLICY "Anyone can insert admin settings"
  ON public.admin_settings FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);

-- Create storage bucket for thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);

-- Storage policies for public access
CREATE POLICY "Videos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "Anyone can upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Anyone can update videos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'videos');

CREATE POLICY "Anyone can delete videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'videos');

CREATE POLICY "Thumbnails are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Anyone can upload thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "Anyone can update thumbnails"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Anyone can delete thumbnails"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'thumbnails');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin settings
INSERT INTO public.admin_settings (bank_name, bank_account_name, bank_account_number, admin_password, ad_code, default_ad_frequency)
VALUES ('Opay', 'Samuel Sunday', '9066423764', '0704', 'https://serious-sample.com/d/m.FRz/d/G_NMvkZLGAUf/JeKmg9cu/ZGUhlGklPDT/Yp3-MjTpYy1NO/ThETtWNDjYc/xvN_jAUZ5TMkga', 5);