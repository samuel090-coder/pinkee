import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { VideoCardNew } from '@/components/video/VideoCardNew';

interface PlaylistRow {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean | null;
  user_id: string;
}

const PlaylistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<PlaylistRow | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: playlistData, error: playlistError } = await supabase
          .from('playlists')
          .select('id, title, description, is_public, user_id')
          .eq('id', id)
          .single();

        if (playlistError) throw playlistError;
        setPlaylist(playlistData as PlaylistRow);

        const { data: itemsData, error: itemsError } = await supabase
          .from('playlist_items')
          .select('id, position, video:videos(*)')
          .eq('playlist_id', id)
          .order('position', { ascending: true });

        if (itemsError) throw itemsError;
        setVideos((itemsData || []).map((r: any) => r.video).filter(Boolean));
      } catch (e) {
        console.error('Error loading playlist:', e);
        setPlaylist(null);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id]);

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link to="/playlists">
            <Button variant="ghost" className="px-0">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to playlists
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !playlist ? (
          <div className="text-center py-16 text-muted-foreground">Playlist not found.</div>
        ) : (
          <>
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">{playlist.title}</h1>
              <p className="text-muted-foreground mt-2">{playlist.description || 'No description'}</p>
            </header>

            {videos.length ? (
              <div className="space-y-3">
                {videos.map((v: any) => (
                  <VideoCardNew key={v.id} video={v} variant="list" />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">No videos in this playlist.</div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default PlaylistDetail;
