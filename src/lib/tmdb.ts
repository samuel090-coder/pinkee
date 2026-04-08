import type {
  TMDbMovie, TMDbTVShow, TMDbMovieDetail, TMDbTVDetail,
  TMDbCast, TMDbCrew, TMDbVideo, TMDbGenre, TMDbWatchProviders,
  TMDbResponse, MediaItem,
} from '@/types/tmdb';

export type { MediaItem } from '@/types/tmdb';

const API_KEY = '272139592cd689eae0663d4ed7dfdb39';
const BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

// Image helpers
export const img = (path: string | null, size = 'w500') =>
  path ? `${IMG_BASE}/${size}${path}` : '/placeholder.svg';
export const backdrop = (path: string | null) => img(path, 'w1280');
export const poster = (path: string | null) => img(path, 'w342');
export const posterLg = (path: string | null) => img(path, 'w500');
export const profile = (path: string | null) => img(path, 'w185');

// Simple in-memory cache (5 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_key', API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const key = url.toString();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data as T;

  const res = await fetch(key);
  if (!res.ok) throw new Error(`TMDb error ${res.status}`);
  const data = await res.json();
  cache.set(key, { data, ts: Date.now() });

  // Evict old entries
  if (cache.size > 200) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    for (let i = 0; i < 50; i++) cache.delete(oldest[i][0]);
  }

  return data as T;
}

// ─── Movies ───
export const getTrending = (media: 'movie' | 'tv' | 'all' = 'all', window: 'day' | 'week' = 'day') =>
  get<TMDbResponse<MediaItem>>(`/trending/${media}/${window}`);

export const getPopularMovies = (page = 1) =>
  get<TMDbResponse<TMDbMovie>>('/movie/popular', { page: String(page) });

export const getTopRatedMovies = (page = 1) =>
  get<TMDbResponse<TMDbMovie>>('/movie/top_rated', { page: String(page) });

export const getUpcomingMovies = (page = 1) =>
  get<TMDbResponse<TMDbMovie>>('/movie/upcoming', { page: String(page) });

export const getNowPlayingMovies = (page = 1) =>
  get<TMDbResponse<TMDbMovie>>('/movie/now_playing', { page: String(page) });

export const getMovieDetail = (id: number) =>
  get<TMDbMovieDetail>(`/movie/${id}`);

export const getMovieCredits = (id: number) =>
  get<{ cast: TMDbCast[]; crew: TMDbCrew[] }>(`/movie/${id}/credits`);

export const getMovieVideos = (id: number) =>
  get<{ results: TMDbVideo[] }>(`/movie/${id}/videos`);

export const getSimilarMovies = (id: number) =>
  get<TMDbResponse<TMDbMovie>>(`/movie/${id}/similar`);

export const getMovieRecommendations = (id: number) =>
  get<TMDbResponse<TMDbMovie>>(`/movie/${id}/recommendations`);

export const getMovieWatchProviders = (id: number) =>
  get<{ results: Record<string, TMDbWatchProviders> }>(`/movie/${id}/watch/providers`);

// ─── TV Shows ───
export const getPopularTV = (page = 1) =>
  get<TMDbResponse<TMDbTVShow>>('/tv/popular', { page: String(page) });

export const getTopRatedTV = (page = 1) =>
  get<TMDbResponse<TMDbTVShow>>('/tv/top_rated', { page: String(page) });

export const getTVDetail = (id: number) =>
  get<TMDbTVDetail>(`/tv/${id}`);

export const getTVCredits = (id: number) =>
  get<{ cast: TMDbCast[]; crew: TMDbCrew[] }>(`/tv/${id}/credits`);

export const getTVVideos = (id: number) =>
  get<{ results: TMDbVideo[] }>(`/tv/${id}/videos`);

export const getSimilarTV = (id: number) =>
  get<TMDbResponse<TMDbTVShow>>(`/tv/${id}/similar`);

export const getTVWatchProviders = (id: number) =>
  get<{ results: Record<string, TMDbWatchProviders> }>(`/tv/${id}/watch/providers`);

// ─── Search ───
export const searchMulti = (query: string, page = 1) =>
  get<TMDbResponse<MediaItem>>('/search/multi', { query, page: String(page) });

export const searchMovies = (query: string, page = 1, params: Record<string, string> = {}) =>
  get<TMDbResponse<TMDbMovie>>('/search/movie', { query, page: String(page), ...params });

export const searchTV = (query: string, page = 1) =>
  get<TMDbResponse<TMDbTVShow>>('/search/tv', { query, page: String(page) });

// ─── Discovery ───
export const discoverMovies = (params: Record<string, string> = {}) =>
  get<TMDbResponse<TMDbMovie>>('/discover/movie', { sort_by: 'popularity.desc', ...params });

export const discoverTV = (params: Record<string, string> = {}) =>
  get<TMDbResponse<TMDbTVShow>>('/discover/tv', { sort_by: 'popularity.desc', ...params });

// Nollywood (Nigerian movies)
export const getNollywood = (page = 1) =>
  discoverMovies({ with_origin_country: 'NG', page: String(page) });

// K-Drama
export const getKDrama = (page = 1) =>
  discoverTV({ with_origin_country: 'KR', with_genres: '18', page: String(page) });

// ─── Genres ───
export const getMovieGenres = () =>
  get<{ genres: TMDbGenre[] }>('/genre/movie/list');

export const getTVGenres = () =>
  get<{ genres: TMDbGenre[] }>('/genre/tv/list');

// ─── Helpers ───
export function getTitle(item: MediaItem): string {
  return (item as TMDbMovie).title || (item as TMDbTVShow).name || 'Untitled';
}

export function getYear(item: MediaItem): string {
  const date = (item as TMDbMovie).release_date || (item as TMDbTVShow).first_air_date || '';
  return date ? new Date(date).getFullYear().toString() : '';
}

export function getMediaType(item: MediaItem): 'movie' | 'tv' {
  if (item.media_type === 'tv') return 'tv';
  if ('name' in item && !('title' in item)) return 'tv';
  return 'movie';
}
