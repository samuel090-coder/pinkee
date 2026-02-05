import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { Video } from "@/contexts/VideoContext";
import { cn } from "@/lib/utils";

type Props = {
  video: Video;
  index: number;
};

export function DashboardShortCard({ video, index }: Props) {
  const navigate = useNavigate();
  const thumbnailUrl = video.thumbnail_url || video.video_url;
  const isVideoThumb = !!thumbnailUrl && (thumbnailUrl.includes(".mp4") || thumbnailUrl.includes(".webm"));

  const handleClick = () => {
    // Navigate to shorts page starting at this video
    navigate(`/shorts?start=${video.id}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left"
      aria-label={`Watch short: ${video.title}`}
    >
      <motion.article
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group"
      >
        {/* Tall 9:16 card like YouTube Shorts */}
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

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Title at bottom */}
          <div className="absolute bottom-2 left-2 right-2">
            <p className="text-sm font-medium text-white line-clamp-2 drop-shadow-lg">
              {video.title}
            </p>
          </div>
        </div>
      </motion.article>
    </button>
  );
}
