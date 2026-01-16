import { useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { VideoCardNew } from '@/components/video/VideoCardNew';
import { useVideo } from '@/contexts/VideoContext';

interface ExploreCategoryProps {
  title: string;
  category?: string;
  sort?: 'views' | 'newest';
}

const ExploreCategory = ({ title, category, sort = 'newest' }: ExploreCategoryProps) => {
  const { videos } = useVideo();

  const items = useMemo(() => {
    let results = [...videos].filter(v => v.is_published);

    if (category) {
      const cLower = category.toLowerCase();
      results = results.filter(v => {
        const vCat = v.category?.toLowerCase() || '';
        const vTitle = v.title.toLowerCase();
        return vCat === cLower || vCat.includes(cLower) || vTitle.includes(cLower);
      });
    }

    results.sort((a, b) => {
      if (sort === 'views') return (b.views || 0) - (a.views || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return results;
  }, [videos, category, sort]);

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground">Browse {title.toLowerCase()} videos.</p>
        </header>

        {items.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map(v => (
              <VideoCardNew key={v.id} video={v} variant="default" />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            No videos found.
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ExploreCategory;
