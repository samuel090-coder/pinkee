import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  BellOff,
  CheckCircle,
  Play,
  Users,
  Eye,
  Calendar,
  ExternalLink,
  Share2,
  Flag,
  MoreVertical,
  Loader2,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MainLayout } from '@/components/layout/MainLayout';
import { VideoCardNew } from '@/components/video/VideoCardNew';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo } from '@/contexts/VideoContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ChannelProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  is_verified: boolean;
  subscriber_count: number;
  total_views: number;
  channel_name: string | null;
  channel_description: string | null;
  created_at: string;
}

const Channel = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile: myProfile } = useAuth();
  const { videos } = useVideo();

  const [channel, setChannel] = useState<ChannelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  const isOwnChannel = id === 'me' || (user && channel?.user_id === user.id);

  // Filter videos for this channel
  const channelVideos = videos.filter(v => {
    if (!channel) return false;
    if (isOwnChannel) return v.uploader_id === channel.user_id;
    return v.uploader_id === channel.user_id && v.is_published;
  });

  useEffect(() => {
    const fetchChannel = async () => {
      setLoading(true);
      try {
        let query = supabase.from('profiles').select('*');

        if (id === 'me' && user) {
          query = query.eq('user_id', user.id);
        } else {
          query = query.eq('id', id);
        }

        const { data, error } = await query.single();

        if (error) throw error;
        setChannel(data);
        setSubscriberCount(data.subscriber_count || 0);

        // Check subscription
        if (user && data && !isOwnChannel) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('channel_id', data.id)
            .eq('subscriber_id', user.id)
            .maybeSingle();

          setIsSubscribed(!!subData);
        }
      } catch (error) {
        console.error('Error fetching channel:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannel();
  }, [id, user, isOwnChannel]);

  const handleSubscribe = async () => {
    if (!user || !channel) {
      toast({ title: 'Sign in required' });
      return;
    }

    try {
      if (isSubscribed) {
        await supabase.from('subscriptions').delete()
          .eq('channel_id', channel.id)
          .eq('subscriber_id', user.id);
        setIsSubscribed(false);
        setSubscriberCount(prev => prev - 1);
        toast({ title: 'Unsubscribed' });
      } else {
        await supabase.from('subscriptions').insert({
          channel_id: channel.id,
          subscriber_id: user.id,
        });
        setIsSubscribed(true);
        setSubscriberCount(prev => prev + 1);
        toast({ title: 'Subscribed!', description: `You're now subscribed to ${channel.display_name}` });
      }

      // Update channel subscriber count
      await supabase.from('profiles').update({
        subscriber_count: subscriberCount + (isSubscribed ? -1 : 1),
      }).eq('id', channel.id);
    } catch (error) {
      console.error('Error subscribing:', error);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!channel) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-xl font-semibold text-foreground mb-2">Channel not found</h2>
          <p className="text-muted-foreground">This channel doesn't exist or has been removed</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30">
        {channel.banner_url && (
          <img
            src={channel.banner_url}
            alt="Channel banner"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      {/* Channel Info */}
      <div className="container max-w-7xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 pb-6 border-b border-border">
          {/* Avatar */}
          <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background">
            <AvatarImage src={channel.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
              {channel.display_name?.charAt(0) || channel.channel_name?.charAt(0) || 'C'}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {channel.channel_name || channel.display_name || 'Channel'}
              </h1>
              {channel.is_verified && (
                <CheckCircle className="w-5 h-5 text-primary" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
              <span>@{channel.username || 'channel'}</span>
              <span>•</span>
              <span>{formatCount(subscriberCount)} subscribers</span>
              <span>•</span>
              <span>{channelVideos.length} videos</span>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">
              {channel.channel_description || channel.bio || 'No description'}
            </p>

            <div className="flex items-center gap-3 mt-4">
              {isOwnChannel ? (
                <Link to="/settings">
                  <Button variant="secondary">
                    <Edit className="w-4 h-4 mr-2" />
                    Customize channel
                  </Button>
                </Link>
              ) : (
                <>
                  <Button
                    onClick={handleSubscribe}
                    variant={isSubscribed ? 'secondary' : 'default'}
                    className={isSubscribed ? '' : 'bg-primary hover:bg-primary/90'}
                  >
                    {isSubscribed ? (
                      <>
                        <BellOff className="w-4 h-4 mr-2" />
                        Subscribed
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 mr-2" />
                        Subscribe
                      </>
                    )}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share channel
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Flag className="w-4 h-4 mr-2" />
                        Report channel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="videos" className="mt-4">
          <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0">
            {['Videos', 'Shorts', 'Live', 'Playlists', 'Community', 'About'].map(tab => (
              <TabsTrigger
                key={tab}
                value={tab.toLowerCase()}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="videos" className="mt-6">
            {channelVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {channelVideos.map(video => (
                  <VideoCardNew key={video.id} video={video} variant="default" />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Play className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No videos yet</h3>
                <p className="text-muted-foreground">
                  {isOwnChannel ? 'Upload your first video to get started' : 'This channel has no public videos'}
                </p>
                {isOwnChannel && (
                  <Link to="/upload">
                    <Button className="mt-4 bg-primary">Upload Video</Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shorts" className="mt-6">
            <div className="text-center py-16 text-muted-foreground">
              No Shorts yet
            </div>
          </TabsContent>

          <TabsContent value="live" className="mt-6">
            <div className="text-center py-16 text-muted-foreground">
              No live streams yet
            </div>
          </TabsContent>

          <TabsContent value="playlists" className="mt-6">
            <div className="text-center py-16 text-muted-foreground">
              No public playlists
            </div>
          </TabsContent>

          <TabsContent value="community" className="mt-6">
            <div className="text-center py-16 text-muted-foreground">
              No community posts yet
            </div>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <div className="max-w-3xl space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {channel.channel_description || channel.bio || 'No description provided'}
                </p>
              </div>

              <div className="flex flex-wrap gap-8">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Stats</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {formatCount(subscriberCount)} subscribers
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      {formatCount(channel.total_views || 0)} views
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Joined {formatDistanceToNow(new Date(channel.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Channel;
