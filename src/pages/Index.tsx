import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardShortsGrid } from '@/components/dashboard/DashboardShortsGrid';
import { LongVideoCard } from '@/components/dashboard/LongVideoCard';
import { CategoryChips } from '@/components/dashboard/CategoryChips';
import { useVideo } from '@/contexts/VideoContext';
import { useAuth } from '@/contexts/AuthContext';
import { useContentAlgorithm } from '@/hooks/useContentAlgorithm';
import { Button } from '@/components/ui/button';

const VIDEOS_PER_PAGE = 8;

const Index = () => {
  const { videos, loading, analytics } = useVideo();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [displayCount, setDisplayCount] = useState(VIDEOS_PER_PAGE);

  // AI-powered content algorithm for smart feed ordering
  const { longs: allLongs, shorts } = useContentAlgorithm(videos, selectedCategory);

  const longs = allLongs.slice(0, displayCount);
  const hasMore = allLongs.length > displayCount;

  const loadMore = useCallback(() => {
    setDisplayCount((prev) => prev + VIDEOS_PER_PAGE);
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Hero Section - Only show when not logged in */}
      {!user && (
        <section className="py-16 relative overflow-hidden">
          {/* Background Effects */}
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
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-border mb-6"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-secondary-foreground">
                  Premium content available
                </span>
              </motion.div>

              <h1 className="font-display font-bold text-4xl md:text-6xl lg:text-7xl mb-6">
                <span className="text-foreground">Discover </span>
                <span className="text-gradient-pink neon-text">Amazing</span>
                <br />
                <span className="text-foreground">Videos</span>
              </h1>

              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Stream high-quality content instantly. Sign up to like, comment, and subscribe.
                Go premium for exclusive content.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap items-center justify-center gap-4"
              >
                <Link to="/auth">
                  <Button className="px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold pink-glow hover:scale-105 transition-transform">
                    <Play className="w-5 h-5 mr-2" fill="currentColor" />
                    Get Started
                  </Button>
                </Link>
                <Link to="/subscribe">
                  <Button variant="outline" className="px-8 py-4 rounded-full">
                    Go Premium
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16"
            >
              {[
                { value: `${analytics.videosCount}+`, label: 'Videos' },
                { value: analytics.totalViews >= 1000 ? `${(analytics.totalViews / 1000).toFixed(1)}K+` : `${analytics.totalViews}+`, label: 'Views' },
                { value: '4.9', label: 'Rating' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="font-display font-bold text-3xl md:text-4xl text-gradient-pink">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Category Chips */}
      <section className="container mx-auto px-3">
        <CategoryChips selected={selectedCategory} onSelect={setSelectedCategory} />
      </section>

      {/* Videos Feed Section */}
      <section className="py-4 pb-20">
        <div className="container mx-auto px-3">
          {videos.length > 0 ? (
            <div className="space-y-6">
              {/* Long Videos - First batch */}
              {longs.length > 0 && (
                <div className="space-y-6">
                  {longs.slice(0, 2).map((video, i) => (
                    <LongVideoCard key={video.id} video={video} index={i} />
                  ))}
                </div>
              )}

              {/* Shorts Section - 2 column grid */}
              {shorts.length > 0 && (
                <DashboardShortsGrid videos={shorts} maxItems={4} />
              )}

              {/* More Long Videos */}
              {longs.length > 2 && (
                <div className="space-y-6">
                  {longs.slice(2).map((video, i) => (
                    <LongVideoCard key={video.id} video={video} index={i + 2} />
                  ))}
                </div>
              )}

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    className="px-8"
                  >
                    Load More
                  </Button>
                </div>
              )}

              {longs.length === 0 && shorts.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    {selectedCategory === 'All' 
                      ? 'No videos yet. Check back soon!' 
                      : `No ${selectedCategory} videos yet.`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No videos yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
