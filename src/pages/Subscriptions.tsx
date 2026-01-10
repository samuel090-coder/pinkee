import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Bell,
  BellOff,
  Grid,
  List,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainLayout } from '@/components/layout/MainLayout';
import { VideoCardNew } from '@/components/video/VideoCardNew';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo } from '@/contexts/VideoContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Subscription {
  id: string;
  channel_id: string;
  notifications_enabled: boolean;
  channel?: {
    id: string;
    display_name: string;
    avatar_url: string;
    channel_name: string;
  };
}

const Subscriptions = () => {
  const { user } = useAuth();
  const { videos } = useVideo();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (!user) return;

    const fetchSubscriptions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select(`
            *,
            profiles:channel_id (
              id,
              display_name,
              avatar_url,
              channel_name
            )
          `)
          .eq('subscriber_id', user.id);

        if (error) throw error;

        setSubscriptions(
          (data || []).map((s: any) => ({
            ...s,
            channel: s.profiles,
          }))
        );
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [user]);

  const toggleNotifications = async (sub: Subscription) => {
    try {
      await supabase
        .from('subscriptions')
        .update({ notifications_enabled: !sub.notifications_enabled })
        .eq('id', sub.id);

      setSubscriptions(prev =>
        prev.map(s =>
          s.id === sub.id ? { ...s, notifications_enabled: !s.notifications_enabled } : s
        )
      );

      toast({
        title: sub.notifications_enabled ? 'Notifications off' : 'Notifications on',
      });
    } catch (error) {
      console.error('Error toggling notifications:', error);
    }
  };

  const handleUnsubscribe = async (sub: Subscription) => {
    try {
      await supabase.from('subscriptions').delete().eq('id', sub.id);
      setSubscriptions(prev => prev.filter(s => s.id !== sub.id));
      toast({ title: 'Unsubscribed' });
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  };

  // Get videos from subscribed channels
  const subscribedChannelIds = subscriptions.map(s => s.channel_id);
  const subscriptionVideos = videos
    .filter(v => v.poster_id && subscribedChannelIds.includes(v.poster_id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Users className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Don't miss new videos</h2>
          <p className="text-muted-foreground mb-6">Sign in to see updates from your favorite channels</p>
          <Link to="/auth">
            <Button className="bg-primary">Sign In</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="videos" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-secondary">
              <TabsTrigger value="videos">Latest</TabsTrigger>
              <TabsTrigger value="channels">Channels</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="videos">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : subscriptionVideos.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No videos yet</h2>
                <p className="text-muted-foreground">
                  {subscriptions.length === 0
                    ? 'Subscribe to channels to see their latest videos here'
                    : 'Your subscribed channels haven\'t uploaded any videos yet'}
                </p>
              </div>
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'space-y-4'
                }
              >
                {subscriptionVideos.map((video, i) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <VideoCardNew
                      video={video}
                      variant={viewMode === 'grid' ? 'default' : 'list'}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="channels">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No subscriptions</h2>
                <p className="text-muted-foreground">
                  Channels you subscribe to will show up here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subscriptions.map((sub, i) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card rounded-xl p-4 border border-border flex items-center gap-4"
                  >
                    <Link to={`/channel/${sub.channel_id}`}>
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={sub.channel?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                          {sub.channel?.display_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link to={`/channel/${sub.channel_id}`}>
                        <h3 className="font-medium text-foreground hover:text-primary truncate">
                          {sub.channel?.channel_name || sub.channel?.display_name || 'Channel'}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">Subscribed</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleNotifications(sub)}
                      >
                        {sub.notifications_enabled ? (
                          <Bell className="w-5 h-5 text-primary" />
                        ) : (
                          <BellOff className="w-5 h-5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUnsubscribe(sub)}
                      >
                        Subscribed
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Subscriptions;
