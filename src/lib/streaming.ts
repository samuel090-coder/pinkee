import { supabase } from '@/integrations/supabase/client';
import { appConfig } from '@/lib/app-config';

export interface MovieStreamServer {
  name: string;
  url: (id: number) => string;
}

export interface TVStreamServer {
  name: string;
  url: (id: number, season: number, episode: number) => string;
}

export const MOVIE_STREAM_SERVERS: MovieStreamServer[] = [
  { name: 'VidLink', url: (id) => `${appConfig.streamingBaseUrl}/movie/${id}` },
];

export const TV_STREAM_SERVERS: TVStreamServer[] = [
  { name: 'VidLink', url: (id, s, e) => `${appConfig.streamingBaseUrl}/tv/${id}/${s}/${e}` },
];

export const isRecentlyReleased = (date?: string | null, days = 45) => {
  if (!date) return false;
  const releasedAt = new Date(date).getTime();
  if (Number.isNaN(releasedAt)) return false;
  return Date.now() - releasedAt < days * 24 * 60 * 60 * 1000;
};

/** How long to wait for an iframe to fire its `load` event before assuming it's broken. */
export const SERVER_LOAD_TIMEOUT_MS = 9000;

interface LogFailureArgs {
  serverName: string;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  season?: number;
  episode?: number;
  embedUrl: string;
  errorReason: string;
}

/** Fire-and-forget log of a failed embed load. Never throws. */
export async function logStreamFailure(args: LogFailureArgs): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('stream_failures' as any).insert({
      server_name: args.serverName,
      media_type: args.mediaType,
      tmdb_id: args.tmdbId,
      season: args.season ?? null,
      episode: args.episode ?? null,
      embed_url: args.embedUrl,
      error_reason: args.errorReason,
      user_id: user?.id ?? null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
    });
  } catch {
    // Logging must never break playback
  }
}
