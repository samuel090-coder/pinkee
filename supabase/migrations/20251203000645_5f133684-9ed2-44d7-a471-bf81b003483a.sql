-- Create ad_codes table for multiple ads
CREATE TABLE public.ad_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Ad',
  code text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Ad codes are publicly readable" ON public.ad_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ad codes" ON public.ad_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update ad codes" ON public.ad_codes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete ad codes" ON public.ad_codes FOR DELETE USING (true);

-- Migrate existing ad code if exists
INSERT INTO public.ad_codes (name, code, is_active)
SELECT 'Default Ad', ad_code, true FROM public.admin_settings WHERE ad_code IS NOT NULL AND ad_code != '' LIMIT 1;