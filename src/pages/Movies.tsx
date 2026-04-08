import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { HeroBanner } from '@/components/movies/HeroBanner';
import { MovieRow } from '@/components/movies/MovieRow';
import {
  getTrending, getPopularMovies, getTopRatedMovies,
  getUpcomingMovies, getNollywood,
} from '@/lib/tmdb';
import type { MediaItem } from '@/types/tmdb';
import type { TMDbMovie } from '@/types/tmdb';

const Movies = () => {
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [popular, setPopular] = useState<TMDbMovie[]>([]);
  const [topRated, setTopRated] = useState<TMDbMovie[]>([]);
  const [upcoming, setUpcoming] = useState<TMDbMovie[]>([]);
  const [nollywood, setNollywood] = useState<TMDbMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [t, p, tr, u, n] = await Promise.all([
          getTrending('movie', 'day'),
          getPopularMovies(),
          getTopRatedMovies(),
          getUpcomingMovies(),
          getNollywood(),
        ]);
        setTrending(t.results);
        setPopular(p.results);
        setTopRated(tr.results);
        setUpcoming(u.results);
        setNollywood(n.results);
      } catch (e) {
        console.error('Failed to load movies:', e);
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
        <MovieRow title="🔥 Trending Now" items={trending} loading={loading} />
        <MovieRow title="Popular Movies" items={popular as MediaItem[]} loading={loading} />
        <MovieRow title="Top Rated" items={topRated as MediaItem[]} loading={loading} />
        <MovieRow title="Coming Soon" items={upcoming as MediaItem[]} loading={loading} />
        <MovieRow title="🇳🇬 Nollywood" items={nollywood as MediaItem[]} loading={loading} />
      </div>
    </MainLayout>
  );
};

export default Movies;
