import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload,
  Play,
  Eye,
  ThumbsUp,
  MessageSquare,
  Clock,
  TrendingUp,
  BarChart3,
  DollarSign,
  Users,
  Settings,
  Edit,
  Trash2,
  MoreVertical,
  Globe,
  Lock,
  Loader2,
  Film,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo, Video } from '@/contexts/VideoContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface StudioStats {
  totalViews: number;
  totalWatchTime: number;
  totalSubscribers: number;
  totalLikes: number;
  totalComments: number;
}

const Studio = () => {
  const navigate = useNavigate();
  const { user, profile, isCreator } = useAuth();
  const { videos, deleteVideo, refreshVideos } = useVideo();

  const [stats, setStats] = useState<StudioStats>({
    totalViews: 0,
    totalWatchTime: 0,
    totalSubscribers: 0,
    totalLikes: 0,
    totalComments: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filter videos for current user
  const myVideos = videos.filter(v => v.uploader_id === user?.id);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Get subscriber count
      const { count: subscriberCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', profile?.id);

      // Calculate totals from videos
      const totals = myVideos.reduce(
        (acc, v) => ({
          views: acc.views + (v.views || 0),
          watchTime: acc.watchTime + (v.watch_time || 0),
          likes: acc.likes + (v.likes_count || 0),
          comments: acc.comments + (v.comments_count || 0),
        }),
        { views: 0, watchTime: 0, likes: 0, comments: 0 }
      );

      setStats({
        totalViews: totals.views,
        totalWatchTime: totals.watchTime,
        totalSubscribers: subscriberCount || 0,
        totalLikes: totals.likes,
        totalComments: totals.comments,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?.id, myVideos]);

  // Realtime: refresh subscriber count immediately when someone subscribes/unsubscribes
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`studio-subs:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `channel_id=eq.${profile.id}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    if (hours >= 1000) return `${(hours / 1000).toFixed(1)}K hrs`;
    if (hours >= 1) return `${hours} hrs`;
    const mins = Math.floor(seconds / 60);
    return `${mins} mins`;
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleDeleteVideo = async (video: Video) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      await deleteVideo(video.id);
      toast({ title: 'Video deleted' });
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({ title: 'Error', description: 'Failed to delete video', variant: 'destructive' });
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Film className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Sign in to access Studio</h2>
          <p className="text-muted-foreground mb-6">Manage your videos and channel from your studio</p>
          <Button onClick={() => navigate('/auth')} className="bg-primary">
            Sign In
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Channel Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.display_name}</p>
          </div>
          <Link to="/upload">
            <Button className="bg-primary hover:bg-primary/90">
              <Upload className="w-4 h-4 mr-2" />
              Upload Video
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Views', value: formatCount(stats.totalViews), icon: Eye, color: 'text-blue-500' },
            { label: 'Watch Time', value: formatWatchTime(stats.totalWatchTime), icon: Clock, color: 'text-green-500' },
            { label: 'Subscribers', value: formatCount(stats.totalSubscribers), icon: Users, color: 'text-primary' },
            { label: 'Total Likes', value: formatCount(stats.totalLikes), icon: ThumbsUp, color: 'text-yellow-500' },
            { label: 'Comments', value: formatCount(stats.totalComments), icon: MessageSquare, color: 'text-purple-500' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Channel Content</CardTitle>
                <p className="text-sm text-muted-foreground">{myVideos.length} videos</p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : myVideos.length === 0 ? (
                  <div className="text-center py-12">
                    <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No videos yet</h3>
                    <p className="text-muted-foreground mb-4">Upload your first video to get started</p>
                    <Link to="/upload">
                      <Button className="bg-primary">Upload Video</Button>
                    </Link>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Video</TableHead>
                        <TableHead>Visibility</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Comments</TableHead>
                        <TableHead>Likes</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myVideos.map(video => (
                        <TableRow key={video.id}>
                          <TableCell>
                            <Link to={`/watch/${video.id}`} className="flex items-center gap-3">
                              <div className="w-28 aspect-video rounded overflow-hidden bg-secondary flex-shrink-0">
                                {video.thumbnail_url ? (
                                  <img
                                    src={video.thumbnail_url}
                                    alt={video.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Play className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground line-clamp-2">{video.title}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {video.description || 'No description'}
                                </p>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              {video.is_published ? (
                                <>
                                  <Globe className="w-4 h-4 text-green-500" />
                                  <span>Public</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                  <span>Private</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell>{formatCount(video.views)}</TableCell>
                          <TableCell>{formatCount(video.comments_count || 0)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4" />
                              {formatCount(video.likes_count || 0)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-card border-border">
                                <DropdownMenuItem onClick={() => navigate(`/watch/${video.id}`)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/studio/video/${video.id}`)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteVideo(video)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Channel Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Views Chart Placeholder */}
                  <div className="p-6 bg-secondary rounded-xl">
                    <h3 className="font-medium text-foreground mb-4">Views (Last 28 days)</h3>
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                      <BarChart3 className="w-12 h-12" />
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      {formatCount(stats.totalViews)} total views
                    </p>
                  </div>

                  {/* Watch Time Chart Placeholder */}
                  <div className="p-6 bg-secondary rounded-xl">
                    <h3 className="font-medium text-foreground mb-4">Watch Time</h3>
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                      <TrendingUp className="w-12 h-12" />
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      {formatWatchTime(stats.totalWatchTime)} total watch time
                    </p>
                  </div>
                </div>

                {/* Top Videos */}
                <div className="mt-8">
                  <h3 className="font-medium text-foreground mb-4">Top Performing Videos</h3>
                  <div className="space-y-3">
                    {myVideos
                      .sort((a, b) => (b.views || 0) - (a.views || 0))
                      .slice(0, 5)
                      .map((video, i) => (
                        <div
                          key={video.id}
                          className="flex items-center gap-4 p-3 bg-secondary rounded-lg"
                        >
                          <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                          <div className="w-20 aspect-video rounded overflow-hidden bg-muted">
                            {video.thumbnail_url && (
                              <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{video.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatCount(video.views)} views
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Recent Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-12">
                  Comments from your videos will appear here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Studio;
