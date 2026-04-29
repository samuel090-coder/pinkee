export interface MovieStreamServer {
  name: string;
  url: (id: number) => string;
}

export interface TVStreamServer {
  name: string;
  url: (id: number, season: number, episode: number) => string;
}

export const MOVIE_STREAM_SERVERS: MovieStreamServer[] = [
  { name: 'VidSrc', url: (id) => `https://vidsrc.xyz/embed/movie?tmdb=${id}` },
  { name: 'VidSrc.to', url: (id) => `https://vidsrc.to/embed/movie/${id}` },
  { name: 'VidSrc.icu', url: (id) => `https://vidsrc.icu/embed/movie/${id}` },
  { name: 'VidLink', url: (id) => `https://vidlink.pro/movie/${id}` },
  { name: '111Movies', url: (id) => `https://111movies.com/movie/${id}` },
  { name: 'VidBinge', url: (id) => `https://vidbinge.dev/embed/movie/${id}` },
  { name: 'MoviesAPI', url: (id) => `https://moviesapi.club/movie/${id}` },
  { name: '2Embed', url: (id) => `https://www.2embed.cc/embed/${id}` },
];

export const TV_STREAM_SERVERS: TVStreamServer[] = [
  { name: 'VidSrc', url: (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}` },
  { name: 'VidSrc.to', url: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc.icu', url: (id, s, e) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}` },
  { name: 'VidLink', url: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}` },
  { name: '111Movies', url: (id, s, e) => `https://111movies.com/tv/${id}/${s}/${e}` },
  { name: 'VidBinge', url: (id, s, e) => `https://vidbinge.dev/embed/tv/${id}/${s}/${e}` },
  { name: 'MoviesAPI', url: (id, s, e) => `https://moviesapi.club/tv/${id}-${s}-${e}` },
  { name: '2Embed', url: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
];

export const isRecentlyReleased = (date?: string | null, days = 45) => {
  if (!date) return false;
  const releasedAt = new Date(date).getTime();
  if (Number.isNaN(releasedAt)) return false;
  return Date.now() - releasedAt < days * 24 * 60 * 60 * 1000;
};