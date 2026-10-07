import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MoreVertical, Play, Eye, BadgeCheck, Crown, Sparkles } from "lucide-react";
import { Video } from "@/contexts/VideoContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type Props = {
  video: Video;
  index: number;
  /** "feature" makes the card large/cinematic for bento hero slots */
  variant?: "default" | "feature";
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

export function LongVideoCard({ video, index, variant = "default" }: Props) {
  const thumbnailUrl = video.thumbnail_url || video.video_url;
  const isVideoThumb = !!thumbnailUrl && (thumbnailUrl.includes(".mp4") || thumbnailUrl.includes(".webm"));
  const channelName = video.poster?.name || video.uploader_profile?.display_name || "Unknown Channel";
  const channelAvatar = video.poster?.avatar_url || video.uploader_profile?.avatar_url;
  const isVerified = video.uploader_profile?.is_verified ?? false;
  const isFeature = variant === "feature";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <Link to={`/watch/${video.id}`} className="block">
        {/* Cinematic thumbnail */}
        <div
          className={cn(
            "relative aspect-video overflow-hidden border border-border/80 bg-muted shadow-card transition-all duration-500",
            isFeature ? "rounded-[1.5rem] group-hover:shadow-glow" : "rounded-[1.1rem] group-hover:shadow-glow group-hover:border-primary/50",
          )}
        >
          {thumbnailUrl ? (
            isVideoThumb ? (
              <video
                src={thumbnailUrl}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.06]"
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={thumbnailUrl}
                alt={video.thumbnail_alt || video.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.06]"
                loading="lazy"
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary via-muted to-card">
              <Sparkles className="w-8 h-8 text-primary/60 animate-pulse" />
            </div>
          )}

          {/* cinematic gradient — heavier on feature cards */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-t from-background/95 via-background/10 to-transparent transition-opacity duration-500",
              isFeature ? "opacity-90 group-hover:opacity-100" : "opacity-55 group-hover:opacity-80",
            )}
          />

          {/* top-left badges */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {video.is_premium && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-300 text-amber-950 text-[10px] font-bold shadow-md">
                <Crown className="w-3 h-3" />
                PREMIUM
              </div>
            )}
            {!video.is_premium && video.category && (
              <div className="px-2 py-0.5 rounded-full glass border border-primary/30 text-[10px] font-semibold text-primary uppercase tracking-wide">
                {video.category}
              </div>
            )}
          </div>

          {/* top-right views */}
          {typeof video.views === "number" && video.views > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full glass border border-border/40 text-[10px] font-medium text-foreground/90">
              <Eye className="w-3 h-3" />
              {formatViews(video.views).replace(" views", "")}
            </div>
          )}

          {/* center play */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100">
            <div className={cn(
              "rounded-full glass border border-primary/50 flex items-center justify-center pink-glow",
              isFeature ? "w-20 h-20" : "w-16 h-16",
            )}>
              <Play className={cn("text-primary fill-primary translate-x-0.5", isFeature ? "w-8 h-8" : "w-6 h-6")} />
            </div>
          </div>

          {/* duration */}
          {video.duration && video.duration > 0 && (
            <div className="absolute bottom-2 right-2 rounded-md bg-background/85 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground shadow-sm backdrop-blur-md">
              {formatDuration(video.duration)}
            </div>
          )}

          {/* feature-only title overlay */}
          {isFeature && (
            <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                <div className="mb-2 flex items-center gap-1.5">
                <span className="rounded-full border border-primary/40 bg-background/70 px-2 py-0.5 text-[10px] font-bold uppercase text-primary backdrop-blur-md">
                  Featured
                </span>
              </div>
              <h2 className="font-display text-xl font-bold leading-tight text-foreground line-clamp-2 drop-shadow-lg md:text-2xl">
                {video.title}
              </h2>
            </div>
          )}
        </div>

      </Link>

      {/* info row (hidden on feature variant since overlay handles it) */}
      {!isFeature && (
          <div className="flex gap-3 px-0.5 pt-1">
            <Link
              to={video.poster_id ? `/poster/${video.poster_id}` : "#"}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            >
              <div className="relative">
                <Avatar className="w-10 h-10 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                  <AvatarImage src={channelAvatar || undefined} alt={channelName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold">
                    {channelName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isVerified && (
                  <BadgeCheck className="absolute -bottom-0.5 -right-0.5 w-4 h-4 text-primary fill-background" />
                )}
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-foreground text-[15px] line-clamp-2 leading-snug mb-1 group-hover:text-primary transition-colors">
                {video.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-1 font-medium flex items-center gap-1">
                {channelName}
                {isVerified && <BadgeCheck className="w-3 h-3 text-primary fill-background shrink-0" />}
              </p>
              <p className="text-xs text-muted-foreground/70">
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
      )}
    </motion.article>
  );
}
