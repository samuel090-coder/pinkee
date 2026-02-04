import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  History, 
  Copy, 
  Check, 
  Upload, 
  Loader2,
  Crown,
  Sparkles
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo } from '@/contexts/VideoContext';
import { toast } from '@/hooks/use-toast';

interface WalletData {
  balance: number;
  total_deposited: number;
  total_spent: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface DepositRequest {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  admin_notes?: string;
}

const Wallet = () => {
  const { user } = useAuth();
  const { adminSettings } = useVideo();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [depositStep, setDepositStep] = useState<'amount' | 'payment' | 'proof'>('amount');

  useEffect(() => {
    if (user) {
      fetchWalletData();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('wallet-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wallets',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        fetchWalletData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchWalletData = async () => {
    if (!user) return;

    try {
      // Fetch wallet
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        throw walletError;
      }

      if (walletData) {
        setWallet(walletData);
      } else {
        // Create wallet if doesn't exist
        const { data: newWallet } = await supabase
          .from('wallets')
          .insert({ user_id: user.id })
          .select()
          .single();
        setWallet(newWallet);
      }

      // Fetch transactions
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(txData || []);

      // Fetch deposit requests
      const { data: depositData } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setDepositRequests(depositData || []);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast({ title: 'Copied!', description: `${field} copied to clipboard` });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDepositSubmit = async () => {
    if (!user || !screenshot || !depositAmount) return;

    setSubmitting(true);
    try {
      // Upload screenshot
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Create deposit request
      const { error } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: user.id,
          amount: parseFloat(depositAmount),
          screenshot_url: urlData.publicUrl
        });

      if (error) throw error;

      toast({
        title: 'Deposit Request Submitted!',
        description: 'Your deposit will be reviewed and credited within 24 hours.'
      });

      setShowDepositDialog(false);
      setDepositAmount('');
      setScreenshot(null);
      setDepositStep('amount');
      fetchWalletData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
              <WalletIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display font-bold text-3xl">My Wallet</h1>
            <p className="text-muted-foreground">Manage your funds and transactions</p>
          </div>

          {/* Balance Card */}
          <Card className="bg-gradient-to-br from-primary/20 to-accent/20 border-primary/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Available Balance</p>
                <p className="font-display font-bold text-5xl text-gradient-pink mb-4">
                  {formatCurrency(wallet?.balance || 0)}
                </p>
                <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                  <span>Total Deposited: {formatCurrency(wallet?.total_deposited || 0)}</span>
                  <span>Total Spent: {formatCurrency(wallet?.total_spent || 0)}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6 justify-center">
                <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary pink-glow">
                      <ArrowDownLeft className="w-4 h-4 mr-2" />
                      Deposit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Deposit Funds</DialogTitle>
                    </DialogHeader>

                    {depositStep === 'amount' && (
                      <div className="space-y-4">
                        <div>
                          <Label>Amount (USD)</Label>
                          <Input
                            type="number"
                            placeholder="Enter amount"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            min="1"
                          />
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => setDepositStep('payment')}
                          disabled={!depositAmount || parseFloat(depositAmount) < 1}
                        >
                          Continue
                        </Button>
                      </div>
                    )}

                    {depositStep === 'payment' && adminSettings && (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">Amount to Transfer</p>
                          <p className="font-bold text-2xl text-primary">
                            {formatCurrency(parseFloat(depositAmount))}
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Bank Name</p>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{adminSettings.bank_name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(adminSettings.bank_name, 'Bank')}
                              >
                                {copied === 'Bank' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>

                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Account Name</p>
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{adminSettings.bank_account_name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(adminSettings.bank_account_name, 'Name')}
                              >
                                {copied === 'Name' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>

                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">Account Number</p>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-lg tracking-wider">{adminSettings.bank_account_number}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(adminSettings.bank_account_number, 'Number')}
                              >
                                {copied === 'Number' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <Button className="w-full" onClick={() => setDepositStep('proof')}>
                          I've Made Payment
                        </Button>
                      </div>
                    )}

                    {depositStep === 'proof' && (
                      <div className="space-y-4">
                        <div>
                          <Label>Upload Payment Screenshot</Label>
                          <div className="mt-2">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                              {screenshot ? (
                                <div className="flex items-center gap-2">
                                  <Check className="w-5 h-5 text-green-500" />
                                  <span className="text-sm">{screenshot.name}</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Click to upload screenshot</span>
                                </div>
                              )}
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                              />
                            </label>
                          </div>
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={handleDepositSubmit}
                          disabled={!screenshot || submitting}
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            'Submit Deposit Request'
                          )}
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Button variant="outline" asChild>
                  <a href="/subscribe">
                    <Crown className="w-4 h-4 mr-2" />
                    Subscribe
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="transactions">
            <TabsList className="w-full">
              <TabsTrigger value="transactions" className="flex-1">
                <History className="w-4 h-4 mr-2" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="deposits" className="flex-1">
                <CreditCard className="w-4 h-4 mr-2" />
                Deposits
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No transactions yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              tx.type === 'deposit' || tx.type === 'earning' 
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-red-500/20 text-red-500'
                            }`}>
                              {tx.type === 'deposit' || tx.type === 'earning' ? (
                                <ArrowDownLeft className="w-5 h-5" />
                              ) : (
                                <ArrowUpRight className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium capitalize">{tx.type}</p>
                              <p className="text-sm text-muted-foreground">{tx.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${
                              tx.type === 'deposit' || tx.type === 'earning'
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}>
                              {tx.type === 'deposit' || tx.type === 'earning' ? '+' : '-'}
                              {formatCurrency(tx.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deposits" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Deposit Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {depositRequests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No deposit requests
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {depositRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{formatCurrency(req.amount)}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(req.created_at)}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            req.status === 'approved' 
                              ? 'bg-green-500/20 text-green-500'
                              : req.status === 'rejected'
                                ? 'bg-red-500/20 text-red-500'
                                : 'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {req.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Wallet;
