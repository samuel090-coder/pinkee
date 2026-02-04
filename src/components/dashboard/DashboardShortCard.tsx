import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { Video } from "@/contexts/VideoContext";
import { cn } from "@/lib/utils";

type Props = {
  video: Video;
};

export function DashboardShortCard({ video }: Props) {
  const thumbnailUrl = video.thumbnail_url || video.video_url;
  const isVideoThumb = !!thumbnailUrl && (thumbnailUrl.includes(".mp4") || thumbnailUrl.includes(".webm"));

  return (
    <Link
      to={`/watch/${video.id}`}
      className="snap-start shrink-0 w-[42vw] sm:w-44 md:w-48 lg:w-52"
      aria-label={`Watch short: ${video.title}`}
    >
      <motion.article
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="group"
      >
        <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted">
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
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-10 h-10 text-muted-foreground" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

          <div className="absolute bottom-2 left-2 right-2">
            <p className={cn("text-sm font-semibold text-foreground line-clamp-2", "drop-shadow")}>{video.title}</p>
          </div>

          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-background/80 backdrop-blur text-xs font-medium text-foreground">
            Shorts
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
