ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS guest_browsing_enabled BOOLEAN NOT NULL DEFAULT TRUE;