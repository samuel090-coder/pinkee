import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Lock, Wallet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';

interface PremiumVideoOverlayProps {
  videoId: string;
  price: number;
  thumbnailUrl?: string;
  title: string;
  onUnlocked?: () => void;
}

export const PremiumVideoOverlay = ({ 
  videoId, 
  price, 
  thumbnailUrl, 
  title,
  onUnlocked 
}: PremiumVideoOverlayProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const checkWalletAndPurchase = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setShowDialog(true);
    setLoading(true);

    try {
      // Check if already purchased
      const { data: existingPurchase } = await supabase
        .from('video_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .single();

      if (existingPurchase) {
        onUnlocked?.();
        setShowDialog(false);
        return;
      }

      // Check for active subscription
      const { data: subscription } = await supabase
        .from('premium_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (subscription) {
        onUnlocked?.();
        setShowDialog(false);
        toast({ title: 'Access Granted', description: 'Your subscription includes this content!' });
        return;
      }

      // Get wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      setWalletBalance(wallet?.balance || 0);
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user || walletBalance === null || walletBalance < price) return;

    setPurchasing(true);
    try {
      // Process payment
      const { data, error } = await supabase.rpc('process_wallet_payment', {
        p_user_id: user.id,
        p_amount: price,
        p_type: 'purchase',
        p_description: `Premium video: ${title}`,
        p_reference_id: videoId
      });

      if (error) throw error;
      if (!data) throw new Error('Insufficient balance');

      // Record purchase
      await supabase.from('video_purchases').insert({
        user_id: user.id,
        video_id: videoId,
        amount: price
      });

      // Credit creator (90% after 10% platform fee)
      const { data: video } = await supabase
        .from('videos')
        .select('uploader_id')
        .eq('id', videoId)
        .single();

      if (video?.uploader_id) {
        const creatorEarning = price * 0.9;
        await supabase.rpc('process_wallet_payment', {
          p_user_id: video.uploader_id,
          p_amount: creatorEarning,
          p_type: 'earning',
          p_description: `Premium video sale: ${title}`,
          p_reference_id: videoId
        });

        // Notify creator
        await supabase.from('user_notifications').insert({
          user_id: video.uploader_id,
          type: 'earning',
          title: 'New Premium Purchase! 💰',
          body: `Someone purchased "${title}" for $${price}. You earned $${creatorEarning.toFixed(2)}!`,
          link: '/studio/monetization'
        });
      }

      toast({ title: 'Purchase Complete!', description: 'Enjoy the video!' });
      setShowDialog(false);
      onUnlocked?.();
    } catch (error: any) {
      toast({
        title: 'Purchase Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setPurchasing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent flex flex-col items-center justify-center z-10"
      >
        {/* Premium Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="mb-4"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Crown className="w-10 h-10 text-white" />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center px-4"
        >
          <h3 className="font-display font-bold text-xl mb-2">Premium Content</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Unlock this video for {formatCurrency(price)}
          </p>
          
          <Button 
            onClick={checkWalletAndPurchase}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg shadow-yellow-500/30"
          >
            <Lock className="w-4 h-4 mr-2" />
            Unlock Now
          </Button>
        </motion.div>
      </motion.div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Premium Video</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Video Preview */}
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                {thumbnailUrl && (
                  <img 
                    src={thumbnailUrl} 
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  PREMIUM
                </div>
              </div>

              <div className="text-center">
                <p className="font-medium">{title}</p>
                <p className="text-2xl font-bold text-primary mt-2">{formatCurrency(price)}</p>
              </div>

              {/* Wallet Balance */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-muted-foreground" />
                    <span>Wallet Balance</span>
                  </div>
                  <span className={`font-bold ${(walletBalance || 0) >= price ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(walletBalance || 0)}
                  </span>
                </div>
              </div>

              {(walletBalance || 0) < price ? (
                <div className="space-y-3">
                  <p className="text-center text-sm text-muted-foreground">
                    Insufficient balance. Please add {formatCurrency(price - (walletBalance || 0))} to your wallet.
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/wallet">Add Funds</Link>
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handlePurchase} 
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600"
                  disabled={purchasing}
                >
                  {purchasing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Purchase for {formatCurrency(price)}
                    </>
                  )}
                </Button>
              )}

              <div className="text-center">
                <Link to="/subscribe" className="text-sm text-primary hover:underline">
                  Or subscribe for unlimited access →
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
