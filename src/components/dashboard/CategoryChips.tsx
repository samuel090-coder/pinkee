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
    <div className="relative flex items-center gap-2 py-3 bg-background sticky top-16 z-30">
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
              "shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              selected === cat
                ? "bg-foreground text-background"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
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
