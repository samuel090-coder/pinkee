import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Music,
  DollarSign,
  TrendingUp,
  Wallet,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Bell,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Track {
  id: string;
  title: string;
  artist_name: string | null;
  cover_url: string | null;
  downloads_count: number | null;
  created_at: string;
}

interface Earning {
  id: string;
  track_id: string;
  usage_count: number;
  total_earned: number;
  pending_withdrawal: number;
  track?: Track;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
}

interface PurchaseRequest {
  id: string;
  track_id: string;
  buyer_id: string;
  amount: number;
  screenshot_url: string | null;
  status: string;
  created_at: string;
  track?: Track;
  buyer?: { display_name: string | null; username: string | null; avatar_url: string | null };
}

const MIN_WITHDRAWAL = 100;

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [tracks, setTracks] = useState<Track[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const totalPending = earnings.reduce((sum, e) => sum + e.pending_withdrawal, 0);
  const totalEarned = earnings.reduce((sum, e) => sum + e.total_earned, 0);
  const totalUsages = earnings.reduce((sum, e) => sum + e.usage_count, 0);
  const pendingPurchases = purchaseRequests.filter(p => p.status === 'pending').length;

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: tracksData } = await supabase
          .from('music_tracks')
          .select('id, title, artist_name, cover_url, downloads_count, created_at')
          .eq('creator_id', user.id)
          .order('created_at', { ascending: false });

        setTracks((tracksData || []) as Track[]);

        const { data: earningsData } = await supabase
          .from('artist_earnings')
          .select('*')
          .eq('artist_id', user.id);

        const earningsWithTracks = (earningsData || []).map((e: any) => ({
          ...e,
          track: (tracksData || []).find((t: Track) => t.id === e.track_id),
        }));
        setEarnings(earningsWithTracks as Earning[]);

        const { data: withdrawalsData } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('artist_id', user.id)
          .order('created_at', { ascending: false });

        setWithdrawals((withdrawalsData || []) as WithdrawalRequest[]);

        // Fetch purchase requests for seller
        const { data: purchasesData } = await supabase
          .from('sound_purchase_requests')
          .select('*')
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });

        if (purchasesData) {
          const buyerIds = [...new Set(purchasesData.map(p => p.buyer_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, username, avatar_url')
            .in('user_id', buyerIds);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

          setPurchaseRequests(purchasesData.map(p => ({
            ...p,
            track: (tracksData || []).find((t: Track) => t.id === p.track_id),
            buyer: profileMap.get(p.buyer_id)
          })) as PurchaseRequest[]);
        }
      } catch (e) {
        console.error('Error fetching data:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to new purchase requests
    const channel = supabase
      .channel('seller-purchases')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sound_purchase_requests',
        filter: `seller_id=eq.${user.id}`
      }, () => {
        fetchData();
        toast({ title: 'New purchase request! 💰' });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleApprovePurchase = async (request: PurchaseRequest) => {
    setProcessingRequest(request.id);
    try {
      // Create license for buyer
      await supabase.from('music_licenses').insert({
        track_id: request.track_id,
        buyer_id: request.buyer_id,
        license_type: 'standard',
        price_paid: request.amount,
      });

      // Update request status
      await supabase.from('sound_purchase_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      // Notify buyer
      await supabase.from('user_notifications').insert({
        user_id: request.buyer_id,
        type: 'purchase_approved',
        title: 'Purchase Approved! 🎉',
        body: `Your purchase of "${request.track?.title}" has been approved. Start creating!`,
        link: '/music-marketplace',
      });

      setPurchaseRequests(prev => prev.map(p => 
        p.id === request.id ? { ...p, status: 'approved' } : p
      ));
      toast({ title: 'Purchase approved!' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectPurchase = async (request: PurchaseRequest) => {
    setProcessingRequest(request.id);
    try {
      await supabase.from('sound_purchase_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', request.id);

      await supabase.from('user_notifications').insert({
        user_id: request.buyer_id,
        type: 'purchase_rejected',
        title: 'Purchase Request Declined',
        body: `Your purchase request for "${request.track?.title}" was declined.`,
        link: '/music-marketplace',
      });

      setPurchaseRequests(prev => prev.map(p => 
        p.id === request.id ? { ...p, status: 'rejected' } : p
      ));
      toast({ title: 'Purchase rejected' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleWithdraw = async () => {
    if (!user || totalPending < MIN_WITHDRAWAL) return;
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast({ title: 'Please fill all bank details', variant: 'destructive' });
      return;
    }

    setWithdrawing(true);
    try {
      await supabase.from('withdrawal_requests').insert({
        artist_id: user.id,
        amount: totalPending,
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
      });

      for (const e of earnings) {
        await supabase.from('artist_earnings').update({ pending_withdrawal: 0 }).eq('id', e.id);
      }

      setShowWithdrawDialog(false);
      toast({ title: 'Withdrawal requested!' });
      
      // Refresh data
      const { data: updatedEarnings } = await supabase
        .from('artist_earnings').select('*').eq('artist_id', user.id);
      setEarnings((updatedEarnings || []).map((e: any) => ({
        ...e, track: tracks.find(t => t.id === e.track_id),
      })) as Earning[]);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message, variant: 'destructive' });
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved': return <Badge className="bg-primary"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'completed': return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Music className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Sign in to access your dashboard</h2>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Artist Dashboard</h1>
            <p className="text-muted-foreground">Track your music performance and earnings</p>
          </div>
          <Link to="/music/upload"><Button><Music className="w-4 h-4 mr-2" />Upload Music</Button></Link>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Earned', value: `$${totalEarned.toFixed(2)}`, icon: DollarSign, color: 'text-green-500' },
            { label: 'Pending', value: `$${totalPending.toFixed(2)}`, icon: Wallet, color: 'text-primary' },
            { label: 'Total Uses', value: totalUsages.toString(), icon: TrendingUp, color: 'text-blue-500' },
            { label: 'Tracks', value: tracks.length.toString(), icon: Music, color: 'text-purple-500' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}><stat.icon className="w-5 h-5" /></div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Withdraw Card */}
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Available for withdrawal</h3>
              <p className="text-3xl font-bold text-primary mt-1">${totalPending.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Minimum: ${MIN_WITHDRAWAL}</p>
            </div>
            <Button size="lg" disabled={totalPending < MIN_WITHDRAWAL} onClick={() => setShowWithdrawDialog(true)}>
              <Wallet className="w-4 h-4 mr-2" />Withdraw
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="purchases" className="space-y-6">
            <TabsList className="bg-secondary">
              <TabsTrigger value="purchases" className="relative">
                Purchases
                {pendingPurchases > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
                    {pendingPurchases}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="tracks">Tracks</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            </TabsList>

            <TabsContent value="purchases">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle>Purchase Requests</CardTitle></CardHeader>
                <CardContent>
                  {purchaseRequests.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No purchase requests yet</p>
                  ) : (
                    <div className="space-y-4">
                      {purchaseRequests.map(req => (
                        <div key={req.id} className="p-4 bg-secondary rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={req.buyer?.avatar_url || undefined} />
                                <AvatarFallback>{(req.buyer?.display_name || 'U').charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">{req.buyer?.display_name || req.buyer?.username || 'User'}</p>
                                <p className="text-sm text-muted-foreground">wants to buy "{req.track?.title}"</p>
                              </div>
                            </div>
                            <p className="font-bold text-primary">${req.amount}</p>
                          </div>
                          
                          {req.screenshot_url && (
                            <img src={req.screenshot_url} alt="Payment proof" className="max-h-48 rounded-lg border border-border" />
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                            </span>
                            {req.status === 'pending' ? (
                              <div className="flex gap-2">
                                <Button size="sm" variant="destructive" onClick={() => handleRejectPurchase(req)} disabled={processingRequest === req.id}>
                                  <XCircle className="w-4 h-4 mr-1" />Reject
                                </Button>
                                <Button size="sm" onClick={() => handleApprovePurchase(req)} disabled={processingRequest === req.id}>
                                  {processingRequest === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                  Approve
                                </Button>
                              </div>
                            ) : (
                              getStatusBadge(req.status)
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tracks">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle>Your Music ({tracks.length})</CardTitle></CardHeader>
                <CardContent>
                  {tracks.length === 0 ? (
                    <div className="text-center py-12">
                      <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No tracks yet</p>
                      <Link to="/music/upload"><Button className="mt-4">Upload Track</Button></Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tracks.map(track => {
                        const earning = earnings.find(e => e.track_id === track.id);
                        return (
                          <div key={track.id} className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                              {track.cover_url ? <img src={track.cover_url} alt="" className="w-full h-full object-cover" /> : <Music className="w-5 h-5 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{track.title}</p>
                              <p className="text-sm text-muted-foreground">{track.artist_name || 'Unknown'}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-foreground">{earning?.usage_count || 0} uses</p>
                              <p className="text-sm text-green-500">${(earning?.total_earned || 0).toFixed(2)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="earnings">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle>Earnings Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="p-4 bg-secondary rounded-lg mb-4">
                    <p className="text-foreground">Earn <strong>$0.40</strong> per video use = <strong>$20 per 50 uses</strong></p>
                  </div>
                  {earnings.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No earnings yet</p>
                  ) : (
                    <div className="space-y-3">
                      {earnings.map(e => (
                        <div key={e.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                              {e.track?.cover_url ? <img src={e.track.cover_url} alt="" className="w-full h-full object-cover" /> : <Music className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{e.track?.title || 'Track'}</p>
                              <p className="text-sm text-muted-foreground">{e.usage_count} uses</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-500">${e.total_earned.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">${e.pending_withdrawal.toFixed(2)} pending</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="withdrawals">
              <Card className="bg-card border-border">
                <CardHeader><CardTitle>Withdrawal History</CardTitle></CardHeader>
                <CardContent>
                  {withdrawals.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No withdrawals yet</p>
                  ) : (
                    <div className="space-y-3">
                      {withdrawals.map(w => (
                        <div key={w.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">${w.amount.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}</p>
                          </div>
                          {getStatusBadge(w.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>Enter bank details to receive ${totalPending.toFixed(2)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g., Opay, GTBank" className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="1234567890" className="bg-input border-border" />
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Your full name" className="bg-input border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowWithdrawDialog(false)}>Cancel</Button>
            <Button onClick={handleWithdraw} disabled={withdrawing}>
              {withdrawing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Request Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ArtistDashboard;
