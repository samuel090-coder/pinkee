import { appConfig, getPublicUrl } from './app-config';

export const routePaths = {
  home: '/',
  auth: '/auth',
  resetPassword: '/reset-password',
  feed: '/feed',
  watch: (id: string) => `/watch/${encodeURIComponent(id)}`,
  shorts: (id?: string) => id ? `/shorts?start=${encodeURIComponent(id)}` : '/shorts',
  watchParty: (id: string) => `/wp/${encodeURIComponent(id)}`,
  channel: (id: string) => `/channel/${encodeURIComponent(id)}`,
  profile: (id: string) => `/poster/${encodeURIComponent(id)}`,
} as const;

export function getAuthRedirect(path = routePaths.home) {
  return getPublicUrl(path);
}

export function getShareUrl(path: string) {
  return getPublicUrl(path);
}

export { appConfig };