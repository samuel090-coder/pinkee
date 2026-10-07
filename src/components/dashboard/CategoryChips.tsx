import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  "All",
  "Music",
  "Gaming",
  "News",
  "Sports",
  "Comedy",
  "Education",
  "Podcasts",
  "Movies",
  "Live",
  "Entertainment",
  "Technology",
  "Fashion",
  "Cooking",
  "Travel",
];

type Props = {
  selected: string;
  onSelect: (category: string) => void;
};

export function CategoryChips({ selected, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.5;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative flex items-center gap-2 border-b border-border/70 bg-background/90 py-3 backdrop-blur-xl">
      {/* Left scroll button - desktop only */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden sm:flex absolute left-0 z-10 w-8 h-8 bg-background/80 backdrop-blur-sm shadow-md"
        onClick={() => scroll("left")}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* Chips container */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-1 sm:px-10"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap",
              selected === cat
                ? "border-primary/50 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.22)]"
                : "border-border/80 bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Right scroll button - desktop only */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden sm:flex absolute right-0 z-10 w-8 h-8 bg-background/80 backdrop-blur-sm shadow-md"
        onClick={() => scroll("right")}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
