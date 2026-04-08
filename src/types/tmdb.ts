export interface TMDbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  original_language: string;
  adult: boolean;
  video: boolean;
  media_type?: string;
}

export interface TMDbTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
  origin_country: string[];
  original_language: string;
  media_type?: string;
}

export interface TMDbMovieDetail extends TMDbMovie {
  runtime: number | null;
  budget: number;
  revenue: number;
  status: string;
  tagline: string;
  genres: TMDbGenre[];
  production_companies: { id: number; name: string; logo_path: string | null; origin_country: string }[];
  spoken_languages: { english_name: string; iso_639_1: string; name: string }[];
  belongs_to_collection: { id: number; name: string; poster_path: string | null; backdrop_path: string | null } | null;
  imdb_id: string | null;
}

export interface TMDbTVDetail extends TMDbTVShow {
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  tagline: string;
  genres: TMDbGenre[];
  created_by: { id: number; name: string; profile_path: string | null }[];
  networks: { id: number; name: string; logo_path: string | null }[];
  seasons: TMDbSeason[];
}

export interface TMDbSeason {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  air_date: string | null;
  overview: string;
}

export interface TMDbCast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDbCrew {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TMDbGenre {
  id: number;
  name: string;
}

export interface TMDbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TMDbWatchProviders {
  link?: string;
  flatrate?: TMDbWatchProvider[];
  rent?: TMDbWatchProvider[];
  buy?: TMDbWatchProvider[];
}

export interface TMDbResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export type MediaItem = (TMDbMovie | TMDbTVShow) & { media_type?: string };
