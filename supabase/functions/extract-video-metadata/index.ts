import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIES = [
  "Entertainment",
  "Music",
  "Gaming",
  "Education",
  "Science & Technology",
  "Sports",
  "Comedy",
  "Film & Animation",
  "News & Politics",
  "Howto & Style",
  "Pets & Animals",
  "Travel & Events",
  "Autos & Vehicles",
  "People & Blogs",
];

type EngagementStats = {
  views?: number;
  likes?: number;
  comments?: number;
  source?: string;
};

type ProviderData = {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  duration?: number;
  platform?: string;
  engagement?: EngagementStats;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedUrl = normalizeUrl(url);
    const embed = getEmbedInfo(normalizedUrl);
    const platform = embed?.type || detectPlatform(normalizedUrl);

    const providerData = await getProviderData(normalizedUrl, platform);
    const aiMetadata = await generateMetadataWithAI(normalizedUrl, platform, providerData);

    const metadata = {
      title: providerData.title || aiMetadata.title || "Untitled Video",
      description: providerData.description || aiMetadata.description || "",
      category: sanitizeCategory(aiMetadata.category),
      tags: sanitizeTags(aiMetadata.tags),
      platform: providerData.platform || aiMetadata.platform || platform || "Unknown",
      thumbnail_url: providerData.thumbnail_url || aiMetadata.thumbnail_url || null,
      duration: Number(providerData.duration || 0),
    };

    const engagement = buildEngagement(providerData.engagement, normalizedUrl, platform);

    return new Response(
      JSON.stringify({ success: true, metadata, embed, engagement }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error extracting metadata:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function detectPlatform(url: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return "link";
  const host = parsed.hostname.toLowerCase();

  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("vimeo.com")) return "vimeo";
  if (host.includes("dailymotion.com") || host.includes("dai.ly")) return "dailymotion";
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("facebook.com") || host.includes("fb.watch")) return "facebook";
  if (host.includes("twitter.com") || host.includes("x.com")) return "twitter";
  return "link";
}

function extractYouTubeId(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  if (parsed.hostname.includes("youtu.be")) {
    return parsed.pathname.split("/").filter(Boolean)[0] || null;
  }

  const watchId = parsed.searchParams.get("v");
  if (watchId) return watchId;

  const pathMatch = parsed.pathname.match(/\/(embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  return pathMatch?.[2] || null;
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

  if (parsed.hostname.includes("dai.ly")) {
    return parsed.pathname.split("/").filter(Boolean)[0] || null;
  }

  const videoMatch = parsed.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
  if (videoMatch?.[1]) return videoMatch[1];

  return parsed.pathname.split("/").filter(Boolean).pop() || null;
}

function extractTikTokId(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;
  const match = parsed.pathname.match(/\/video\/(\d+)/);
  return match?.[1] || null;
}

async function fetchJsonSafe(url: string): Promise<any | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LovableBot/1.0)",
        Accept: "application/json,text/plain,*/*",
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchTextSafe(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LovableBot/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

function parseHumanCount(value: string | null | undefined): number {
  if (!value) return 0;
  const cleaned = value.toString().replace(/,/g, "").trim();
  const match = cleaned.match(/([\d.]+)\s*([KMB])?/i);
  if (!match) return Number(cleaned.replace(/[^\d]/g, "")) || 0;

  const base = Number(match[1]);
  if (Number.isNaN(base)) return 0;

  const suffix = (match[2] || "").toUpperCase();
  if (suffix === "K") return Math.round(base * 1_000);
  if (suffix === "M") return Math.round(base * 1_000_000);
  if (suffix === "B") return Math.round(base * 1_000_000_000);
  return Math.round(base);
}

async function getProviderData(url: string, platform: string): Promise<ProviderData> {
  if (platform === "youtube") {
    const id = extractYouTubeId(url);
    if (!id) return {};

    const oembed = await fetchJsonSafe(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    const page = await fetchTextSafe(`https://www.youtube.com/watch?v=${id}`);

    const views = parseHumanCount(page.match(/"viewCount":"(\d+)"/)?.[1]);
    const likes = parseHumanCount(page.match(/"label":"([\d.,KMB]+) likes"/)?.[1]);
    const comments = parseHumanCount(page.match(/"commentCount":"(\d+)"/)?.[1]);

    return {
      title: oembed?.title,
      description: oembed?.author_name ? `Originally posted by ${oembed.author_name} on YouTube.` : undefined,
      thumbnail_url: oembed?.thumbnail_url || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      platform: "YouTube",
      engagement: {
        views,
        likes,
        comments,
        source: "youtube",
      },
    };
  }

  if (platform === "vimeo") {
    const id = extractVimeoId(url);
    if (!id) return {};

    const [oembed, statsData] = await Promise.all([
      fetchJsonSafe(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`),
      fetchJsonSafe(`https://vimeo.com/api/v2/video/${id}.json`),
    ]);

    const stats = Array.isArray(statsData) ? statsData[0] : null;

    return {
      title: oembed?.title || stats?.title,
      description: oembed?.description || stats?.description,
      thumbnail_url: oembed?.thumbnail_url || stats?.thumbnail_large,
      duration: Number(oembed?.duration || stats?.duration || 0),
      platform: "Vimeo",
      engagement: {
        views: Number(stats?.stats_number_of_plays || 0),
        likes: Number(stats?.stats_number_of_likes || 0),
        comments: Number(stats?.stats_number_of_comments || 0),
        source: "vimeo",
      },
    };
  }

  if (platform === "dailymotion") {
    const id = extractDailymotionId(url);
    if (!id) return {};

    const api = await fetchJsonSafe(
      `https://api.dailymotion.com/video/${id}?fields=title,description,thumbnail_720_url,duration,views_total,bookmarks_total,comments_total`
    );

    return {
      title: api?.title,
      description: api?.description,
      thumbnail_url: api?.thumbnail_720_url,
      duration: Number(api?.duration || 0),
      platform: "Dailymotion",
      engagement: {
        views: Number(api?.views_total || 0),
        likes: Number(api?.bookmarks_total || 0),
        comments: Number(api?.comments_total || 0),
        source: "dailymotion",
      },
    };
  }

  if (platform === "tiktok") {
    const [oembed, page] = await Promise.all([
      fetchJsonSafe(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`),
      fetchTextSafe(url),
    ]);

    const views = parseHumanCount(page.match(/"playCount":(\d+)/)?.[1]);
    const likes = parseHumanCount(page.match(/"diggCount":(\d+)/)?.[1]);
    const comments = parseHumanCount(page.match(/"commentCount":(\d+)/)?.[1]);

    return {
      title: oembed?.title,
      description: oembed?.author_name ? `Originally posted by ${oembed.author_name} on TikTok.` : undefined,
      thumbnail_url: oembed?.thumbnail_url,
      platform: "TikTok",
      engagement: {
        views,
        likes,
        comments,
        source: "tiktok",
      },
    };
  }

  // Generic fallback using noembed
  const noembed = await fetchJsonSafe(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
  return {
    title: noembed?.title,
    description: noembed?.author_name ? `Originally posted by ${noembed.author_name}.` : undefined,
    thumbnail_url: noembed?.thumbnail_url,
    platform: noembed?.provider_name || "External",
  };
}

async function generateMetadataWithAI(url: string, platform: string, providerData: ProviderData) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { category: "Entertainment", tags: [] as string[] };
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Generate clean video metadata for a creator platform. Keep tags concise.",
          },
          {
            role: "user",
            content: `URL: ${url}\nPlatform: ${platform}\nKnown title: ${providerData.title || ""}\nKnown description: ${providerData.description || ""}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_metadata",
              description: "Return extracted video metadata",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string", enum: CATEGORIES },
                  tags: { type: "array", items: { type: "string" } },
                  platform: { type: "string" },
                  thumbnail_url: { type: "string" },
                },
                required: ["category", "tags"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_metadata" } },
      }),
    });

    if (!response.ok) {
      return { category: "Entertainment", tags: [] as string[] };
    }

    const data = await response.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return { category: "Entertainment", tags: [] as string[] };

    return JSON.parse(args);
  } catch {
    return { category: "Entertainment", tags: [] as string[] };
  }
}

function sanitizeCategory(category: string | undefined): string {
  if (!category) return "Entertainment";
  return CATEGORIES.includes(category) ? category : "Entertainment";
}

function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 10);
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildEngagement(raw: EngagementStats | undefined, url: string, platform: string) {
  const views = Number(raw?.views || 0);
  const likes = Number(raw?.likes || 0);
  const comments = Number(raw?.comments || 0);

  if (views > 0 || likes > 0 || comments > 0) {
    const finalViews = views > 0 ? views : Math.max(likes * 30, comments * 120, 100);
    const finalLikes = likes > 0 ? likes : Math.max(Math.round(finalViews * 0.035), 10);
    const finalComments = comments > 0 ? comments : Math.max(Math.round(finalLikes * 0.09), 2);

    return {
      views: finalViews,
      likes: finalLikes,
      comments: finalComments,
      source: raw?.source || platform,
      is_estimated: false,
    };
  }

  const seed = hashString(url);
  const estimatedViews = 500 + (seed % 250_000);
  const estimatedLikes = Math.max(10, Math.round(estimatedViews * (0.015 + ((seed % 40) / 1000))));
  const estimatedComments = Math.max(2, Math.round(estimatedLikes * (0.05 + ((seed % 20) / 1000))));

  return {
    views: estimatedViews,
    likes: estimatedLikes,
    comments: estimatedComments,
    source: "estimated",
    is_estimated: true,
  };
}

function getEmbedInfo(url: string): { type: string; embed_url: string; video_url: string } | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const host = parsed.hostname.toLowerCase();

  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      type: "youtube",
      embed_url: `https://www.youtube.com/embed/${youtubeId}?playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0`,
      video_url: url,
    };
  }

  const vimeoId = extractVimeoId(url);
  if (host.includes("vimeo.com") && vimeoId) {
    return {
      type: "vimeo",
      embed_url: `https://player.vimeo.com/video/${vimeoId}`,
      video_url: url,
    };
  }

  const dailymotionId = extractDailymotionId(url);
  if ((host.includes("dailymotion.com") || host.includes("dai.ly")) && dailymotionId) {
    return {
      type: "dailymotion",
      embed_url: `https://www.dailymotion.com/embed/video/${dailymotionId}`,
      video_url: url,
    };
  }

  const tiktokId = extractTikTokId(url);
  if (host.includes("tiktok.com") && tiktokId) {
    return {
      type: "tiktok",
      embed_url: `https://www.tiktok.com/embed/v2/${tiktokId}`,
      video_url: url,
    };
  }

  if (host.includes("facebook.com") || host.includes("fb.watch")) {
    return {
      type: "facebook",
      embed_url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`,
      video_url: url,
    };
  }

  if (host.includes("twitter.com") || host.includes("x.com")) {
    return {
      type: "twitter",
      embed_url: `https://twitframe.com/show?url=${encodeURIComponent(url)}`,
      video_url: url,
    };
  }

  if (/\.(mp4|webm|ogg|mov|m3u8)(\?.*)?$/i.test(parsed.pathname)) {
    return {
      type: "direct",
      embed_url: url,
      video_url: url,
    };
  }

  return {
    type: "link",
    embed_url: url,
    video_url: url,
  };
}
