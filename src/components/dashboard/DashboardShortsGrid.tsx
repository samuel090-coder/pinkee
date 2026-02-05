import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Video } from "@/contexts/VideoContext";
import { DashboardShortCard } from "@/components/dashboard/DashboardShortCard";

type Props = {
  videos: Video[];
  maxItems?: number;
};

function isShort(video: Video) {
  const dur = video.duration || 0;
  const category = (video.category || "").toLowerCase();
  return category === "shorts" || (dur > 0 && dur <= 60);
}

export function DashboardShortsGrid({ videos, maxItems = 4 }: Props) {
  const shorts = useMemo(() => {
    return [...videos].filter((v) => v.is_published).filter(isShort).slice(0, maxItems);
  }, [videos, maxItems]);

  if (!shorts.length) return null;

  return (
    <section aria-label="Shorts" className="mb-8">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-destructive rounded-lg flex items-center justify-center">
            <span className="text-destructive-foreground text-xs font-bold">▶</span>
          </div>
          <h2 className="font-display font-bold text-lg text-foreground">Shorts</h2>
        </div>
        <Link to="/shorts" className="text-sm text-primary hover:underline whitespace-nowrap">
          View all
        </Link>
      </div>

      {/* 2-column grid like YouTube mobile */}
      <div className="grid grid-cols-2 gap-2">
        {shorts.map((v, i) => (
          <DashboardShortCard key={v.id} video={v} index={i} />
        ))}
      </div>
    </section>
  );
}
