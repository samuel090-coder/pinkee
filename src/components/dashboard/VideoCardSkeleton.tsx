import { cn } from '@/lib/utils';

/**
 * Premium shimmer skeleton cards. Used while the videos list is loading or
 * while a freshly uploaded video is still processing its thumbnail.
 * Never render an empty white placeholder — always render one of these.
 */

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted/60',
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:bg-gradient-to-r before:from-transparent before:via-primary/15 before:to-transparent',
        'before:animate-[shimmer_1.6s_infinite]',
        className,
      )}
    />
  );
}

export function LongVideoCardSkeleton() {
  return (
    <div className="group">
      <ShimmerBlock className="aspect-video rounded-2xl ring-1 ring-border/40 shadow-card mb-3" />
      <div className="flex gap-3 px-0.5">
        <ShimmerBlock className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <ShimmerBlock className="h-3.5 rounded w-[85%]" />
          <ShimmerBlock className="h-3 rounded w-[55%]" />
          <ShimmerBlock className="h-2.5 rounded w-[40%]" />
        </div>
      </div>
    </div>
  );
}

export function ShortCardSkeleton() {
  return (
    <ShimmerBlock className="aspect-[9/16] rounded-2xl ring-1 ring-border/40" />
  );
}

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-6">
      <LongVideoCardSkeleton />
      <LongVideoCardSkeleton />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <ShortCardSkeleton key={i} />
        ))}
      </div>
      <LongVideoCardSkeleton />
      <LongVideoCardSkeleton />
    </div>
  );
}
