import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Clock } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { VideoCardNew } from '@/components/video/VideoCardNew';

const WatchLater = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: playlist } = await supabase
          .from('playlists')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', 'Watch Later')
          .maybeSingle();

        if (!playlist?.id) {
          setVideos([]);
          return;
        }

        const { data: itemsData, error } = await supabase
          .from('playlist_items')
          .select('id, added_at, video:videos(*)')
          .eq('playlist_id', playlist.id)
          .order('added_at', { ascending: false });

        if (error) throw error;
        setVideos((itemsData || []).map((r: any) => r.video).filter(Boolean));
      } catch (e) {
        console.error('Error loading watch later:', e);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user]);

  if (!user) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
          <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground">Watch Later</h1>
          <p className="text-muted-foreground mt-2">Sign in to see videos you saved for later.</p>
          <div className="mt-6">
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Watch Later</h1>
          <p className="text-muted-foreground">Saved videos to watch later.</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : videos.length ? (
          <div className="space-y-3">
            {videos.map((v: any) => (
              <VideoCardNew key={v.id} video={v} variant="list" />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">Nothing saved yet.</div>
        )}
      </div>
    </MainLayout>
  );
};

export default WatchLater;
