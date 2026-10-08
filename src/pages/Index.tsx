import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardShortCard } from '@/components/dashboard/DashboardShortCard';
import { LongVideoCard } from '@/components/dashboard/LongVideoCard';
import { CategoryChips } from '@/components/dashboard/CategoryChips';
import { FeedSkeleton, LongVideoCardSkeleton, ShortCardSkeleton } from '@/components/dashboard/VideoCardSkeleton';
import { useVideo } from '@/contexts/VideoContext';
import { useAuth } from '@/contexts/AuthContext';
import { useContentAlgorithm } from '@/hooks/useContentAlgorithm';
import { Button } from '@/components/ui/button';
import { DailyCheckinWidget } from '@/components/rewards/DailyCheckinWidget';
import { WeeklyDigestCard } from '@/components/digest/WeeklyDigestCard';
import { Users } from 'lucide-react';

const VIDEOS_PER_PAGE = 9;

const Index = () => {
  const { videos, loading, analytics } = useVideo();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [displayCount, setDisplayCount] = useState(VIDEOS_PER_PAGE);

  const { longs: allLongs, shorts } = useContentAlgorithm(videos, selectedCategory);

  const longs = allLongs.slice(0, displayCount);
  const hasMore = allLongs.length > displayCount;
  const [feature, ...restLongs] = longs;
  const topShorts = shorts.slice(0, 6);

  const loadMore = useCallback(() => {
    setDisplayCount((prev) => prev + VIDEOS_PER_PAGE);
  }, []);

  return (
    <MainLayout>
      <div className="pinkee-feed-page min-h-screen">
      {/* Hero – guests only */}
      {!user && (
        <section className="relative overflow-hidden border-b border-border/70 py-5 md:py-7">
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
                  <Sparkles className="h-4 w-4" />
                  Premium creator-led streaming
                </div>
                <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                  Stream what <span className="text-gradient-pink">creators make next.</span>
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Join free to like, comment, follow creators, save playlists, and unlock rewards.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Link to="/auth">
                  <Button className="rounded-full font-semibold pink-glow">
                    <Play className="mr-2 h-4 w-4" fill="currentColor" />
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/subscribe">
                  <Button variant="outline" className="rounded-full border-primary/30">
                    Explore Premium
                  </Button>
                </Link>
              </div>
              <div className="flex gap-5 border-t border-border/60 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                {[
                  { value: `${analytics.videosCount}+`, label: 'Videos' },
                  {
                    value: analytics.totalViews >= 1000
                      ? `${(analytics.totalViews / 1000).toFixed(1)}K+`
                      : `${analytics.totalViews}+`,
                    label: 'Views',
                  },
                  { value: '4.9', label: 'Rating' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="font-display text-lg font-bold text-foreground">{stat.value}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Retention widgets — logged in only */}
      {user && (
        <section className="container mx-auto px-3 pt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DailyCheckinWidget />
            <Link to="/watch-parties" className="block">
              <div className="h-full rounded-lg border p-4 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border-blue-500/20 flex items-center gap-3 hover:ring-2 hover:ring-primary transition">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-lg leading-tight">Watch Parties</p>
                  <p className="text-xs text-muted-foreground">Watch together, chat live, react with emojis →</p>
                </div>
              </div>
            </Link>
          </div>
          <WeeklyDigestCard />
        </section>
      )}

      {/* Categories */}
      <section className="container mx-auto sticky top-[calc(4rem+var(--safe-area-top))] z-30 px-3">
        <CategoryChips selected={selectedCategory} onSelect={setSelectedCategory} />
      </section>

      {/* Feed */}
      <section className="py-3 pb-24">
        <div className="container mx-auto px-3">
          {loading ? (
            <FeedSkeleton />
          ) : videos.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass border border-primary/30 mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <p className="text-muted-foreground">No videos yet. Check back soon!</p>
            </div>
          ) : longs.length === 0 && shorts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                No {selectedCategory === 'All' ? '' : selectedCategory + ' '}videos yet.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Bento featured row: 1 feature card + 2-up shorts column */}
              {feature && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <LongVideoCard video={feature} index={0} variant="feature" />
                  </div>
                  {topShorts.length > 0 && (
                    <div className="hidden lg:grid grid-cols-2 gap-3 content-start">
                      {topShorts.slice(0, 2).map((v, i) => (
                        <DashboardShortCard key={v.id} video={v} index={i} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Shorts strip — mobile + tablet */}
              {topShorts.length > 0 && (
                <div className="lg:hidden">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h2 className="font-display font-semibold text-base">Shorts for you</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {topShorts.slice(0, 4).map((v, i) => (
                      <DashboardShortCard key={v.id} video={v} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Long videos grid */}
              {restLongs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                  {restLongs.map((video, i) => (
                    <LongVideoCard key={video.id} video={video} index={i + 1} />
                  ))}
                </div>
              )}

              {/* Desktop extra shorts row */}
              {topShorts.length > 2 && (
                <div className="hidden lg:block">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h2 className="font-display font-semibold text-base">More Shorts</h2>
                  </div>
                  <div className="grid grid-cols-4 xl:grid-cols-6 gap-3">
                    {topShorts.slice(2).map((v, i) => (
                      <DashboardShortCard key={v.id} video={v} index={i} />
                    ))}
                    {Array.from({ length: Math.max(0, 4 - topShorts.slice(2).length) }).map((_, i) => (
                      <ShortCardSkeleton key={`pad-${i}`} />
                    ))}
                  </div>
                </div>
              )}

              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    className="px-8 rounded-full border-primary/30 hover:border-primary"
                  >
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      </div>
    </MainLayout>
  );
};

export default Index;
