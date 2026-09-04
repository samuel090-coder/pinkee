import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Gift, Flame, Trophy, Coins, Sparkles, CheckCircle2, Clock,
  Users, ArrowRightLeft, History as HistoryIcon, Loader2, Copy,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { copyToClipboard } from '@/lib/native-capabilities';
import { getShareUrl } from '@/lib/navigation';

interface RewardSettings {
  ngn_per_point: number;
  min_redemption_points: number;
  daily_checkin_points: number;
  streak_bonus_points: number;
  streak_bonus_every: number;
  enabled: boolean;
}
interface UserRewards {
  points_balance: number;
  lifetime_points: number;
  lifetime_ngn: number;
  current_streak: number;
  longest_streak: number;
  last_checkin_at: string | null;
  flagged: boolean;
}
interface Activity {
  id: string; code: string; name: string; description: string | null;
  category: string; points: number; daily_cap: number | null;
  cooldown_seconds: number; enabled: boolean;
}
interface Mission {
  id: string; code: string; title: string; description: string | null;
  period: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'one_time';
  target_count: number; reward_points: number; activity_code: string | null;
}
interface MissionProgress {
  mission_id: string; progress: number; completed_at: string | null;
  claimed_at: string | null; period_key: string;
}
interface LedgerEntry {
  id: string; points: number; description: string | null;
  source: string; status: string; created_at: string;
}

const Rewards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<RewardSettings | null>(null);
  const [rewards, setRewards] = useState<UserRewards | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<Record<string, MissionProgress>>({});
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [redeemAmt, setRedeemAmt] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [s, ur, acts, miss, prog, led] = await Promise.all([
      supabase.from('reward_settings').select('*').maybeSingle(),
      supabase.from('user_rewards').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('reward_activities').select('*').eq('enabled', true).order('sort_order'),
      supabase.from('reward_missions').select('*').eq('enabled', true).order('sort_order'),
      supabase.from('user_mission_progress').select('*').eq('user_id', user.id),
      supabase.from('reward_ledger').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    ]);
    if (s.data) setSettings(s.data as RewardSettings);
    setRewards((ur.data as UserRewards) || {
      points_balance: 0, lifetime_points: 0, lifetime_ngn: 0,
      current_streak: 0, longest_streak: 0, last_checkin_at: null, flagged: false,
    });
    if (acts.data) setActivities(acts.data as Activity[]);
    if (miss.data) setMissions(miss.data as Mission[]);
    if (prog.data) {
      const map: Record<string, MissionProgress> = {};
      (prog.data as MissionProgress[]).forEach((p) => { map[p.mission_id] = p; });
      setProgress(map);
    }
    if (led.data) setLedger(led.data as LedgerEntry[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadAll();
  }, [user, loadAll, navigate]);

  const handleCheckin = async () => {
    setCheckingIn(true);
    const { data, error } = await supabase.rpc('claim_daily_checkin', { _device: null });
    setCheckingIn(false);
    const d = data as { ok?: boolean; error?: string; points?: number; streak?: number; bonus?: number } | null;
    if (error || !d?.ok) {
      toast({
        title: 'Check-in unavailable',
        description: d?.error === 'already_checked_in_today' ? 'Come back tomorrow for your next streak day.' : (d?.error || 'Try again later'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: `+${d.points} points!`,
        description: `Streak: ${d.streak} day${d.streak === 1 ? '' : 's'}${d.bonus ? ` • +${d.bonus} bonus` : ''}`,
      });
    }
    loadAll();
  };

  const handleClaimActivity = async (code: string) => {
    const { data } = await supabase.rpc('claim_activity', {
      _activity_code: code, _idempotency: null, _metadata: {}, _device: null,
    });
    const d = data as { ok?: boolean; error?: string; points?: number } | null;
    if (!d?.ok) {
      toast({ title: 'Not available', description: d?.error || 'Try again later', variant: 'destructive' });
    } else {
      toast({ title: `+${d.points} points!` });
    }
    loadAll();
  };

  const handleClaimMission = async (missionId: string) => {
    const { data } = await supabase.rpc('claim_mission_reward', { _mission_id: missionId });
    const d = data as { ok?: boolean; error?: string; points?: number } | null;
    if (!d?.ok) toast({ title: 'Cannot claim', description: d?.error || 'Try again later', variant: 'destructive' });
    else toast({ title: `+${d.points} points earned!` });
    loadAll();
  };

  const handleRedeem = async () => {
    const pts = parseInt(redeemAmt, 10);
    if (!pts || pts <= 0) return;
    setRedeeming(true);
    const { data } = await supabase.rpc('redeem_points_to_wallet', { _points: pts });
    setRedeeming(false);
    const d = data as { ok?: boolean; error?: string; ngn?: number; min?: number } | null;
    if (!d?.ok) {
      toast({
        title: 'Redemption failed',
        description: d?.error === 'below_minimum' ? `Minimum ${d.min} points` : (d?.error || 'Try again'),
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Redeemed!', description: `₦${d.ngn} sent to your wallet` });
      setRedeemAmt('');
    }
    loadAll();
  };

  const copyReferral = () => {
    const code = user?.user_metadata?.username || user?.id;
    const link = getShareUrl(`/auth?ref=${encodeURIComponent(code)}`);
    void copyToClipboard(link).then((copied) => {
      if (copied) toast({ title: 'Referral link copied' });
    });
  };

  if (loading || !rewards || !settings) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const checkedInToday = rewards.last_checkin_at?.slice(0, 10) === today;
  const ngnValue = (rewards.points_balance * settings.ngn_per_point).toFixed(2);

  const periodKey = (p: Mission['period']): string => {
    const d = new Date();
    if (p === 'daily') return d.toISOString().slice(0, 10);
    if (p === 'monthly') return d.toISOString().slice(0, 7);
    if (p === 'weekly') {
      const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const diff = (d.getTime() - start.getTime()) / 86400000;
      const week = Math.ceil((diff + start.getUTCDay() + 1) / 7);
      return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
    }
    if (p === 'seasonal') return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
    return 'all-time';
  };

  const groupedMissions = (period: Mission['period']) => missions.filter(m => m.period === period);

  const renderMission = (m: Mission) => {
    const pk = periodKey(m.period);
    const p = progress[m.id];
    const isThisPeriod = p?.period_key === pk;
    const current = isThisPeriod ? p.progress : 0;
    const completed = isThisPeriod && p.completed_at;
    const claimed = isThisPeriod && p.claimed_at;
    const pct = Math.min(100, (current / m.target_count) * 100);
    return (
      <Card key={m.id} className="p-4 glass border-border/40">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{m.title}</h4>
            {m.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.description}</p>}
          </div>
          <Badge variant="secondary" className="gap-1 shrink-0">
            <Coins className="w-3 h-3" /> {m.reward_points}
          </Badge>
        </div>
        <Progress value={pct} className="h-2 mb-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{current} / {m.target_count}</span>
          {claimed ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-0">Claimed</Badge>
          ) : completed ? (
            <Button size="sm" className="h-7 px-3" onClick={() => handleClaimMission(m.id)}>
              <Gift className="w-3 h-3 mr-1" /> Claim
            </Button>
          ) : (
            <span className="capitalize">{m.period}</span>
          )}
        </div>
      </Card>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 pb-24 space-y-6 max-w-5xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-primary/30 via-primary/10 to-background border border-primary/20"
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/30 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Sparkles className="w-4 h-4 text-primary" /> Reward Center
            </div>
            <div className="flex items-end gap-3 mb-1">
              <span className="text-5xl md:text-6xl font-display font-bold text-gradient-pink">
                {rewards.points_balance.toLocaleString()}
              </span>
              <span className="text-muted-foreground pb-2">points</span>
            </div>
            <p className="text-sm text-muted-foreground">≈ ₦{ngnValue} • Lifetime ₦{rewards.lifetime_ngn.toLocaleString()}</p>

            <div className="flex flex-wrap gap-3 mt-6">
              <Button
                size="lg" onClick={handleCheckin} disabled={checkingIn || checkedInToday}
                className="gap-2 pink-glow"
              >
                {checkingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                {checkedInToday ? `Checked in • ${rewards.current_streak} day streak` : `Daily check-in (+${settings.daily_checkin_points})`}
              </Button>
              <Button size="lg" variant="outline" onClick={copyReferral} className="gap-2">
                <Copy className="w-4 h-4" /> Invite friends
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 glass">
            <Flame className="w-5 h-5 text-orange-400 mb-1" />
            <div className="text-2xl font-bold">{rewards.current_streak}</div>
            <div className="text-xs text-muted-foreground">Current streak</div>
          </Card>
          <Card className="p-4 glass">
            <Trophy className="w-5 h-5 text-amber-400 mb-1" />
            <div className="text-2xl font-bold">{rewards.longest_streak}</div>
            <div className="text-xs text-muted-foreground">Best streak</div>
          </Card>
          <Card className="p-4 glass">
            <Coins className="w-5 h-5 text-primary mb-1" />
            <div className="text-2xl font-bold">{rewards.lifetime_points.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Lifetime points</div>
          </Card>
        </div>

        {/* Missions */}
        <Tabs defaultValue="daily" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Missions</h2>
            <TabsList className="glass">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </div>
          {(['daily', 'weekly', 'monthly'] as const).map(p => (
            <TabsContent key={p} value={p} className="grid sm:grid-cols-2 gap-3">
              {groupedMissions(p).length === 0
                ? <p className="text-sm text-muted-foreground col-span-full">No {p} missions right now.</p>
                : groupedMissions(p).map(renderMission)}
            </TabsContent>
          ))}
        </Tabs>

        {/* Activities */}
        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold">Ways to earn</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {activities.filter(a => a.code !== 'daily_checkin').map(a => (
              <Card key={a.id} className="p-4 glass border-border/40 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-semibold truncate">{a.name}</h4>
                  {a.description && <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>}
                  <Badge variant="outline" className="mt-1 text-xs gap-1">
                    <Coins className="w-3 h-3" /> {a.points}
                    {a.daily_cap && <span className="opacity-70">• cap {a.daily_cap}/day</span>}
                  </Badge>
                </div>
                {['complete_profile'].includes(a.code) && (
                  <Button size="sm" variant="outline" onClick={() => handleClaimActivity(a.code)}>
                    Claim
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Redeem */}
        <Card className="p-5 glass border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Redeem to wallet</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {settings.ngn_per_point} ₦ per point • Minimum {settings.min_redemption_points} points
          </p>
          <div className="flex gap-2">
            <Input
              type="number" placeholder={`Min ${settings.min_redemption_points}`}
              value={redeemAmt} onChange={(e) => setRedeemAmt(e.target.value)}
              max={rewards.points_balance}
            />
            <Button onClick={handleRedeem} disabled={redeeming || !redeemAmt}>
              {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Redeem'}
            </Button>
          </div>
        </Card>

        {/* History */}
        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <HistoryIcon className="w-5 h-5" /> Recent activity
          </h2>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet. Check in to start earning!</p>
          ) : (
            <Card className="glass divide-y divide-border/40">
              {ledger.slice(0, 15).map(e => (
                <div key={e.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    {e.status === 'approved'
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      : <Clock className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-sm truncate">{e.description || e.source}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <span className={e.points >= 0 ? 'font-semibold text-emerald-400' : 'font-semibold text-rose-400'}>
                    {e.points >= 0 ? '+' : ''}{e.points}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Rewards;
