import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Gift, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function DailyCheckinWidget({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(false);
  const [celebrate, setCelebrate] = useState<null | { ngn: number; bonus: number; streak: number }>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_rewards').select('current_streak, last_checkin_at').eq('user_id', user.id).maybeSingle();
    if (data) {
      setStreak(data.current_streak || 0);
      const last = data.last_checkin_at ? new Date(data.last_checkin_at).toISOString().slice(0, 10) : null;
      const today = new Date().toISOString().slice(0, 10);
      setCheckedInToday(last === today);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  const claim = async () => {
    if (!user || loading || checkedInToday) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('claim_daily_wallet_checkin');
      if (error) throw error;
      const d = data as any;
      if (!d?.ok) {
        if (d?.error === 'already_checked_in_today') setCheckedInToday(true);
        else toast({ title: 'Could not claim', description: d?.error || 'Try again', variant: 'destructive' });
      } else {
        setStreak(d.streak);
        setCheckedInToday(true);
        setCelebrate({ ngn: d.total_ngn, bonus: d.bonus_ngn, streak: d.streak });
        toast({ title: `🔥 Day ${d.streak} claimed!`, description: `+₦${d.total_ngn} added to your wallet${d.bonus_ngn > 0 ? ` (₦${d.bonus_ngn} streak bonus!)` : ''}` });
        setTimeout(() => setCelebrate(null), 3000);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const nextMilestone = streak < 7 ? 7 : streak < 30 ? 30 : streak < 100 ? 100 : streak + 7;
  const daysToMilestone = nextMilestone - streak;

  if (compact) {
    return (
      <Button size="sm" onClick={claim} disabled={loading || checkedInToday} variant={checkedInToday ? 'outline' : 'default'} className="gap-1.5">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className={`w-4 h-4 ${streak > 0 ? 'text-orange-500' : ''}`} />}
        {checkedInToday ? `Day ${streak}` : `Claim +₦5`}
      </Button>
    );
  }

  return (
    <Card className="relative overflow-hidden p-4 bg-gradient-to-br from-orange-500/10 via-pink-500/10 to-purple-500/10 border-primary/20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.div animate={{ scale: streak > 0 ? [1, 1.1, 1] : 1 }} transition={{ repeat: Infinity, duration: 2 }}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <p className="font-bold text-lg leading-tight">{streak} day streak</p>
            <p className="text-xs text-muted-foreground">
              {daysToMilestone <= 7 ? `${daysToMilestone} days to ₦${nextMilestone === 7 ? 50 : nextMilestone === 30 ? 300 : 1500} bonus!` : 'Come back daily for bonuses'}
            </p>
          </div>
        </div>
        <Button onClick={claim} disabled={loading || checkedInToday} className="shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : checkedInToday ? '✓ Claimed' : (<><Gift className="w-4 h-4 mr-1.5" />Claim ₦5</>)}
        </Button>
      </div>
      <AnimatePresence>
        {celebrate && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-2 animate-pulse" />
              <p className="text-3xl font-black text-white">+₦{celebrate.ngn}</p>
              <p className="text-white/80">Day {celebrate.streak} 🔥</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
