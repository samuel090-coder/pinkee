import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  Video,
  Eye,
  Wallet,
  ArrowUpRight,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface CreatorEarning {
  id: string;
  video_id: string;
  views_counted: number;
  total_earned: number;
  pending_withdrawal: number;
  video?: {
    title: string;
    thumbnail_url: string | null;
    views: number;
  };
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  admin_notes?: string;
}

const Monetization = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [earnings, setEarnings] = useState<CreatorEarning[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [watchSeconds, setWatchSeconds] = useState(0);

  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const totalEarned = earnings.reduce((sum, e) => sum + e.total_earned, 0);
  const pendingWithdrawal = earnings.reduce((sum, e) => sum + e.pending_withdrawal, 0);
  const totalViews = earnings.reduce((sum, e) => sum + e.views_counted, 0);

  const SUB_THRESHOLD = 10_000;
  const HOURS_THRESHOLD = 100_000;
  const watchHours = watchSeconds / 3600;
  const isMonetizationEligible =
    subscriberCount >= SUB_THRESHOLD && watchHours >= HOURS_THRESHOLD;

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch creator earnings
        const { data: earningsData, error: earningsError } = await supabase
          .from('creator_earnings')
          .select('*')
          .eq('creator_id', user.id);

        if (earningsError) throw earningsError;

        // Fetch video details for each earning
        if (earningsData && earningsData.length > 0) {
          const videoIds = earningsData.map(e => e.video_id);
          const { data: videos } = await supabase
            .from('videos')
            .select('id, title, thumbnail_url, views')
            .in('id', videoIds);

          const videoMap = new Map(videos?.map(v => [v.id, v]));
          setEarnings(earningsData.map(e => ({
            ...e,
            video: videoMap.get(e.video_id)
          })));
        } else {
          setEarnings([]);
        }

        // Fetch withdrawals
        const { data: withdrawalsData } = await supabase
          .from('creator_withdrawals')
          .select('*')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false });

        setWithdrawals(withdrawalsData || []);

        // Fetch saved bank details
        const { data: profileData } = await supabase
          .from('profiles')
          .select('bank_name, account_number, account_name')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setBankName(profileData.bank_name || '');
          setAccountNumber(profileData.account_number || '');
          setAccountName(profileData.account_name || '');
        }

        // Eligibility: subscribers + watch hours
        const { data: profileMetrics } = await supabase
          .from('profiles')
          .select('subscriber_count')
          .eq('user_id', user.id)
          .maybeSingle();
        setSubscriberCount(profileMetrics?.subscriber_count || 0);

        const { data: watchData } = await supabase
          .from('videos')
          .select('watch_time')
          .eq('uploader_id', user.id);
        setWatchSeconds(
          (watchData || []).reduce((s, v: any) => s + (v.watch_time || 0), 0),
        );
      } catch (error) {
        console.error('Error fetching monetization data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel('creator-earnings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creator_earnings', filter: `creator_id=eq.${user.id}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creator_withdrawals', filter: `creator_id=eq.${user.id}` }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleWithdraw = async () => {
    if (pendingWithdrawal < 100) {
      toast({ title: 'Minimum withdrawal is $100', variant: 'destructive' });
      return;
    }

    if (!bankName || !accountNumber || !accountName) {
      toast({ title: 'Please fill in all bank details', variant: 'destructive' });
      return;
    }

    setWithdrawing(true);
    try {
      // Save bank details to profile
      await supabase.from('profiles').update({
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
      }).eq('user_id', user!.id);

      // Create withdrawal request
      const { error } = await supabase.from('creator_withdrawals').insert({
        creator_id: user!.id,
        amount: pendingWithdrawal,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
      });

      if (error) throw error;

      // Reset pending withdrawal for all earnings
      await supabase.from('creator_earnings')
        .update({ pending_withdrawal: 0 })
        .eq('creator_id', user!.id);

      toast({ title: 'Withdrawal requested!', description: 'We will process it within 24-48 hours.' });
      setShowWithdrawDialog(false);
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast({ title: 'Failed to request withdrawal', variant: 'destructive' });
    } finally {
      setWithdrawing(false);
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <DollarSign className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Sign in to view earnings</h2>
          <p className="text-muted-foreground mb-6">Track your video monetization and withdraw earnings</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Monetization</h1>
            <p className="text-muted-foreground">Earn $2 for every 500 views on your videos</p>
          </div>
          <Button 
            onClick={() => setShowWithdrawDialog(true)}
            disabled={pendingWithdrawal < 100 || !isMonetizationEligible}
          >
            <Wallet className="w-4 h-4 mr-2" />
            Withdraw ${pendingWithdrawal.toFixed(2)}
          </Button>
        </div>

        {/* Eligibility Banner */}
        <Card className={`border ${isMonetizationEligible ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">
                  {isMonetizationEligible ? '✅ You\'re monetized' : 'Monetization eligibility'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Unlock withdrawals at 10,000 subscribers and 100,000 watch hours.
                </p>
              </div>
              {isMonetizationEligible && <CheckCircle className="w-6 h-6 text-primary" />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Subscribers</span>
                  <span className="font-semibold">
                    {subscriberCount.toLocaleString()} / 10,000
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (subscriberCount / SUB_THRESHOLD) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Watch hours</span>
                  <span className="font-semibold">
                    {Math.floor(watchHours).toLocaleString()} / 100,000
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (watchHours / HOURS_THRESHOLD) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">${totalEarned.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Lifetime earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
              <Wallet className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">${pendingWithdrawal.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {pendingWithdrawal >= 100 ? 'Ready to withdraw' : `$${(100 - pendingWithdrawal).toFixed(2)} more to withdraw`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monetized Views</CardTitle>
              <Eye className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Views that earned money</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Videos Monetized</CardTitle>
              <Video className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{earnings.length}</div>
              <p className="text-xs text-muted-foreground">Earning money</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="earnings" className="space-y-4">
          <TabsList className="bg-secondary">
            <TabsTrigger value="earnings">Earnings by Video</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawal History</TabsTrigger>
            <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="space-y-4">
            {earnings.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No earnings yet</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Start posting videos to earn money! You'll earn $2 for every 500 views.
                  </p>
                  <Button onClick={() => navigate('/upload')} className="mt-4">
                    Upload Video
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {earnings.map((earning) => (
                  <motion.div
                    key={earning.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="bg-card border-border">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="w-24 h-14 rounded bg-muted overflow-hidden flex-shrink-0">
                          {earning.video?.thumbnail_url ? (
                            <img 
                              src={earning.video.thumbnail_url} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">
                            {earning.video?.title || 'Unknown Video'}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {earning.views_counted.toLocaleString()} monetized views
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-500">
                            ${earning.total_earned.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${earning.pending_withdrawal.toFixed(2)} pending
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-4">
            {withdrawals.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No withdrawals yet</h3>
                  <p className="text-muted-foreground">Your withdrawal history will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <Card key={w.id} className="bg-card border-border">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        {w.status === 'pending' && <Clock className="w-5 h-5 text-yellow-500" />}
                        {w.status === 'approved' && <CheckCircle className="w-5 h-5 text-blue-500" />}
                        {w.status === 'paid' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {w.status === 'rejected' && <XCircle className="w-5 h-5 text-red-500" />}
                        <div>
                          <p className="font-medium text-foreground">${w.amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(w.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                          w.status === 'approved' ? 'bg-blue-500/20 text-blue-500' :
                          w.status === 'paid' ? 'bg-green-500/20 text-green-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                        </span>
                        {w.admin_notes && (
                          <p className="text-xs text-muted-foreground mt-1">{w.admin_notes}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="how-it-works">
            <Card className="bg-card border-border">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Post Videos</h3>
                    <p className="text-muted-foreground">Upload videos to start earning. Every video you post can earn money!</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Get 500 Views = $2</h3>
                    <p className="text-muted-foreground">For every 500 views your video gets, you earn $2. Views accumulate across all your videos.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Withdraw at $100</h3>
                    <p className="text-muted-foreground">Once you reach $100 in earnings, you can request a withdrawal to your bank account.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Get Paid</h3>
                    <p className="text-muted-foreground">Withdrawals are processed within 24-48 hours. Money is sent directly to your bank account.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Enter your bank details to receive ${pendingWithdrawal.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Bank Name</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g., Chase, Bank of America"
                className="mt-1 bg-input border-border"
              />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Enter account number"
                className="mt-1 bg-input border-border"
              />
            </div>
            <div>
              <Label>Account Holder Name</Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Name on account"
                className="mt-1 bg-input border-border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdraw} disabled={withdrawing}>
              {withdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpRight className="w-4 h-4 mr-2" />}
              Request ${pendingWithdrawal.toFixed(2)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Monetization;
