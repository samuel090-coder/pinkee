import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Eye, Flame, Sparkles } from "lucide-react";
import { Video } from "@/contexts/VideoContext";

type Props = {
  video: Video;
  index: number;
};

function shortViews(views: number | null): string {
  if (!views) return "0";
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return `${views}`;
}

export function DashboardShortCard({ video, index }: Props) {
  const navigate = useNavigate();
  const thumbnailUrl = video.thumbnail_url || video.video_url;
  const isVideoThumb = !!thumbnailUrl && (thumbnailUrl.includes(".mp4") || thumbnailUrl.includes(".webm"));
  const isTrending = (video.views ?? 0) > 1000;
  const channelName = video.poster?.name || video.uploader_profile?.display_name || "Creator";

  const handleClick = () => {
    navigate(`/shorts?start=${video.id}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left group"
      aria-label={`Watch short: ${video.title}`}
    >
      <motion.article
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-muted ring-1 ring-border/50 shadow-card transition-all duration-500 group-hover:ring-primary/50 group-hover:shadow-glow group-hover:-translate-y-1"
      >
        {thumbnailUrl ? (
          isVideoThumb ? (
            <video
              src={thumbnailUrl}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              muted
              loop
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={thumbnailUrl}
              alt={video.thumbnail_alt || video.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary via-muted to-card">
            <Sparkles className="w-7 h-7 text-primary/60 animate-pulse" />
          </div>
        )}

        {/* dual gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

        {/* top-left trending */}
        {isTrending && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/95 text-primary-foreground text-[10px] font-bold uppercase tracking-wide shadow-md">
            <Flame className="w-3 h-3" />
            Trending
          </div>
        )}

        {/* top-right views */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full glass border border-white/20 text-[10px] font-medium text-white">
          <Eye className="w-3 h-3" />
          {shortViews(video.views)}
        </div>

        {/* center play hint on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 rounded-full glass border border-primary/50 flex items-center justify-center pink-glow">
            <Play className="w-6 h-6 text-primary fill-primary translate-x-0.5" />
          </div>
        </div>

        {/* bottom title + creator */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-0.5">
          <p className="text-[13px] font-semibold text-white line-clamp-2 drop-shadow leading-tight">
            {video.title}
          </p>
          <p className="text-[10px] text-white/70 line-clamp-1 font-medium">@{channelName}</p>
        </div>
      </motion.article>
    </button>
  );
}
