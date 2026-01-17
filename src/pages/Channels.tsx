import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Users, Search } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface Channel {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  channel_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  subscriber_count: number | null;
  total_views: number | null;
}

const Channels = () => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchChannels = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('profiles')
          .select('id, user_id, username, display_name, channel_name, avatar_url, bio, subscriber_count, total_views')
          .order('subscriber_count', { ascending: false })
          .limit(50);

        if (searchQuery.trim()) {
          const like = `%${searchQuery.trim()}%`;
          query = query.or(`username.ilike.${like},display_name.ilike.${like},channel_name.ilike.${like}`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setChannels((data || []) as Channel[]);
      } catch (e) {
        console.error('Error fetching channels:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [searchQuery]);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('subscriptions')
        .select('channel_id')
        .eq('subscriber_id', user.id);

      setSubscriptions(new Set((data || []).map(s => s.channel_id)));
    };

    fetchSubscriptions();
  }, [user]);

  const handleSubscribe = async (channelId: string) => {
    if (!user) {
      toast({ title: 'Sign in required' });
      return;
    }

    const isSubscribed = subscriptions.has(channelId);

    try {
      if (isSubscribed) {
        await supabase.from('subscriptions').delete().eq('channel_id', channelId).eq('subscriber_id', user.id);
        setSubscriptions(prev => {
          const next = new Set(prev);
          next.delete(channelId);
          return next;
        });
        toast({ title: 'Unsubscribed' });
      } else {
        await supabase.from('subscriptions').insert({ channel_id: channelId, subscriber_id: user.id });
        setSubscriptions(prev => new Set([...prev, channelId]));
        toast({ title: 'Subscribed!' });
      }
    } catch (e) {
      console.error('Error subscribing:', e);
    }
  };

  const formatCount = (count: number | null) => {
    if (!count) return '0';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        <header className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Channels</h1>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : channels.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel) => {
              const name = channel.channel_name || channel.display_name || channel.username || 'Channel';
              const isSubscribed = subscriptions.has(channel.id);

              return (
                <Card key={channel.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Link to={`/channel/${channel.id}`}>
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={channel.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                            {name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/channel/${channel.id}`}>
                          <h3 className="font-semibold text-foreground truncate hover:text-primary">
                            {name}
                          </h3>
                        </Link>
                        {channel.username && (
                          <p className="text-sm text-muted-foreground">@{channel.username}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatCount(channel.subscriber_count)} subscribers
                        </p>
                        {channel.bio && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {channel.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleSubscribe(channel.id)}
                      variant={isSubscribed ? 'secondary' : 'default'}
                      className="w-full mt-4"
                      size="sm"
                    >
                      {isSubscribed ? 'Subscribed' : 'Subscribe'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            No channels found.
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Channels;
