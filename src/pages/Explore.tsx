import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Compass, Flame } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { VideoCardNew } from '@/components/video/VideoCardNew';
import { useVideo } from '@/contexts/VideoContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';

interface ChannelCard {
  id: string;
  username: string | null;
  display_name: string | null;
  channel_name: string | null;
  avatar_url: string | null;
  subscriber_count: number | null;
}

const Explore = () => {
  const { videos } = useVideo();
  const [channels, setChannels] = useState<ChannelCard[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);

  const trendingVideos = useMemo(() => {
    return [...videos]
      .filter(v => v.is_published)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 12);
  }, [videos]);

  useEffect(() => {
    const run = async () => {
      setLoadingChannels(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, channel_name, avatar_url, subscriber_count')
          .order('subscriber_count', { ascending: false })
          .limit(12);

        if (error) throw error;
        setChannels((data || []) as ChannelCard[]);
      } catch (e) {
        console.error('Error loading channels:', e);
        setChannels([]);
      } finally {
        setLoadingChannels(false);
      }
    };

    run();
  }, []);

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto px-4 py-6 space-y-10">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Explore</h1>
          </div>
          <p className="text-muted-foreground">Discover trending videos and creators.</p>
        </header>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Trending now</h2>
            </div>
            <Link to="/trending" className="text-sm text-primary hover:underline">See all</Link>
          </div>

          {trendingVideos.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {trendingVideos.map(v => (
                <VideoCardNew key={v.id} video={v} variant="default" />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No videos yet.</div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Browse categories</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Music', to: '/music' },
              { label: 'Gaming', to: '/gaming' },
              { label: 'News', to: '/news' },
              { label: 'Sports', to: '/sports' },
              { label: 'Learning', to: '/learning' },
              { label: 'Podcasts', to: '/podcasts' },
            ].map(c => (
              <Link
                key={c.to}
                to={c.to}
                className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Creators to follow</h2>

          {loadingChannels ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : channels.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {channels.map(c => {
                const name = c.channel_name || c.display_name || c.username || 'Channel';
                return (
                  <Link key={c.id} to={`/channel/${c.id}`}>
                    <Card className="bg-card border-border hover:bg-secondary/50 transition-colors">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={c.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {c.username ? `@${c.username}` : ''}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-muted-foreground">No channels found yet.</div>
          )}
        </section>
      </div>
    </MainLayout>
  );
};

export default Explore;
