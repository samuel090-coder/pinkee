import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Lock, Eye, Heart, Video as VideoIcon, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Video, useVideo } from '@/contexts/VideoContext';
import { cn } from '@/lib/utils';

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
  index: number;
}

export function VideoCard({ video, onPlay, index }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { getPosterProfile } = useVideo();
  
  const poster = video.poster_id ? getPosterProfile(video.poster_id) : null;

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={`Video: ${video.title}`}
    >
      <div className="shiny-card rounded-lg overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:pink-glow-intense">
        {/* Thumbnail Container */}
        <button
          onClick={() => onPlay(video)}
          className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          aria-label={video.is_subscription_only ? `${video.title} - Premium content, requires subscription` : `Play ${video.title}`}
        >
          <div className="relative aspect-square overflow-hidden bg-muted">
            {/* Shimmer loading state */}
            {!imageLoaded && video.thumbnail_url && (
              <div className="absolute inset-0 shimmer" />
            )}
            
            {/* Thumbnail Image or Placeholder */}
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.thumbnail_alt || video.title}
                className={cn(
                  "w-full h-full object-cover transition-all duration-700",
                  isHovered && "scale-110 brightness-75",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <VideoIcon className="w-12 h-12 text-muted-foreground" />
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Premium Badge */}
            {video.is_subscription_only && (
              <div className="absolute top-3 right-3 z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 backdrop-blur-sm"
                >
                  <Lock className="w-3 h-3 text-primary-foreground" />
                  <span className="text-xs font-medium text-primary-foreground">Premium</span>
                </motion.div>
              </div>
            )}

            {/* Duration Badge */}
            {video.duration > 0 && (
              <div className="absolute bottom-3 right-3 z-10">
                <span className="px-2 py-1 text-xs font-medium rounded bg-background/80 backdrop-blur-sm text-foreground">
                  {formatDuration(video.duration)}
                </span>
              </div>
            )}

            {/* Play Button Overlay */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ 
                opacity: isHovered ? 1 : 0, 
                scale: isHovered ? 1 : 0.5 
              }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center pink-glow animate-glow-pulse">
                {video.is_subscription_only ? (
                  <Lock className="w-7 h-7 text-primary-foreground" />
                ) : (
                  <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                )}
              </div>
            </motion.div>

            {/* Shiny Frame Border */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/50 rounded-lg transition-colors duration-300" />
              <motion.div
                className="absolute inset-0 border-2 border-transparent rounded-lg"
                style={{
                  background: isHovered 
                    ? 'linear-gradient(90deg, transparent, hsl(330 100% 60% / 0.5), transparent)'
                    : 'transparent',
                  backgroundSize: '200% 100%',
                }}
                animate={{
                  backgroundPosition: isHovered ? ['200% 0', '-200% 0'] : '0 0',
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          </div>
        </button>

        {/* Card Content */}
        <div className="p-4 space-y-3">
          {/* Poster Info */}
          {poster && (
            <Link 
              to={`/poster/${poster.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 group/poster"
            >
              {poster.avatar_url ? (
                <img 
                  src={poster.avatar_url} 
                  alt={poster.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent group-hover/poster:ring-primary transition-all"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover/poster:ring-2 group-hover/poster:ring-primary transition-all">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm text-muted-foreground group-hover/poster:text-primary transition-colors">
                {poster.name}
              </span>
            </Link>
          )}

          <button
            onClick={() => onPlay(video)}
            className="w-full text-left focus:outline-none"
          >
            <h3 className="font-display font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {video.title}
            </h3>
          </button>
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" aria-hidden="true" />
              <span aria-label={`${video.views} views`}>{formatViews(video.views)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-primary" aria-hidden="true" />
              <span aria-label={`${video.reactions} reactions`}>{formatViews(video.reactions)}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
