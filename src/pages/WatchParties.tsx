import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Plus, Play, Globe, Lock, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo } from '@/contexts/VideoContext';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Party {
  id: string; title: string; content_type: string; content_ref: string; content_title: string | null;
  content_poster: string | null; is_public: boolean; participant_count: number; host_id: string; created_at: string;
}

export default function WatchParties() {
  const { user } = useAuth();
  const { videos } = useVideo();
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', videoId: '', isPublic: true });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('watch_parties').select('*').eq('is_active', true).eq('is_public', true).order('created_at', { ascending: false }).limit(30);
    setParties((data || []) as Party[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('watch_parties_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watch_parties' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const create = async () => {
    if (!user) { toast({ title: 'Sign in required', variant: 'destructive' }); return; }
    if (!form.videoId) { toast({ title: 'Pick a video', variant: 'destructive' }); return; }
    const v = videos.find(x => x.id === form.videoId);
    setCreating(true);
    const { data, error } = await supabase.from('watch_parties').insert({
      host_id: user.id,
      title: form.title || `${v?.title || 'Watch'} party`,
      content_type: 'video',
      content_ref: form.videoId,
      content_title: v?.title || null,
      content_poster: v?.thumbnail_url || null,
      is_public: form.isPublic,
    }).select().single();
    setCreating(false);
    if (error || !data) { toast({ title: 'Failed to create', description: error?.message, variant: 'destructive' }); return; }
    await supabase.from('watch_party_participants').insert({ party_id: data.id, user_id: user.id });
    setOpen(false);
    navigate(`/watch-party/${data.id}`);
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Users className="w-7 h-7 text-primary" /> Watch Parties</h1>
            <p className="text-sm text-muted-foreground">Watch together, chat live, react with emojis</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1.5" /> Start party</Button>
            </DialogTrigger>
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
                      {videos.filter(v => v.is_published).slice(0, 100).map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">Public room</p>
                    <p className="text-xs text-muted-foreground">Anyone can discover and join</p>
                  </div>
                  <Switch checked={form.isPublic} onCheckedChange={v => setForm({ ...form, isPublic: v })} />
                </div>
                <Button className="w-full" onClick={create} disabled={creating}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  Create & start
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : parties.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No live parties right now</p>
            <p className="text-sm text-muted-foreground mb-4">Be the first to start one!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {parties.map(p => (
              <Link key={p.id} to={`/watch-party/${p.id}`}>
                <Card className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary transition">
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {p.content_poster ? (
                      <img src={p.content_poster} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                    ) : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />}
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Users className="w-3 h-3" /> {p.participant_count}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="font-medium text-sm line-clamp-1">{p.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{p.content_title}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      {p.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
