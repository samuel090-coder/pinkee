-- Add site_name column to admin_settings
ALTER TABLE public.admin_settings 
ADD COLUMN IF NOT EXISTS site_name text DEFAULT 'PlayStream';

-- Update existing row with default site name
UPDATE public.admin_settings SET site_name = 'PlayStream' WHERE site_name IS NULL;