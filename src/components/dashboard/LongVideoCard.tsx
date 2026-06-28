import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MoreVertical, Play, Eye } from "lucide-react";
import { Video } from "@/contexts/VideoContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

type Props = {
  video: Video;
  index: number;
};

function formatViews(views: number | null): string {
  if (!views) return "0 views";
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
  return `${views} views`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}:${remainMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function LongVideoCard({ video, index }: Props) {
  const thumbnailUrl = video.thumbnail_url || video.video_url;
  const isVideoThumb = !!thumbnailUrl && (thumbnailUrl.includes(".mp4") || thumbnailUrl.includes(".webm"));
  const channelName = video.poster?.name || "Unknown Channel";
  const channelAvatar = video.poster?.avatar_url;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <Link to={`/watch/${video.id}`} className="block">
        {/* Full-width 16:9 Thumbnail */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-3">
          {thumbnailUrl ? (
            isVideoThumb ? (
              <video
                src={thumbnailUrl}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={thumbnailUrl}
                alt={video.thumbnail_alt || video.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <span className="text-muted-foreground text-sm">No thumbnail</span>
            </div>
          )}

          {/* Duration badge */}
          {video.duration && video.duration > 0 && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>

        {/* Video Info Row - YouTube style */}
        <div className="flex gap-3">
          {/* Channel Avatar */}
          <Link 
            to={video.poster_id ? `/poster/${video.poster_id}` : "#"} 
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            <Avatar className="w-9 h-9">
              <AvatarImage src={channelAvatar || undefined} alt={channelName} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {channelName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Title and Meta */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground text-sm line-clamp-2 leading-tight mb-1">
              {video.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {channelName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatViews(video.views)} • {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* More Options */}
          <button 
            className="shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.preventDefault()}
          >
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </Link>
    </motion.article>
  );
}
