import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useVideo } from '@/contexts/VideoContext';

const Shorts = () => {
  const { videos } = useVideo();

  const shorts = useMemo(() => {
    return [...videos]
      .filter(v => v.is_published)
      .filter(v => (v.duration || 0) > 0 && (v.duration || 0) <= 60)
      .slice(0, 30);
  }, [videos]);

  return (
    <MainLayout>
      <div className="container max-w-5xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Shorts</h1>
          <p className="text-muted-foreground">Quick videos under 60 seconds.</p>
        </header>

        {shorts.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {shorts.map(v => (
              <Link key={v.id} to={`/watch/${v.id}`} className="group">
                <article className="rounded-xl overflow-hidden border border-border bg-card hover:bg-secondary/50 transition-colors">
                  <div className="aspect-[9/16] bg-muted relative">
                    {v.thumbnail_url && (
                      <img
                        src={v.thumbnail_url}
                        alt={v.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-background/80 to-transparent">
                      <h2 className="text-sm font-medium text-foreground line-clamp-2">
                        {v.title}
                      </h2>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            No Shorts yet.
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Shorts;
