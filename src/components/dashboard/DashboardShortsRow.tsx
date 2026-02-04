import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Video } from "@/contexts/VideoContext";
import { DashboardShortCard } from "@/components/dashboard/DashboardShortCard";

type Props = {
  videos: Video[];
};

function isShort(video: Video) {
  const dur = video.duration || 0;
  const category = (video.category || "").toLowerCase();
  return category === "shorts" || (dur > 0 && dur <= 60);
}

export function DashboardShortsRow({ videos }: Props) {
  const shorts = useMemo(() => {
    return [...videos].filter((v) => v.is_published).filter(isShort).slice(0, 30);
  }, [videos]);

  if (!shorts.length) return null;

  return (
    <section aria-label="Shorts" className="mb-10">
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <h2 className="font-display font-bold text-xl md:text-2xl text-foreground">Shorts</h2>
          <p className="text-sm text-muted-foreground">Swipe to explore quick videos</p>
        </div>
        <Link to="/shorts" className="text-sm text-primary hover:underline whitespace-nowrap">
          View all
        </Link>
      </div>

      <div className="-mx-4 px-4">
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
          {shorts.map((v) => (
            <DashboardShortCard key={v.id} video={v} />
          ))}
        </div>
      </div>
    </section>
  );
}
