// Utility functions for handling video URLs (direct files vs external embeds)

const DIRECT_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.m3u8'];

function ensureProtocol(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(ensureProtocol(url));
  } catch {
    return null;
  }
}

function extractYouTubeId(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase();

  if (host.includes('youtu.be')) {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return id?.slice(0, 11) || null;
  }

  if (host.includes('youtube.com')) {
    const watchId = parsed.searchParams.get('v');
    if (watchId) return watchId.slice(0, 11);

    const pathMatch = parsed.pathname.match(/\/(embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
    if (pathMatch?.[2]) return pathMatch[2];
  }

  return null;
}

function extractVimeoId(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const match = parsed.pathname.match(/\/(?:.*\/)?(\d+)(?:$|\/)/);
  return match?.[1] || null;
}

function extractDailymotionId(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  if (parsed.hostname.includes('dai.ly')) {
    return parsed.pathname.split('/').filter(Boolean)[0] || null;
  }

  const videoMatch = parsed.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
  if (videoMatch?.[1]) return videoMatch[1];

  return parsed.pathname.split('/').filter(Boolean).pop() || null;
}

function extractTikTokId(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const match = parsed.pathname.match(/\/video\/(\d+)/);
  return match?.[1] || null;
}

/**
 * Check if a URL is an external embed link (not a direct video file)
 */
export function isExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  const normalized = url.trim().toLowerCase();

  // Direct file URLs from storage or blob URLs are not external embeds
  if (normalized.startsWith('blob:')) return false;
  if (normalized.includes('supabase.co/storage')) return false;

  const isDirectFile = DIRECT_VIDEO_EXTENSIONS.some(ext => normalized.includes(ext));
  if (isDirectFile) return false;

  return normalized.startsWith('http://') || normalized.startsWith('https://');
}

/**
 * Get the embed iframe URL for an external video link
 */
export function getEmbedUrl(url: string): string {
  const normalized = ensureProtocol(url);
  const parsed = parseUrl(normalized);
  if (!parsed) return url;

  const host = parsed.hostname.toLowerCase();
  const ytId = extractYouTubeId(normalized);
  if (ytId) {
    return `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0`;
  }

  const vimeoId = extractVimeoId(normalized);
  if (host.includes('vimeo.com') && vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&title=0&byline=0&portrait=0`;
  }

  const dailymotionId = extractDailymotionId(normalized);
  if ((host.includes('dailymotion.com') || host.includes('dai.ly')) && dailymotionId) {
    return `https://www.dailymotion.com/embed/video/${dailymotionId}?autoplay=1&mute=1`;
  }

  const tiktokId = extractTikTokId(normalized);
  if (host.includes('tiktok.com') && tiktokId) {
    return `https://www.tiktok.com/embed/v2/${tiktokId}`;
  }

  if (host.includes('facebook.com') || host.includes('fb.watch')) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalized)}&autoplay=true`;
  }

  if (host.includes('twitter.com') || host.includes('x.com')) {
    return `https://twitframe.com/show?url=${encodeURIComponent(normalized)}`;
  }

  return normalized;
}

/**
 * Get a thumbnail URL for an external video (YouTube, Vimeo, etc.)
 */
export function getExternalThumbnail(url: string): string | null {
  const normalized = ensureProtocol(url);
  const parsed = parseUrl(normalized);
  if (!parsed) return null;

  const ytId = extractYouTubeId(normalized);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }

  const host = parsed.hostname.toLowerCase();
  const dailymotionId = extractDailymotionId(normalized);
  if ((host.includes('dailymotion.com') || host.includes('dai.ly')) && dailymotionId) {
    return `https://www.dailymotion.com/thumbnail/video/${dailymotionId}`;
  }

  return null;
}
