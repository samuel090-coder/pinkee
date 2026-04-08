import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Play } from 'lucide-react';
import { poster, getTitle, getYear, getMediaType, type MediaItem } from '@/lib/tmdb';
import { Skeleton } from '@/components/ui/skeleton';

interface MovieCardProps {
  item: MediaItem;
  index?: number;
}

export function MovieCard({ item, index = 0 }: MovieCardProps) {
  const [loaded, setLoaded] = useState(false);
  const type = getMediaType(item);
  const title = getTitle(item);
  const year = getYear(item);
  const rating = item.vote_average?.toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link to={`/${type}/${item.id}`} className="group block">
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
          {!loaded && (
            <Skeleton className="absolute inset-0 rounded-lg" />
          )}
          <img
            src={poster(item.poster_path)}
            alt={title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Play className="w-4 h-4 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="text-white text-sm font-medium">Details</span>
            </div>
          </div>
          {/* Rating badge */}
          {item.vote_average > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-white text-xs font-semibold">{rating}</span>
            </div>
          )}
        </div>
        <div className="mt-2 space-y-0.5">
          <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">{year}</p>
        </div>
      </Link>
    </motion.div>
  );
}

export function MovieCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[2/3] rounded-lg" />
      <Skeleton className="h-4 w-3/4 mt-2" />
      <Skeleton className="h-3 w-1/3 mt-1" />
    </div>
  );
}
