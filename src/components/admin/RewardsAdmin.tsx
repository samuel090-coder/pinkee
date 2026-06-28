import { useEffect, useState } from 'react';
import { Loader2, Save, Plus, Trash2, Gift, Coins, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Settings {
  enabled: boolean; ngn_per_point: number; min_redemption_points: number;
  daily_checkin_points: number; streak_bonus_points: number; streak_bonus_every: number;
  referral_points_referrer: number; referral_points_referred: number;
  max_points_per_user_per_day: number; max_points_per_ip_per_day: number;
}
interface Activity {
  id: string; code: string; name: string; description: string | null;
  category: string; points: number; cooldown_seconds: number;
  daily_cap: number | null; enabled: boolean; sort_order: number;
}
interface Mission {
  id: string; code: string; title: string; description: string | null;
  period: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'one_time';
  activity_code: string | null; target_count: number; reward_points: number; enabled: boolean;
}
interface LedgerEntry {
  id: string; user_id: string; points: number; status: string;
  source: string; description: string | null; created_at: string;
}

export const RewardsAdmin = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, a, m, l] = await Promise.all([
      supabase.from('reward_settings').select('*').maybeSingle(),
      supabase.from('reward_activities').select('*').order('sort_order'),
      supabase.from('reward_missions').select('*').order('sort_order'),
      supabase.from('reward_ledger').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (s.data) setSettings(s.data as Settings);
    if (a.data) setActivities(a.data as Activity[]);
    if (m.data) setMissions(m.data as Mission[]);
    if (l.data) setLedger(l.data as LedgerEntry[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from('reward_settings').update(settings).eq('id', true);
    setSaving(false);
    toast({ title: error ? 'Save failed' : 'Settings saved', variant: error ? 'destructive' : 'default' });
  };

  const upsertActivity = async (a: Activity) => {
    const { error } = await supabase.from('reward_activities').update({
      name: a.name, description: a.description, points: a.points,
      daily_cap: a.daily_cap, cooldown_seconds: a.cooldown_seconds, enabled: a.enabled,
    }).eq('id', a.id);
    toast({ title: error ? 'Save failed' : 'Activity saved', variant: error ? 'destructive' : 'default' });
    load();
  };
  const addActivity = async () => {
    const code = prompt('Activity code (lowercase_snake_case)');
    if (!code) return;
    const name = prompt('Display name', code) || code;
    const { error } = await supabase.from('reward_activities').insert({
      code, name, category: 'engagement', points: 5,
    });
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    load();
  };
  const deleteActivity = async (id: string) => {
    if (!confirm('Delete this activity?')) return;
    await supabase.from('reward_activities').delete().eq('id', id);
    load();
  };

  const upsertMission = async (m: Mission) => {
    const { error } = await supabase.from('reward_missions').update({
      title: m.title, description: m.description, period: m.period,
      activity_code: m.activity_code, target_count: m.target_count,
      reward_points: m.reward_points, enabled: m.enabled,
    }).eq('id', m.id);
    toast({ title: error ? 'Save failed' : 'Mission saved', variant: error ? 'destructive' : 'default' });
    load();
  };
  const addMission = async () => {
    const code = prompt('Mission code');
    if (!code) return;
    const title = prompt('Title', code) || code;
    const { error } = await supabase.from('reward_missions').insert({
      code, title, period: 'daily', target_count: 3, reward_points: 30,
    });
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    load();
  };
  const deleteMission = async (id: string) => {
    if (!confirm('Delete this mission?')) return;
    await supabase.from('reward_missions').delete().eq('id', id);
    load();
  };

  const reverseLedger = async (entry: LedgerEntry) => {
    if (!confirm(`Reverse ${entry.points} points for this user?`)) return;
    await supabase.from('reward_ledger').update({ status: 'reversed' }).eq('id', entry.id);
    // deduct from balance
    if (entry.status === 'approved' && entry.points > 0) {
      const { data: ur } = await supabase.from('user_rewards').select('points_balance').eq('user_id', entry.user_id).maybeSingle();
      if (ur) {
        await supabase.from('user_rewards').update({
          points_balance: Math.max(0, ur.points_balance - entry.points),
        }).eq('user_id', entry.user_id);
      }
    }
    load();
  };

  if (loading || !settings) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <Tabs defaultValue="settings" className="space-y-6">
      <TabsList className="glass">
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="activities">Activities</TabsTrigger>
        <TabsTrigger value="missions">Missions</TabsTrigger>
        <TabsTrigger value="ledger">Ledger</TabsTrigger>
      </TabsList>

      {/* SETTINGS */}
      <TabsContent value="settings">
        <Card className="p-6 shiny-card space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" /> Reward Center
              </h3>
              <p className="text-sm text-muted-foreground">Master controls for points, redemption, and anti-fraud caps.</p>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={v => setSettings({ ...settings, enabled: v })} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {([
              ['ngn_per_point', '₦ per point'],
              ['min_redemption_points', 'Minimum redemption (points)'],
              ['daily_checkin_points', 'Daily check-in points'],
              ['streak_bonus_points', 'Streak bonus points'],
              ['streak_bonus_every', 'Streak bonus every N days'],
              ['referral_points_referrer', 'Referrer reward (points)'],
              ['referral_points_referred', 'New user reward (points)'],
              ['max_points_per_user_per_day', 'Max points / user / day'],
              ['max_points_per_ip_per_day', 'Max points / IP / day'],
            ] as const).map(([k, label]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number" step="0.01"
                  value={settings[k] as number}
                  onChange={e => setSettings({ ...settings, [k]: parseFloat(e.target.value) || 0 })}
                />
              </div>
            ))}
          </div>

          <Button onClick={saveSettings} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save settings
          </Button>
        </Card>
      </TabsContent>

      {/* ACTIVITIES */}
      <TabsContent value="activities" className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-lg font-semibold">Earning activities</h3>
          <Button size="sm" onClick={addActivity} className="gap-1"><Plus className="w-4 h-4" /> Add</Button>
        </div>
        {activities.map(a => (
          <Card key={a.id} className="p-4 shiny-card grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto_auto] gap-3 items-center">
            <div>
              <div className="font-mono text-xs text-muted-foreground">{a.code}</div>
              <Input value={a.name} onChange={e => setActivities(activities.map(x => x.id === a.id ? { ...x, name: e.target.value } : x))} />
            </div>
            <div>
              <Label className="text-xs">Points</Label>
              <Input type="number" value={a.points}
                onChange={e => setActivities(activities.map(x => x.id === a.id ? { ...x, points: parseInt(e.target.value) || 0 } : x))} />
            </div>
            <div>
              <Label className="text-xs">Daily cap</Label>
              <Input type="number" value={a.daily_cap ?? ''}
                onChange={e => setActivities(activities.map(x => x.id === a.id ? { ...x, daily_cap: e.target.value ? parseInt(e.target.value) : null } : x))} />
            </div>
            <div>
              <Label className="text-xs">Cooldown (s)</Label>
              <Input type="number" value={a.cooldown_seconds}
                onChange={e => setActivities(activities.map(x => x.id === a.id ? { ...x, cooldown_seconds: parseInt(e.target.value) || 0 } : x))} />
            </div>
            <Switch checked={a.enabled}
              onCheckedChange={v => setActivities(activities.map(x => x.id === a.id ? { ...x, enabled: v } : x))} />
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => upsertActivity(a)}><Save className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => deleteActivity(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
      </TabsContent>

      {/* MISSIONS */}
      <TabsContent value="missions" className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-lg font-semibold">Missions</h3>
          <Button size="sm" onClick={addMission} className="gap-1"><Plus className="w-4 h-4" /> Add</Button>
        </div>
        {missions.map(m => (
          <Card key={m.id} className="p-4 shiny-card space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="font-mono text-xs text-muted-foreground">{m.code}</div>
                <Input value={m.title} onChange={e => setMissions(missions.map(x => x.id === m.id ? { ...x, title: e.target.value } : x))} />
              </div>
              <Switch checked={m.enabled}
                onCheckedChange={v => setMissions(missions.map(x => x.id === m.id ? { ...x, enabled: v } : x))} />
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Period</Label>
                <Select value={m.period} onValueChange={(v) => setMissions(missions.map(x => x.id === m.id ? { ...x, period: v as Mission['period'] } : x))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['daily', 'weekly', 'monthly', 'seasonal', 'one_time'] as const).map(p =>
                      <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Activity code</Label>
                <Input value={m.activity_code ?? ''}
                  onChange={e => setMissions(missions.map(x => x.id === m.id ? { ...x, activity_code: e.target.value || null } : x))} />
              </div>
              <div>
                <Label className="text-xs">Target count</Label>
                <Input type="number" value={m.target_count}
                  onChange={e => setMissions(missions.map(x => x.id === m.id ? { ...x, target_count: parseInt(e.target.value) || 1 } : x))} />
              </div>
              <div>
                <Label className="text-xs">Reward points</Label>
                <Input type="number" value={m.reward_points}
                  onChange={e => setMissions(missions.map(x => x.id === m.id ? { ...x, reward_points: parseInt(e.target.value) || 0 } : x))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => upsertMission(m)} className="gap-1"><Save className="w-4 h-4" /> Save</Button>
              <Button size="sm" variant="ghost" onClick={() => deleteMission(m.id)} className="gap-1 text-destructive">
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </div>
          </Card>
        ))}
      </TabsContent>

      {/* LEDGER */}
      <TabsContent value="ledger">
        <Card className="shiny-card divide-y divide-border/40">
          {ledger.length === 0 && <div className="p-6 text-center text-muted-foreground">No reward activity yet.</div>}
          {ledger.map(e => (
            <div key={e.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                {e.status === 'rejected' || e.status === 'reversed'
                  ? <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  : <Coins className="w-4 h-4 text-primary shrink-0" />}
                <div className="min-w-0">
                  <div className="text-sm truncate">{e.description || e.source}</div>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <span className="font-mono">{e.user_id.slice(0, 8)}</span>
                    <Badge variant="outline" className="text-[10px] h-4">{e.status}</Badge>
                    <span>{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={e.points >= 0 ? 'font-semibold text-emerald-400' : 'font-semibold text-rose-400'}>
                  {e.points >= 0 ? '+' : ''}{e.points}
                </span>
                {e.status === 'approved' && e.points > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => reverseLedger(e)}>Reverse</Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      </TabsContent>
    </Tabs>
  );
};
