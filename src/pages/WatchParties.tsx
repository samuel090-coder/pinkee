import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Plus, Play, Globe, Lock, Loader2, Clock, History as HistoryIcon } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo } from '@/contexts/VideoContext';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Party {
  id: string; title: string; content_type: string; content_ref: string; content_title: string | null;
  content_poster: string | null; is_public: boolean; participant_count: number; host_id: string;
  created_at: string; expires_at: string | null; short_code: string | null; is_active: boolean;
  ai_viewer_count: number;
}

export default function WatchParties() {
  const { user } = useAuth();
  const { videos } = useVideo();
  const navigate = useNavigate();
  const [live, setLive] = useState<Party[]>([]);
  const [mine, setMine] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', videoId: '', isPublic: true, durationMin: 120, aiSeed: true });

  const load = async () => {
    setLoading(true);
    const { data: liveData } = await supabase.from('watch_parties').select('*').eq('is_active', true).eq('is_public', true).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('created_at', { ascending: false }).limit(30);
    setLive((liveData || []) as any as Party[]);
    if (user) {
      const { data: partData } = await supabase.from('watch_party_participants').select('party_id, joined_at').eq('user_id', user.id).order('joined_at', { ascending: false }).limit(50);
      const ids = (partData || []).map((p: any) => p.party_id);
      if (ids.length) {
        const { data: p } = await supabase.from('watch_parties').select('*').in('id', ids);
        setMine((p || []) as any as Party[]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('watch_parties_list').on('postgres_changes', { event: '*', schema: 'public', table: 'watch_parties' }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const create = async () => {
    if (!user) { toast({ title: 'Sign in required', variant: 'destructive' }); return; }
    if (!form.videoId) { toast({ title: 'Pick a video', variant: 'destructive' }); return; }
    const v = videos.find(x => x.id === form.videoId);
    setCreating(true);
    const expiresAt = new Date(Date.now() + form.durationMin * 60000).toISOString();
    const { data, error } = await (supabase.from('watch_parties') as any).insert({
      host_id: user.id,
      title: form.title || `${v?.title || 'Watch'} party`,
      content_type: 'video', content_ref: form.videoId,
      content_title: v?.title || null, content_poster: v?.thumbnail_url || null,
      is_public: form.isPublic, expires_at: expiresAt, ai_seed_enabled: form.aiSeed,
    }).select().single();
    setCreating(false);
    if (error || !data) { toast({ title: 'Failed to create', description: error?.message, variant: 'destructive' }); return; }
    await supabase.from('watch_party_participants').insert({ party_id: data.id, user_id: user.id });
    setOpen(false);
    navigate(`/wp/${(data as any).short_code || data.id}`);
  };

  const Card_ = (p: Party) => (
    <Link key={p.id} to={`/wp/${p.short_code || p.id}`}>
      <Card className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary transition">
        <div className="aspect-video bg-muted relative overflow-hidden">
          {p.content_poster ? <img src={p.content_poster} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />}
          {p.is_active && (!p.expires_at || new Date(p.expires_at) > new Date()) ? (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </div>
          ) : (
            <div className="absolute top-2 left-2 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded">ENDED</div>
          )}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1"><Users className="w-3 h-3" /> {(p.participant_count || 0) + (p.ai_viewer_count || 0)}</div>
        </div>
        <div className="p-2.5">
          <p className="font-medium text-sm line-clamp-1">{p.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{p.content_title}</p>
          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            {p.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
            {p.short_code && <span className="ml-auto font-mono bg-muted px-1 rounded">{p.short_code}</span>}
          </p>
        </div>
      </Card>
    </Link>
  );

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Users className="w-7 h-7 text-primary" /> Watch Parties</h1>
            <p className="text-sm text-muted-foreground">Watch together, chat live, react — share short links</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1.5" /> Start party</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Start a watch party</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Party name</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Friday movie night" />
                </div>
                <div>
                  <Label>Pick a video</Label>
                  <Select value={form.videoId} onValueChange={v => setForm({ ...form, videoId: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose from library" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {videos.filter(v => v.is_published).slice(0, 100).map(v => (<SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Room expires after</Label>
                  <Select value={String(form.durationMin)} onValueChange={v => setForm({ ...form, durationMin: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                      <SelectItem value="1440">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">Room auto-closes at expiry and cannot be reopened.</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-medium text-sm">Public room</p><p className="text-xs text-muted-foreground">Anyone with the link can watch (chat requires sign-in)</p></div>
                  <Switch checked={form.isPublic} onCheckedChange={v => setForm({ ...form, isPublic: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><p className="font-medium text-sm">Enable AI ambience</p><p className="text-xs text-muted-foreground">Adds realistic background chatter & viewers</p></div>
                  <Switch checked={form.aiSeed} onCheckedChange={v => setForm({ ...form, aiSeed: v })} />
                </div>
                <Button className="w-full" onClick={create} disabled={creating}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  Create & start
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="live">
          <TabsList>
            <TabsTrigger value="live">Live public</TabsTrigger>
            <TabsTrigger value="mine"><HistoryIcon className="w-4 h-4 mr-1" />My rooms</TabsTrigger>
          </TabsList>
          <TabsContent value="live" className="mt-4">
            {loading ? <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              : live.length === 0 ? (
                <Card className="p-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">No live parties right now</p>
                  <p className="text-sm text-muted-foreground mb-4">Be the first to start one!</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{live.map(Card_)}</div>
              )}
          </TabsContent>
          <TabsContent value="mine" className="mt-4">
            {!user ? (
              <Card className="p-12 text-center"><p className="text-sm text-muted-foreground">Sign in to see your party history.</p></Card>
            ) : mine.length === 0 ? (
              <Card className="p-12 text-center"><Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p>No rooms yet — join or create one.</p></Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{mine.map(Card_)}</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
