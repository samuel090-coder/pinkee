import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Play, TrendingUp, Heart, Flame, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DigestContent {
  headline: string;
  stats: { videos_watched: number; liked: number; streak: number; top_categories: string[] };
  highlights: { id: string; title: string; thumbnail_url: string | null }[];
  recommendations: { id: string; title: string; thumbnail_url: string | null; category: string | null }[];
}

export function WeeklyDigestCard() {
  const { user } = useAuth();
  const [digest, setDigest] = useState<{ id: string; content: DigestContent; week_key: string; opened_at: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('user_settings').select('hide_weekly_digest' as any).eq('user_id', user.id).maybeSingle();
      setHidden(!!(data as any)?.hide_weekly_digest);
    })();
  }, [user?.id]);

  const hide = async () => {
    if (!user) return;
    setHidden(true);
    await (supabase.from('user_settings') as any).update({ hide_weekly_digest: true }).eq('user_id', user.id);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('weekly_digests').select('id, content, week_key, opened_at').eq('user_id', user.id).order('week_key', { ascending: false }).limit(1).maybeSingle();
      if (data) setDigest(data as any);
    })();
  }, [user?.id]);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.functions.invoke('generate-weekly-digest', { body: { user_id: user.id } });
      const { data } = await supabase.from('weekly_digests').select('id, content, week_key, opened_at').eq('user_id', user.id).order('week_key', { ascending: false }).limit(1).maybeSingle();
      if (data) setDigest(data as any);
    } finally { setLoading(false); }
  };

  const markOpened = async () => {
    if (digest && !digest.opened_at) await supabase.from('weekly_digests').update({ opened_at: new Date().toISOString() }).eq('id', digest.id);
  };

  if (!user || hidden) return null;

  if (!digest) {
    return (
      <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-500" />
            <div>
              <p className="font-medium">Your weekly recap</p>
              <p className="text-xs text-muted-foreground">AI-generated highlights & picks</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={generate} disabled={loading}>{loading ? 'Generating…' : 'Generate'}</Button>
            <Button size="icon" variant="ghost" onClick={hide} title="Hide (manage in Settings)"><X className="w-4 h-4" /></Button>
          </div>
        </div>
      </Card>
    );
  }

  const c = digest.content;
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 border-purple-500/20" onClick={markOpened}>
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-purple-400 font-medium uppercase tracking-wider flex items-center gap-1"><Sparkles className="w-3 h-3" /> Your week</p>
            <h3 className="text-xl font-bold mt-1">{c.headline}</h3>
          </div>
          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); hide(); }} title="Hide"><X className="w-4 h-4" /></Button>
        </div>


        <div className="grid grid-cols-3 gap-2">
          <div className="text-center rounded-lg bg-background/50 p-2">
            <Play className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{c.stats.videos_watched}</p>
            <p className="text-[10px] text-muted-foreground">Watched</p>
          </div>
          <div className="text-center rounded-lg bg-background/50 p-2">
            <Heart className="w-4 h-4 mx-auto text-pink-500 mb-1" />
            <p className="text-lg font-bold">{c.stats.liked}</p>
            <p className="text-[10px] text-muted-foreground">Liked</p>
          </div>
          <div className="text-center rounded-lg bg-background/50 p-2">
            <Flame className="w-4 h-4 mx-auto text-orange-500 mb-1" />
            <p className="text-lg font-bold">{c.stats.streak}</p>
            <p className="text-[10px] text-muted-foreground">Day streak</p>
          </div>
        </div>

        {c.recommendations?.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Picked for you</p>
            <div className="grid grid-cols-3 gap-2">
              {c.recommendations.slice(0, 3).map(r => (
                <Link key={r.id} to={`/watch/${r.id}`} className="group">
                  <div className="aspect-video rounded-md overflow-hidden bg-muted">
                    {r.thumbnail_url && <img src={r.thumbnail_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition" />}
                  </div>
                  <p className="text-xs mt-1 line-clamp-2">{r.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
