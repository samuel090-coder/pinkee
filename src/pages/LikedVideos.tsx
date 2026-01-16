import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ThumbsUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { VideoCardNew } from '@/components/video/VideoCardNew';

const LikedVideos = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('video_likes')
          .select('created_at, video:videos(*)')
          .eq('user_id', user.id)
          .eq('is_like', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setVideos((data || []).map((r: any) => r.video).filter(Boolean));
      } catch (e) {
        console.error('Error loading liked videos:', e);
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
          <ThumbsUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground">Liked videos</h1>
          <p className="text-muted-foreground mt-2">Sign in to see videos you've liked.</p>
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
          <h1 className="text-2xl font-bold text-foreground">Liked Videos</h1>
          <p className="text-muted-foreground">Your likes, all in one place.</p>
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
          <div className="text-center py-16 text-muted-foreground">No likes yet.</div>
        )}
      </div>
    </MainLayout>
  );
};

export default LikedVideos;
