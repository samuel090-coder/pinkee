import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  History as HistoryIcon,
  Trash2,
  Search,
  Pause,
  Play,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MainLayout } from '@/components/layout/MainLayout';
import { VideoCardNew } from '@/components/video/VideoCardNew';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo, Video } from '@/contexts/VideoContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface WatchHistoryItem {
  id: string;
  video_id: string;
  watched_at: string;
  watch_duration: number;
  last_position: number;
  completed: boolean;
  video?: Video;
}

const History = () => {
  const { user } = useAuth();
  const { videos } = useVideo();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyPaused, setHistoryPaused] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('watch_history')
          .select('*')
          .eq('user_id', user.id)
          .order('watched_at', { ascending: false });

        if (error) throw error;

        // Attach video data
        const historyWithVideos = (data || []).map(item => ({
          ...item,
          video: videos.find(v => v.id === item.video_id),
        })).filter(item => item.video);

        setHistory(historyWithVideos);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, videos]);

  const handleClearHistory = async () => {
    if (!user || !confirm('Are you sure you want to clear your watch history?')) return;

    try {
      await supabase
        .from('watch_history')
        .delete()
        .eq('user_id', user.id);

      setHistory([]);
      toast({ title: 'History cleared' });
    } catch (error) {
      console.error('Error clearing history:', error);
      toast({ title: 'Error', description: 'Failed to clear history', variant: 'destructive' });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await supabase
        .from('watch_history')
        .delete()
        .eq('id', itemId);

      setHistory(prev => prev.filter(h => h.id !== itemId));
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const filteredHistory = history.filter(item =>
    item.video?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by date
  const groupedHistory: { [key: string]: WatchHistoryItem[] } = {};
  filteredHistory.forEach(item => {
    const date = new Date(item.watched_at).toDateString();
    if (!groupedHistory[date]) groupedHistory[date] = [];
    groupedHistory[date].push(item);
  });

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <HistoryIcon className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Keep track of what you watch</h2>
          <p className="text-muted-foreground mb-6">Watch history isn't viewable when signed out</p>
          <Link to="/auth">
            <Button className="bg-primary">Sign In</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-foreground">Watch History</h1>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search watch history"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-input border-border w-64"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* History List */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-16">
                <HistoryIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {searchQuery ? 'No results found' : 'No watch history'}
                </h2>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try different keywords' : 'Videos you watch will show up here'}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedHistory).map(([date, items]) => (
                  <div key={date}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">
                      {date === new Date().toDateString() ? 'Today' : 
                       date === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' : date}
                    </h3>
                    <div className="space-y-4">
                      {items.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="group relative"
                        >
                          {item.video && (
                            <VideoCardNew video={item.video} variant="list" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-72 space-y-4">
            <div className="bg-card rounded-xl p-4 border border-border">
              <h3 className="font-medium text-foreground mb-4">History Settings</h3>
              
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setHistoryPaused(!historyPaused)}
                >
                  {historyPaused ? (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Resume history
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause history
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={handleClearHistory}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear all history
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Your watch history is used to personalize your recommendations and improve your experience.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default History;
