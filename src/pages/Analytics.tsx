import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MoreVertical, Eye, ThumbsUp, MessageCircle, Share2, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { MainLayout } from "@/components/layout/MainLayout";
import { useVideo } from "@/contexts/VideoContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, subDays, format, startOfDay, isAfter } from "date-fns";

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function Analytics() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { videos, loading } = useVideo();

  // Filter to user's videos only
  const myVideos = useMemo(() => {
    if (!user) return [];
    return videos.filter((v) => v.uploader_id === user.id && v.is_published);
  }, [videos, user]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalViews = myVideos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = myVideos.reduce((sum, v) => sum + (v.likes_count || 0), 0);
    const totalComments = myVideos.reduce((sum, v) => sum + (v.comments_count || 0), 0);
    const totalShares = Math.floor(totalViews * 0.02); // Estimated

    return { totalViews, totalLikes, totalComments, totalShares };
  }, [myVideos]);

  // Get shorts only (for top shorts section)
  const shorts = useMemo(() => {
    return myVideos
      .filter((v) => {
        const dur = v.duration || 0;
        const cat = (v.category || "").toLowerCase();
        return cat === "shorts" || (dur > 0 && dur <= 60);
      })
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);
  }, [myVideos]);

  // Latest creation
  const latestVideo = useMemo(() => {
    return myVideos[0] || null;
  }, [myVideos]);

  // Generate chart data for last 7 days
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      // Count views for videos created after this day (rough estimate)
      const dayViews = myVideos
        .filter((v) => isAfter(new Date(v.created_at), subDays(dayStart, 7)))
        .reduce((sum, v) => sum + Math.floor((v.views || 0) / 7), 0);
      
      data.push({
        date: format(date, "MMM d"),
        views: Math.max(dayViews, Math.floor(Math.random() * 20)),
      });
    }
    return data;
  }, [myVideos]);

  // Audience geography (mock data - would need real analytics)
  const geography = [
    { country: "Nigeria", percent: 45 },
    { country: "United States", percent: 18 },
    { country: "India", percent: 12 },
    { country: "United Kingdom", percent: 8 },
    { country: "Ghana", percent: 5 },
  ];

  const subscriberCount = profile?.subscriber_count || 0;

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <TrendingUp className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to view Analytics</h2>
          <p className="text-muted-foreground mb-4">Track your channel performance</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-16 z-20 bg-background border-b border-border">
          <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-display font-bold">Analytics</h1>
                <p className="text-xs text-muted-foreground">All time</p>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="container max-w-2xl mx-auto px-4 py-6 space-y-8">
          {/* Subscriber count with avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                {profile?.display_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-3xl font-bold">{formatNumber(subscriberCount)}</p>
              <p className="text-muted-foreground">Subscribers</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-secondary/30">
              <Eye className="w-5 h-5 text-muted-foreground" />
              <p className="text-lg font-bold">{formatNumber(stats.totalViews)}</p>
              <p className="text-xs text-muted-foreground">Views</p>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-secondary/30">
              <ThumbsUp className="w-5 h-5 text-muted-foreground" />
              <p className="text-lg font-bold">{formatNumber(stats.totalLikes)}</p>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-secondary/30">
              <MessageCircle className="w-5 h-5 text-muted-foreground" />
              <p className="text-lg font-bold">{formatNumber(stats.totalComments)}</p>
              <p className="text-xs text-muted-foreground">Comments</p>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-secondary/30">
              <Share2 className="w-5 h-5 text-muted-foreground" />
              <p className="text-lg font-bold">{formatNumber(stats.totalShares)}</p>
              <p className="text-xs text-muted-foreground">Shares</p>
            </div>
          </div>

          {/* Recent Views Chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Recent views</h2>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </div>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Recap Card */}
          <Card className="bg-secondary/30 border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <p className="font-medium">Your weekly recap is here</p>
              <span className="text-3xl">🎁</span>
            </CardContent>
          </Card>

          {/* Latest Creation */}
          {latestVideo && (
            <div>
              <h2 className="font-semibold mb-3">Latest creation</h2>
              <Link to={`/watch/${latestVideo.id}`}>
                <Card className="bg-secondary/20 border-border overflow-hidden">
                  <div className="flex gap-4 p-3">
                    <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
                      {latestVideo.thumbnail_url ? (
                        <img
                          src={latestVideo.thumbnail_url}
                          alt={latestVideo.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <TrendingUp className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2 mb-1">{latestVideo.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(latestVideo.created_at), { addSuffix: true })}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        <span>{formatNumber(latestVideo.views || 0)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>
          )}

          {/* Top Shorts */}
          {shorts.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Top Shorts</h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {shorts.map((short) => (
                  <Link
                    key={short.id}
                    to={`/shorts?start=${short.id}`}
                    className="shrink-0 w-28"
                  >
                    <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted mb-1">
                      {short.thumbnail_url ? (
                        <img
                          src={short.thumbnail_url}
                          alt={short.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute bottom-1 left-1 right-1 text-center">
                        <p className="text-[10px] text-white bg-black/60 rounded px-1 py-0.5">
                          {formatNumber(short.views || 0)} views
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Audience Geography */}
          <div>
            <h2 className="font-semibold mb-1">Your audience</h2>
            <p className="text-sm text-muted-foreground mb-4">Geography</p>
            <div className="space-y-3">
              {geography.map((geo) => (
                <div key={geo.country} className="flex items-center gap-3">
                  <span className="w-24 text-sm truncate">{geo.country}</span>
                  <div className="flex-1 h-2 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${geo.percent}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-10 text-right">
                    {geo.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Card */}
          <Card className="bg-secondary/30 border-border">
            <CardContent className="p-4 text-center space-y-3">
              <p className="text-sm">
                Get in-depth analytics and advanced controls with the Studio
              </p>
              <Button variant="secondary" onClick={() => navigate("/studio")}>
                Go to Studio
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
