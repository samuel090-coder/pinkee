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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <Link to={`/watch/${video.id}`} className="block">
        {/* Cinematic 16:9 Thumbnail */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted mb-3 ring-1 ring-border/40 shadow-card group-hover:shadow-glow transition-all duration-500">
          {thumbnailUrl ? (
            isVideoThumb ? (
              <video
                src={thumbnailUrl}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={thumbnailUrl}
                alt={video.thumbnail_alt || video.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                loading="lazy"
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-card">
              <span className="text-muted-foreground text-sm">No thumbnail</span>
            </div>
          )}

          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-500" />

          {/* Top-left views pill */}
          {typeof video.views === "number" && video.views > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full glass border border-border/40 text-[10px] font-medium text-foreground/90">
              <Eye className="w-3 h-3" />
              {formatViews(video.views).replace(" views", "")}
            </div>
          )}

          {/* Play hint */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
            <div className="w-14 h-14 rounded-full glass border border-primary/40 flex items-center justify-center pink-glow">
              <Play className="w-6 h-6 text-primary-foreground fill-primary-foreground translate-x-0.5" />
            </div>
          </div>

          {/* Duration badge */}
          {video.duration && video.duration > 0 && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-md text-foreground text-[11px] font-semibold tabular-nums ring-1 ring-border/40">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>

        {/* Info Row */}
        <div className="flex gap-3 px-0.5">
          <Link
            to={video.poster_id ? `/poster/${video.poster_id}` : "#"}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            <div className="relative">
              <Avatar className="w-10 h-10 ring-2 ring-primary/40 ring-offset-2 ring-offset-background">
                <AvatarImage src={channelAvatar || undefined} alt={channelName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold">
                  {channelName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-foreground text-[15px] line-clamp-2 leading-snug mb-1 group-hover:text-gradient-pink transition-colors">
              {video.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1 font-medium">
              {channelName}
            </p>
            <p className="text-xs text-muted-foreground/80">
              {formatViews(video.views)} • {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
            </p>
          </div>

          <button
            className="shrink-0 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-secondary/60 transition-all"
            onClick={(e) => e.preventDefault()}
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </Link>
    </motion.article>
  );
}
