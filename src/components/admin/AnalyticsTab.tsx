import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Eye, Activity, Target, Users, Smartphone, Monitor, Tablet, Trash2, ShieldOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface PageView {
  id: string;
  user_id: string | null;
  path: string;
  device: string | null;
  session_id: string | null;
  created_at: string;
}

interface WatchEvent {
  id: string;
  user_id: string | null;
  tmdb_id: number | null;
  video_id: string | null;
  title: string | null;
  media_type: string | null;
  watched_seconds: number;
  total_seconds: number | null;
  percent_watched: number | null;
  reached_threshold: boolean;
  completed: boolean;
  created_at: string;
}

interface AdminUserRow {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  total_views: number | null;
  is_admin: boolean;
}

const THRESHOLD_PCT = 0.5; // anything ≥ 50% counts as "watched past threshold"

export function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [watch, setWatch] = useState<WatchEvent[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [pv, we, profiles, roles] = await Promise.all([
        supabase.from('page_views' as any).select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('video_watch_events' as any).select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('profiles').select('user_id, display_name, username, avatar_url, joined_at, total_views').order('joined_at', { ascending: false }).limit(200),
        supabase.from('user_roles').select('user_id, role'),
      ]);
      setPageViews((pv.data as any) ?? []);
      setWatch((we.data as any) ?? []);

      const adminIds = new Set(((roles.data as any) ?? []).filter((r: any) => r.role === 'admin').map((r: any) => r.user_id));
      const list: AdminUserRow[] = ((profiles.data as any) ?? []).map((p: any) => ({
        ...p,
        is_admin: adminIds.has(p.user_id),
      }));
      setUsers(list);
    } catch (e: any) {
      toast({ title: 'Could not load analytics', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // ===== Aggregations =====
  const uniqueSessions = new Set(pageViews.map(p => p.session_id).filter(Boolean)).size;
  const totalPageViews = pageViews.length;

  const pathCounts = pageViews.reduce<Record<string, number>>((acc, p) => {
    acc[p.path] = (acc[p.path] ?? 0) + 1; return acc;
  }, {});
  const topPaths = Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const deviceCounts = pageViews.reduce<Record<string, number>>((acc, p) => {
    const k = p.device ?? 'unknown';
    acc[k] = (acc[k] ?? 0) + 1; return acc;
  }, {});

  const totalWatchSessions = watch.length;
  const reachedThreshold = watch.filter(w => w.reached_threshold || (w.percent_watched ?? 0) >= THRESHOLD_PCT).length;
  const completed = watch.filter(w => w.completed || (w.percent_watched ?? 0) >= 0.9).length;
  const remaining = totalWatchSessions - reachedThreshold;
  const thresholdRate = totalWatchSessions ? (reachedThreshold / totalWatchSessions) * 100 : 0;

  const titleCounts = watch.reduce<Record<string, { plays: number; threshold: number; completed: number }>>((acc, w) => {
    const k = w.title ?? '(unknown)';
    if (!acc[k]) acc[k] = { plays: 0, threshold: 0, completed: 0 };
    acc[k].plays += 1;
    if (w.reached_threshold || (w.percent_watched ?? 0) >= THRESHOLD_PCT) acc[k].threshold += 1;
    if (w.completed || (w.percent_watched ?? 0) >= 0.9) acc[k].completed += 1;
    return acc;
  }, {});
  const topTitles = Object.entries(titleCounts).sort((a, b) => b[1].plays - a[1].plays).slice(0, 12);

  // Per-user completion stats: count UNIQUE titles fully watched (≥90%) by each user
  const userCompletionMap = watch.reduce<Record<string, { fullyWatched: Set<string>; started: Set<string> }>>((acc, w) => {
    if (!w.user_id) return acc;
    if (!acc[w.user_id]) acc[w.user_id] = { fullyWatched: new Set(), started: new Set() };
    const key = w.video_id || (w.tmdb_id ? `${w.media_type}:${w.tmdb_id}` : w.title || w.id);
    acc[w.user_id].started.add(key);
    if (w.completed || (w.percent_watched ?? 0) >= 0.9) acc[w.user_id].fullyWatched.add(key);
    return acc;
  }, {});

  // ===== Users management =====
  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.display_name ?? '').toLowerCase().includes(q) ||
      (u.username ?? '').toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q);
  });

  const toggleAdmin = async (u: AdminUserRow) => {
    try {
      if (u.is_admin) {
        const { error } = await supabase.from('user_roles').delete().eq('user_id', u.user_id).eq('role', 'admin');
        if (error) throw error;
        toast({ title: `Removed admin from ${u.display_name ?? u.user_id}` });
      } else {
        const { error } = await supabase.from('user_roles').insert({ user_id: u.user_id, role: 'admin' });
        if (error) throw error;
        toast({ title: `Granted admin to ${u.display_name ?? u.user_id}` });
      }
      void load();
    } catch (e: any) {
      toast({ title: 'Action failed', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading analytics…
      </div>
    );
  }

  const stats = [
    { label: 'Page Views', value: totalPageViews.toLocaleString(), icon: Eye, color: 'text-blue-400' },
    { label: 'Unique Sessions', value: uniqueSessions.toLocaleString(), icon: Activity, color: 'text-green-400' },
    { label: 'Watch Sessions', value: totalWatchSessions.toLocaleString(), icon: Activity, color: 'text-purple-400' },
    { label: `Threshold Reached (${Math.round(THRESHOLD_PCT * 100)}%)`, value: `${reachedThreshold} (${thresholdRate.toFixed(0)}%)`, icon: Target, color: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="shiny-card rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold">{s.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Watch funnel */}
      <div className="shiny-card rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Watch funnel</h3>
        <div className="space-y-2 text-sm">
          <FunnelBar label="Started watching" value={totalWatchSessions} total={totalWatchSessions} />
          <FunnelBar label={`Reached ${Math.round(THRESHOLD_PCT * 100)}% threshold`} value={reachedThreshold} total={totalWatchSessions} />
          <FunnelBar label="Completed (≥90%)" value={completed} total={totalWatchSessions} />
          <FunnelBar label="Remaining (below threshold)" value={remaining} total={totalWatchSessions} variant="muted" />
        </div>
      </div>

      {/* Devices + Top pages side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="shiny-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Device split</h3>
          <div className="space-y-2 text-sm">
            {Object.entries(deviceCounts).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="capitalize flex items-center gap-2">
                  {k === 'mobile' ? <Smartphone className="w-3.5 h-3.5" /> : k === 'tablet' ? <Tablet className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
                  {k}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{v}</span>
              </div>
            ))}
            {Object.keys(deviceCounts).length === 0 && <p className="text-muted-foreground text-xs">No data yet</p>}
          </div>
        </div>

        <div className="shiny-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Eye className="w-4 h-4" /> Top pages visited</h3>
          <div className="space-y-1.5 text-sm max-h-64 overflow-auto">
            {topPaths.map(([path, n]) => (
              <div key={path} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs">{path}</span>
                <Badge variant="secondary" className="text-[10px]">{n}</Badge>
              </div>
            ))}
            {topPaths.length === 0 && <p className="text-muted-foreground text-xs">No page views recorded yet</p>}
          </div>
        </div>
      </div>

      {/* Top titles by watch */}
      <div className="shiny-card rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3">Top watched titles</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground text-xs">
                <th className="py-2 pr-2">Title</th>
                <th className="py-2 px-2">Plays</th>
                <th className="py-2 px-2">≥{Math.round(THRESHOLD_PCT * 100)}%</th>
                <th className="py-2 px-2">Completed</th>
                <th className="py-2 pl-2">Threshold rate</th>
              </tr>
            </thead>
            <tbody>
              {topTitles.map(([title, c]) => (
                <tr key={title} className="border-t border-border/40">
                  <td className="py-2 pr-2 truncate max-w-[220px]">{title}</td>
                  <td className="py-2 px-2 font-mono text-xs">{c.plays}</td>
                  <td className="py-2 px-2 font-mono text-xs">{c.threshold}</td>
                  <td className="py-2 px-2 font-mono text-xs">{c.completed}</td>
                  <td className="py-2 pl-2 font-mono text-xs">{c.plays ? Math.round((c.threshold / c.plays) * 100) : 0}%</td>
                </tr>
              ))}
              {topTitles.length === 0 && (
                <tr><td colSpan={5} className="py-3 text-muted-foreground text-xs">No watch data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="shiny-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Recent page views</h3>
          <div className="space-y-1.5 text-xs max-h-72 overflow-auto">
            {pageViews.slice(0, 30).map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 border-b border-border/30 pb-1">
                <span className="truncate">{p.path}</span>
                <span className="text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
              </div>
            ))}
            {pageViews.length === 0 && <p className="text-muted-foreground">No data</p>}
          </div>
        </div>
        <div className="shiny-card rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3">Recent watch events</h3>
          <div className="space-y-1.5 text-xs max-h-72 overflow-auto">
            {watch.slice(0, 30).map(w => (
              <div key={w.id} className="flex items-center justify-between gap-2 border-b border-border/30 pb-1">
                <span className="truncate">
                  <span className="text-foreground">{w.title ?? '(untitled)'}</span>
                  <span className="text-muted-foreground"> · {Math.round((w.percent_watched ?? 0) * 100)}%</span>
                  {w.completed && <Badge variant="secondary" className="ml-1 text-[9px] py-0">done</Badge>}
                </span>
                <span className="text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}</span>
              </div>
            ))}
            {watch.length === 0 && <p className="text-muted-foreground">No data</p>}
          </div>
        </div>
      </div>

      {/* Users management */}
      <div className="shiny-card rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Manage users</h3>
          <Input
            placeholder="Search by name, username, or id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs h-8 text-xs"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground text-xs">
                <th className="py-2 pr-2">User</th>
                <th className="py-2 px-2">Joined</th>
                <th className="py-2 px-2">Views</th>
                <th className="py-2 px-2" title="Unique videos this user watched fully (≥90%)">Fully watched</th>
                <th className="py-2 px-2">Started</th>
                <th className="py-2 px-2">Role</th>
                <th className="py-2 pl-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.slice(0, 100).map(u => {
                const stats = userCompletionMap[u.user_id];
                const fully = stats?.fullyWatched.size ?? 0;
                const started = stats?.started.size ?? 0;
                return (
                <tr key={u.user_id} className="border-t border-border/40">
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-muted" />
                      )}
                      <div className="leading-tight">
                        <div className="text-xs">{u.display_name ?? u.username ?? '—'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[160px]">{u.user_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-xs text-muted-foreground">
                    {u.joined_at ? formatDistanceToNow(new Date(u.joined_at), { addSuffix: true }) : '—'}
                  </td>
                  <td className="py-2 px-2 font-mono text-xs">{u.total_views ?? 0}</td>
                  <td className="py-2 px-2 font-mono text-xs">
                    <Badge variant={fully > 0 ? 'default' : 'secondary'} className="text-[10px]">{fully}</Badge>
                  </td>
                  <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{started}</td>
                  <td className="py-2 px-2">
                    {u.is_admin
                      ? <Badge className="text-[10px]">admin</Badge>
                      : <Badge variant="secondary" className="text-[10px]">user</Badge>}
                  </td>
                  <td className="py-2 pl-2 text-right">
                    <Button
                      size="sm"
                      variant={u.is_admin ? 'outline' : 'default'}
                      className="h-7 text-xs gap-1"
                      onClick={() => toggleAdmin(u)}
                    >
                      {u.is_admin ? <><ShieldOff className="w-3 h-3" /> Revoke admin</> : <><Shield className="w-3 h-3" /> Make admin</>}
                    </Button>
                  </td>
                </tr>
              );})}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={7} className="py-3 text-muted-foreground text-xs">No users match your search</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FunnelBar({ label, value, total, variant = 'primary' }: { label: string; value: number; total: number; variant?: 'primary' | 'muted' }) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{value} · {pct.toFixed(0)}%</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${variant === 'primary' ? 'bg-primary' : 'bg-muted-foreground/50'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
