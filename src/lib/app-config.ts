const DEFAULT_PUBLIC_APP_URL = 'https://pinkee.lovable.app';

export const appConfig = {
  appName: 'pinkee',
  publicAppUrl: (import.meta.env.VITE_PUBLIC_APP_URL || DEFAULT_PUBLIC_APP_URL).replace(/\/$/, ''),
  tmdbApiKey: import.meta.env.VITE_TMDB_API_KEY || '272139592cd689eae0663d4ed7dfdb39',
  streamingBaseUrl: (import.meta.env.VITE_STREAMING_BASE_URL || 'https://vidlink.pro').replace(/\/$/, ''),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  functions: {
    getVapidKey: 'get-vapid-key',
    suggestMetadata: 'suggest-metadata',
  },
} as const;

export function getPublicUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${appConfig.publicAppUrl}${normalizedPath}`;
}