import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { HeroBanner } from '@/components/movies/HeroBanner';
import { MovieRow } from '@/components/movies/MovieRow';
import { getTrending, getPopularTV, getTopRatedTV, getKDrama } from '@/lib/tmdb';
import type { MediaItem, TMDbTVShow } from '@/types/tmdb';

const TVShows = () => {
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [popular, setPopular] = useState<TMDbTVShow[]>([]);
  const [topRated, setTopRated] = useState<TMDbTVShow[]>([]);
  const [kdrama, setKdrama] = useState<TMDbTVShow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [t, p, tr, k] = await Promise.all([
          getTrending('tv', 'day'),
          getPopularTV(),
          getTopRatedTV(),
          getKDrama(),
        ]);
        setTrending(t.results);
        setPopular(p.results);
        setTopRated(tr.results);
        setKdrama(k.results);
      } catch (e) {
        console.error('Failed to load TV:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <MainLayout>
      <div className="pb-20 space-y-6">
        <HeroBanner items={trending} loading={loading} />
        <MovieRow title="🔥 Trending TV" items={trending} loading={loading} />
        <MovieRow title="Popular Shows" items={popular as MediaItem[]} loading={loading} />
        <MovieRow title="Top Rated" items={topRated as MediaItem[]} loading={loading} />
        <MovieRow title="🇰🇷 K-Drama" items={kdrama as MediaItem[]} loading={loading} />
      </div>
    </MainLayout>
  );
};

export default TVShows;
