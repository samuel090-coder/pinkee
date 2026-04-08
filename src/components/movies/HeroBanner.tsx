import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { backdrop, getTitle, getYear, getMediaType } from '@/lib/tmdb';
import { Skeleton } from '@/components/ui/skeleton';
import type { MediaItem } from '@/lib/tmdb';

interface HeroBannerProps {
  items: MediaItem[];
  loading?: boolean;
}

export function HeroBanner({ items, loading }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const featured = items.slice(0, 5);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((p) => (p + 1) % featured.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (loading || !featured.length) {
    return (
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-muted">
        <Skeleton className="absolute inset-0" />
      </div>
    );
  }

  const item = featured[current];
  const type = getMediaType(item);
  const title = getTitle(item);
  const year = getYear(item);

  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img
            src={backdrop(item.backdrop_path)}
            alt={title}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl space-y-2 sm:space-y-3"
          >
            <h1 className="text-xl sm:text-3xl md:text-5xl font-bold text-white line-clamp-2">
              {title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-white/80">
              {item.vote_average > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  {item.vote_average.toFixed(1)}
                </span>
              )}
              {year && <span>{year}</span>}
              <span className="uppercase text-xs px-2 py-0.5 bg-white/20 rounded">{type === 'tv' ? 'TV' : 'Movie'}</span>
            </div>
            <p className="text-sm text-white/70 line-clamp-2 max-w-lg hidden sm:block">
              {item.overview}
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Link to={`/${type}/${item.id}`}>
                <Button className="bg-primary text-primary-foreground rounded-full px-5 gap-2">
                  <Play className="w-4 h-4" fill="currentColor" />
                  Watch Now
                </Button>
              </Link>
              <Link to={`/${type}/${item.id}`}>
                <Button variant="outline" className="rounded-full px-5 gap-2 border-white/30 text-white hover:bg-white/10">
                  <Info className="w-4 h-4" />
                  More Info
                </Button>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        {featured.length > 1 && (
          <div className="flex gap-1.5 mt-4">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1 rounded-full transition-all ${
                  i === current ? 'w-6 bg-primary' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
