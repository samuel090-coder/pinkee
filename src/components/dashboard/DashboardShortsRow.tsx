import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Video } from "@/contexts/VideoContext";
import { DashboardShortCard } from "@/components/dashboard/DashboardShortCard";
import { Button } from "@/components/ui/button";

type Props = {
  videos: Video[];
};

function isShort(video: Video) {
  const dur = video.duration || 0;
  const category = (video.category || "").toLowerCase();
  return category === "shorts" || (dur > 0 && dur <= 60);
}

export function DashboardShortsRow({ videos }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const shorts = useMemo(() => {
    return [...videos].filter((v) => v.is_published).filter(isShort).slice(0, 30);
  }, [videos]);

  if (!shorts.length) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section aria-label="Shorts" className="mb-10">
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <h2 className="font-display font-bold text-xl md:text-2xl text-foreground flex items-center gap-2">
            <span className="w-6 h-6 bg-destructive rounded flex items-center justify-center text-destructive-foreground text-xs font-bold">▶</span>
            Shorts
          </h2>
          <p className="text-sm text-muted-foreground">Swipe to explore quick videos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:flex w-8 h-8"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:flex w-8 h-8"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Link to="/shorts" className="text-sm text-primary hover:underline whitespace-nowrap">
            View all
          </Link>
        </div>
      </div>

      <div className="-mx-4 px-4">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {shorts.map((v, i) => (
            <DashboardShortCard key={v.id} video={v} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
