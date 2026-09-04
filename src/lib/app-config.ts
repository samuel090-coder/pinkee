const DEFAULT_PUBLIC_APP_URL = 'https://pinkee.lovable.app';

export const appConfig = {
  appName: 'pinkee',
  publicAppUrl: (import.meta.env.VITE_PUBLIC_APP_URL || DEFAULT_PUBLIC_APP_URL).replace(/\/$/, ''),
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