import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Clock, MoreVertical, ListPlus, Share2, Flag, Download, Volume2, VolumeX, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Video } from '@/contexts/VideoContext';

interface VideoCardProps {
  video: Video;
  variant?: 'default' | 'horizontal' | 'compact' | 'list' | 'search';
  autoPlay?: boolean;
  onVideoRef?: (ref: HTMLVideoElement | null) => void;
}

export const VideoCardNew = ({ video, variant = 'default', autoPlay = false, onVideoRef }: VideoCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play on hover for desktop
  useEffect(() => {
    if (isHovered && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (!isHovered && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered]);

  // Register video ref for intersection observer
  useEffect(() => {
    if (autoPlay && onVideoRef) {
      onVideoRef(videoRef.current);
    }
    return () => {
      if (onVideoRef) onVideoRef(null);
    };
  }, [autoPlay, onVideoRef]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
    return `${Math.floor(diff / 31536000)} years ago`;
  };

  // Use video_url as thumbnail if no thumbnail exists
  const thumbnailUrl = video.thumbnail_url || video.video_url;
  const hasVideoUrl = !!video.video_url;

  const uploader = video.uploader_profile;
  const channelName =
    uploader?.channel_name ||
    uploader?.display_name ||
    uploader?.username ||
    video.poster?.name ||
    'Unknown Channel';

  const channelHref = uploader?.id
    ? `/channel/${uploader.id}`
    : video.poster?.id
      ? `/poster/${video.poster.id}`
      : '#';

  const avatarUrl = uploader?.avatar_url || video.poster?.avatar_url;

  // Horizontal/List/Search variants
  if (variant === 'horizontal' || variant === 'list' || variant === 'search') {
    return (
      <motion.article
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex gap-4 group"
      >
        <Link to={`/watch/${video.id}`} className={cn(
          "relative flex-shrink-0 aspect-video rounded-xl overflow-hidden",
          variant === 'search' ? 'w-64 md:w-80' : 'w-40 md:w-64'
        )}>
          <div className={cn('absolute inset-0 bg-muted', !imageLoaded && 'shimmer')}>
            {thumbnailUrl && (
              thumbnailUrl.includes('.mp4') || thumbnailUrl.includes('.webm') ? (
                <video
                  src={thumbnailUrl}
                  className={cn(
                    'w-full h-full object-cover transition-all duration-300',
                    imageLoaded ? 'opacity-100' : 'opacity-0',
                    'group-hover:scale-105'
                  )}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onLoadedData={() => setImageLoaded(true)}
                />
              ) : (
                <img
                  src={thumbnailUrl}
                  alt={video.title}
                  className={cn(
                    'w-full h-full object-cover transition-all duration-300',
                    imageLoaded ? 'opacity-100' : 'opacity-0',
                    'group-hover:scale-105'
                  )}
                  onLoad={() => setImageLoaded(true)}
                  loading="lazy"
                />
              )
            )}
          </div>
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-background/90 rounded text-xs font-medium text-foreground">
            {formatDuration(video.duration || 0)}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <Link to={`/watch/${video.id}`}>
            <h3 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {video.title}
            </h3>
          </Link>
          <div className="mt-1 text-sm text-muted-foreground">
            {channelHref !== '#' ? (
              <Link to={channelHref} className="hover:text-foreground">
                {channelName}
              </Link>
            ) : (
              <span>{channelName}</span>
            )}
            <span className="mx-1">•</span>
            <span>{formatViews(video.views || 0)}</span>
            <span className="mx-1">•</span>
            <span>{formatTimeAgo(video.created_at)}</span>
          </div>
          {variant === 'search' && video.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {video.description}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem><ListPlus className="w-4 h-4 mr-2" /> Save to playlist</DropdownMenuItem>
            <DropdownMenuItem><Clock className="w-4 h-4 mr-2" /> Save to Watch Later</DropdownMenuItem>
            <DropdownMenuItem><Share2 className="w-4 h-4 mr-2" /> Share</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem><Flag className="w-4 h-4 mr-2" /> Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group"
    >
      {/* Thumbnail with video preview on hover */}
      <Link to={`/watch/${video.id}`} className="block relative aspect-video rounded-xl overflow-hidden">
        <div className={cn('absolute inset-0 bg-muted', !imageLoaded && 'shimmer')}>
          {/* Show video preview on hover if video exists */}
          {hasVideoUrl && isHovered ? (
            <video
              ref={videoRef}
              src={video.video_url!}
              className="w-full h-full object-cover"
              muted={muted}
              loop
              playsInline
              preload="metadata"
            />
          ) : thumbnailUrl ? (
            thumbnailUrl.includes('.mp4') || thumbnailUrl.includes('.webm') ? (
              <video
                src={thumbnailUrl}
                className={cn(
                  'w-full h-full object-cover transition-all duration-500',
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                muted
                playsInline
                preload="metadata"
                onLoadedData={() => setImageLoaded(true)}
              />
            ) : (
              <img
                src={thumbnailUrl}
                alt={video.title}
                className={cn(
                  'w-full h-full object-cover transition-all duration-500',
                  imageLoaded ? 'opacity-100' : 'opacity-0',
                  isHovered && 'scale-105'
                )}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Play className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-background/90 rounded text-xs font-medium text-foreground">
          {formatDuration(video.duration || 0)}
        </div>

        {/* Premium Badge */}
        {video.is_premium && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded flex items-center gap-1">
            <Crown className="w-3 h-3" />
            ${video.premium_price?.toFixed(2) || '0.00'}
          </div>
        )}

        {/* Mute toggle on hover */}
        {isHovered && hasVideoUrl && (
          <button
            onClick={(e) => {
              e.preventDefault();
              setMuted(!muted);
            }}
            className="absolute bottom-2 left-2 p-1.5 bg-background/90 rounded-full"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}

        {/* Hover Overlay */}
        {!isHovered && (
          <motion.div
            initial={false}
            animate={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              whileHover={{ scale: 1 }}
              className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center pink-glow"
            >
              <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
            </motion.div>
          </motion.div>
        )}
      </Link>

      {/* Info */}
      <div className="flex gap-3 mt-3">
        {channelHref !== '#' && (
          <Link to={channelHref} className="flex-shrink-0">
            <Avatar className="w-9 h-9">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {channelName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <Link to={`/watch/${video.id}`}>
            <h3 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {video.title}
            </h3>
          </Link>
          {channelHref !== '#' && (
            <Link 
              to={channelHref}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {channelName}
            </Link>
          )}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>{formatViews(video.views || 0)}</span>
            <span>•</span>
            <span>{formatTimeAgo(video.created_at)}</span>
          </div>
        </div>

        {/* Menu Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem><ListPlus className="w-4 h-4 mr-2" /> Save to playlist</DropdownMenuItem>
            <DropdownMenuItem><Clock className="w-4 h-4 mr-2" /> Save to Watch Later</DropdownMenuItem>
            <DropdownMenuItem><Download className="w-4 h-4 mr-2" /> Download</DropdownMenuItem>
            <DropdownMenuItem><Share2 className="w-4 h-4 mr-2" /> Share</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem><Flag className="w-4 h-4 mr-2" /> Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.article>
  );
};
