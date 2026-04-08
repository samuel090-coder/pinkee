import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MovieCard, MovieCardSkeleton } from './MovieCard';
import type { MediaItem } from '@/lib/tmdb';

interface MovieRowProps {
  title: string;
  items: MediaItem[];
  loading?: boolean;
  seeAllLink?: string;
}

export function MovieRow({ title, items, loading, seeAllLink }: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <div className="flex items-center gap-2">
          {seeAllLink && (
            <Link to={seeAllLink} className="text-sm text-primary hover:underline mr-2">
              See all
            </Link>
          )}
          <Button variant="ghost" size="icon" className="hidden sm:flex w-8 h-8" onClick={() => scroll('left')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex w-8 h-8" onClick={() => scroll('right')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide px-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start">
                <MovieCardSkeleton />
              </div>
            ))
          : items.map((item, i) => (
              <div key={item.id} className="flex-shrink-0 w-[140px] sm:w-[160px] snap-start">
                <MovieCard item={item} index={i} />
              </div>
            ))}
      </div>
    </section>
  );
}
