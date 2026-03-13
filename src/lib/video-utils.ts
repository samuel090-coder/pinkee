// Utility functions for handling video URLs (direct files vs external embeds)

const EMBED_PATTERNS: { pattern: RegExp; getEmbedUrl: (url: string) => string }[] = [
  {
    // YouTube - various formats
    pattern: /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    getEmbedUrl: (url: string) => {
      const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url;
    },
  },
  {
    // Vimeo
    pattern: /vimeo\.com\/(\d+)/,
    getEmbedUrl: (url: string) => {
      const match = url.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1` : url;
    },
  },
  {
    // Dailymotion
    pattern: /dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
    getEmbedUrl: (url: string) => {
      const match = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
      return match ? `https://www.dailymotion.com/embed/video/${match[1]}?autoplay=1` : url;
    },
  },
  {
    // TikTok
    pattern: /tiktok\.com\/.+\/video\/(\d+)/,
    getEmbedUrl: (url: string) => {
      const match = url.match(/tiktok\.com\/.+\/video\/(\d+)/);
      return match ? `https://www.tiktok.com/embed/v2/${match[1]}` : url;
    },
  },
  {
    // Facebook video
    pattern: /facebook\.com\/.*\/videos\//,
    getEmbedUrl: (url: string) => {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=true`;
    },
  },
];

/**
 * Check if a URL is an external embed link (not a direct video file)
 */
export function isExternalUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  // Direct file URLs from Supabase storage or blob URLs are not external
  if (url.startsWith('blob:')) return false;
  if (url.includes('supabase.co/storage')) return false;
  // Check if it matches any known embed platform or is a general http link that's not a direct video file
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m3u8'];
  const isDirectFile = videoExtensions.some(ext => url.toLowerCase().includes(ext));
  if (isDirectFile) return false;
  // If it's an http(s) URL without a video extension, it's likely an external embed
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Get the embed iframe URL for an external video link
 */
export function getEmbedUrl(url: string): string {
  for (const { pattern, getEmbedUrl } of EMBED_PATTERNS) {
    if (pattern.test(url)) {
      return getEmbedUrl(url);
    }
  }
  // Fallback: return the URL as-is (will be used in iframe src)
  return url;
}

/**
 * Get a thumbnail URL for an external video (YouTube, Vimeo, etc.)
 */
export function getExternalThumbnail(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  }
  // Vimeo - would need API call, return null
  return null;
}
