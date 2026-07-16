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
      {/* Hero – guests only */}
      {!user && (
        <section className="py-12 md:py-16 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px]" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Premium creator-led streaming</span>
              </div>

              <h1 className="font-display font-bold text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight">
                <span className="text-foreground">Stream what </span>
                <span className="text-gradient-pink neon-text">creators</span>
                <br />
                <span className="text-foreground">make next.</span>
              </h1>

              <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Join free to like, comment, follow creators, save playlists, and unlock rewards.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link to="/auth">
                  <Button className="px-8 py-6 rounded-full bg-primary text-primary-foreground font-semibold pink-glow hover:scale-105 transition-transform">
                    <Play className="w-5 h-5 mr-2" fill="currentColor" />
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/subscribe">
                  <Button variant="outline" className="px-8 py-6 rounded-full border-primary/30">
                    Explore Premium
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-12">
                {[
                  { value: `${analytics.videosCount}+`, label: 'Videos' },
                  { value: analytics.totalViews >= 1000 ? `${(analytics.totalViews / 1000).toFixed(1)}K+` : `${analytics.totalViews}+`, label: 'Views' },
                  { value: '4.9', label: 'Rating' },
                ].map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="font-display font-bold text-3xl md:text-4xl text-gradient-pink">
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</div>
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
      <section className="container mx-auto px-3">
        <CategoryChips selected={selectedCategory} onSelect={setSelectedCategory} />
      </section>

      {/* Feed */}
      <section className="py-4 pb-24">
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
    </MainLayout>
  );
};

export default Index;
