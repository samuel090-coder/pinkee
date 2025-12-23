-- Create poster_profiles table
CREATE TABLE public.poster_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  address TEXT,
  hobbies TEXT,
  avatar_url TEXT,
  email TEXT,
  whatsapp TEXT,
  telegram TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.poster_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Poster profiles are publicly readable"
ON public.poster_profiles
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert poster profiles"
ON public.poster_profiles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update poster profiles"
ON public.poster_profiles
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete poster profiles"
ON public.poster_profiles
FOR DELETE
USING (true);

-- Add poster_id column to videos table
ALTER TABLE public.videos ADD COLUMN poster_id UUID REFERENCES public.poster_profiles(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_poster_profiles_updated_at
BEFORE UPDATE ON public.poster_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();