import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ListVideo } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PlaylistRow {
  id: string;
  title: string;
  description: string | null;
  video_count: number | null;
  is_public: boolean | null;
  updated_at: string;
}

const Playlists = () => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('playlists')
          .select('id, title, description, video_count, is_public, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        setPlaylists((data || []) as PlaylistRow[]);
      } catch (e) {
        console.error('Error loading playlists:', e);
        setPlaylists([]);
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
          <ListVideo className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-foreground">Your playlists</h1>
          <p className="text-muted-foreground mt-2">Sign in to view and manage your playlists.</p>
          <div className="mt-6">
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-5xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Playlists</h1>
          <p className="text-muted-foreground">Organize your videos.</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : playlists.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {playlists.map(p => (
              <Link key={p.id} to={`/playlists/${p.id}`}>
                <Card className="bg-card border-border hover:bg-secondary/50 transition-colors">
                  <CardContent className="p-5">
                    <h2 className="font-semibold text-foreground">{p.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {p.description || 'No description'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-3">
                      {p.video_count || 0} videos
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            No playlists yet.
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Playlists;
