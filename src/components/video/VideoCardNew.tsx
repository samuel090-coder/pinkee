import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Clock, Eye, MoreVertical, ListPlus, Share2, Flag, Download } from 'lucide-react';
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

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    video_url: string | null;
    duration: number;
    views: number;
    created_at: string;
    uploader?: {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
      is_verified: boolean;
    };
  };
  variant?: 'default' | 'horizontal' | 'compact';
}

export const VideoCardNew = ({ video, variant = 'default' }: VideoCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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

  const thumbnailUrl = video.thumbnail_url || video.video_url;

  if (variant === 'horizontal') {
    return (
      <motion.article
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex gap-4 group"
      >
        {/* Thumbnail */}
        <Link to={`/watch/${video.id}`} className="relative flex-shrink-0 w-40 md:w-64 aspect-video rounded-xl overflow-hidden">
          <div className={cn('absolute inset-0 bg-muted', !imageLoaded && 'shimmer')}>
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt={video.title}
                className={cn(
                  'w-full h-full object-cover transition-all duration-300',
                  imageLoaded ? 'opacity-100' : 'opacity-0',
                  'group-hover:scale-105'
                )}
                onLoad={() => setImageLoaded(true)}
              />
            )}
          </div>
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-background/90 rounded text-xs font-medium text-foreground">
            {formatDuration(video.duration || 0)}
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link to={`/watch/${video.id}`}>
            <h3 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {video.title}
            </h3>
          </Link>
          <div className="mt-1 text-sm text-muted-foreground">
            {video.uploader && (
              <Link to={`/channel/${video.uploader.id}`} className="hover:text-foreground">
                {video.uploader.display_name}
              </Link>
            )}
            <span className="mx-1">•</span>
            <span>{formatViews(video.views || 0)}</span>
            <span className="mx-1">•</span>
            <span>{formatTimeAgo(video.created_at)}</span>
          </div>
        </div>

        {/* Menu */}
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
      {/* Thumbnail */}
      <Link to={`/watch/${video.id}`} className="block relative aspect-video rounded-xl overflow-hidden">
        <div className={cn('absolute inset-0 bg-muted', !imageLoaded && 'shimmer')}>
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt={video.title}
              className={cn(
                'w-full h-full object-cover transition-all duration-500',
                imageLoaded ? 'opacity-100' : 'opacity-0',
                isHovered && 'scale-105'
              )}
              onLoad={() => setImageLoaded(true)}
            />
          )}
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-background/90 rounded text-xs font-medium text-foreground">
          {formatDuration(video.duration || 0)}
        </div>

        {/* Hover Overlay */}
        <motion.div
          initial={false}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: isHovered ? 1 : 0.8 }}
            className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center pink-glow"
          >
            <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
          </motion.div>
        </motion.div>

        {/* Progress Bar (for watch history) */}
        {/* <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
          <div className="h-full bg-primary w-1/3" />
        </div> */}
      </Link>

      {/* Info */}
      <div className="flex gap-3 mt-3">
        {video.uploader && (
          <Link to={`/channel/${video.uploader.id}`} className="flex-shrink-0">
            <Avatar className="w-9 h-9">
              <AvatarImage src={video.uploader.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {video.uploader.display_name?.charAt(0) || 'U'}
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
          {video.uploader && (
            <Link 
              to={`/channel/${video.uploader.id}`} 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {video.uploader.display_name}
              {video.uploader.is_verified && (
                <span className="ml-1 text-primary">✓</span>
              )}
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
