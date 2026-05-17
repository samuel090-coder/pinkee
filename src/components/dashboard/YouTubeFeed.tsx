import { useEffect, useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export interface YouTubeItem {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  publishedTimeText: string;
  viewCountText: string;
  author: { name: string; avatar: string; channelId: string };
}

function formatDuration(seconds: number) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  channelId?: string | null;
}

export function YouTubeFeed({ channelId }: Props) {
  const [items, setItems] = useState<YouTubeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.functions.invoke('fetch-youtube-videos', {
          body: { channelId: channelId || undefined },
        });
        if (error) throw error;
        if (cancelled) return;
        setItems(data?.items ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Couldn't load YouTube videos.</p>
        <p className="text-xs mt-2 break-words">{error}</p>
      </div>
    );
  }

  if (!items.length) {
    return <div className="text-center py-16 text-muted-foreground">No videos found.</div>;
  }

  return (
    <div className="space-y-6">
      {items.map((v) => (
        <article key={v.videoId} className="space-y-2">
          <div className="relative aspect-video bg-muted rounded-xl overflow-hidden">
            {playing === v.videoId ? (
              <iframe
                src={`https://www.youtube.com/embed/${v.videoId}?autoplay=1`}
                className="w-full h-full"
                title={v.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(v.videoId)}
                className="w-full h-full group"
                aria-label={`Play ${v.title}`}
              >
                {v.thumbnail && (
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                  <div className="w-14 h-14 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-6 h-6" fill="currentColor" />
                  </div>
                </div>
                {v.duration > 0 && (
                  <span className="absolute bottom-2 right-2 text-xs font-medium bg-black/80 text-white px-1.5 py-0.5 rounded">
                    {formatDuration(v.duration)}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarImage src={v.author.avatar} />
              <AvatarFallback>{v.author.name.charAt(0) || 'Y'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground line-clamp-2 text-sm">{v.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {v.author.name}
                {v.viewCountText && ` • ${v.viewCountText}`}
                {v.publishedTimeText && ` • ${v.publishedTimeText}`}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
