-- Create wallets table
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  total_deposited NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallet transactions table
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'purchase', 'earning', 'refund')),
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  description TEXT,
  reference_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deposit requests table (manual bank transfer)
CREATE TABLE public.deposit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video purchases table
CREATE TABLE public.video_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Create subscriptions table for premium access
CREATE TABLE public.premium_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'monthly' CHECK (plan IN ('monthly', 'yearly')),
  amount NUMERIC NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add premium columns to videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS premium_price NUMERIC DEFAULT 0;

-- Add payment settings to admin_settings
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS subscription_monthly_price NUMERIC DEFAULT 9.99;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS subscription_yearly_price NUMERIC DEFAULT 99.99;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS platform_fee_percent NUMERIC DEFAULT 10;

-- Enable RLS on all new tables
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;

-- Wallet policies
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert wallets" ON public.wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update wallets" ON public.wallets FOR UPDATE USING (true);

-- Transaction policies
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (true);

-- Deposit request policies
CREATE POLICY "Users can view own deposits" ON public.deposit_requests FOR SELECT USING (auth.uid() = user_id OR is_moderator(auth.uid()));
CREATE POLICY "Users can create deposits" ON public.deposit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update deposits" ON public.deposit_requests FOR UPDATE USING (is_moderator(auth.uid()));

-- Video purchases policies
CREATE POLICY "Users can view own purchases" ON public.video_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert purchases" ON public.video_purchases FOR INSERT WITH CHECK (true);

-- Subscription policies
CREATE POLICY "Users can view own subscription" ON public.premium_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage subscriptions" ON public.premium_subscriptions FOR ALL USING (true);

-- Create function to initialize wallet for new users
CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger to create wallet on new user
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_wallet();

-- Function to process wallet payment
CREATE OR REPLACE FUNCTION public.process_wallet_payment(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF current_balance IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF p_type IN ('purchase', 'withdrawal') THEN
    -- Deduct from balance
    IF current_balance < p_amount THEN
      RETURN FALSE;
    END IF;
    new_balance := current_balance - p_amount;
  ELSE
    -- Add to balance
    new_balance := current_balance + p_amount;
  END IF;
  
  -- Update wallet
  UPDATE public.wallets 
  SET balance = new_balance,
      total_spent = CASE WHEN p_type = 'purchase' THEN total_spent + p_amount ELSE total_spent END,
      total_deposited = CASE WHEN p_type IN ('deposit', 'earning') THEN total_deposited + p_amount ELSE total_deposited END,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, description, reference_id)
  VALUES (p_user_id, p_type, p_amount, new_balance, p_description, p_reference_id);
  
  RETURN TRUE;
END;
$$;

-- Enable realtime for wallet updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests;