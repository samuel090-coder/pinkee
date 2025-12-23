-- Create notifications table for storing push notification subscriptions and sent notifications
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table for admin to manage sent notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  link TEXT,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_subscriptions
CREATE POLICY "Anyone can insert push subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can read push subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (true);

CREATE POLICY "Anyone can delete push subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (true);

-- RLS policies for notifications
CREATE POLICY "Notifications are publicly readable"
ON public.notifications
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update notifications"
ON public.notifications
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete notifications"
ON public.notifications
FOR DELETE
USING (true);

-- Add notification image bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('notification-images', 'notification-images', true);

-- Storage policies for notification images
CREATE POLICY "Notification images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'notification-images');

CREATE POLICY "Anyone can upload notification images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'notification-images');

CREATE POLICY "Anyone can delete notification images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'notification-images');