import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const RAPIDAPI_HOST = 'youtube138.p.rapidapi.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
    if (!RAPIDAPI_KEY) {
      return new Response(JSON.stringify({ error: 'RAPIDAPI_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const channelId = typeof body.channelId === 'string' && body.channelId.trim()
      ? body.channelId.trim()
      : 'UCJ5v_MCY6GNUBTO8-D3XoAg';
    const filter = typeof body.filter === 'string' ? body.filter : 'videos_latest';
    const cursor = typeof body.cursor === 'string' ? body.cursor : '';

    const upstream = await fetch(`https://${RAPIDAPI_HOST}/channel/videos/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
      body: JSON.stringify({ id: channelId, filter, cursor, hl: 'en', gl: 'US' }),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: `Upstream ${upstream.status}`, details: text.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = JSON.parse(text);
    const raw = Array.isArray(json?.contents) ? json.contents : [];

    type Item = {
      videoId: string;
      title: string;
      description: string;
      thumbnail: string;
      duration: number;
      publishedTimeText: string;
      viewCountText: string;
      author: { name: string; avatar: string; channelId: string };
    };

    const items: Item[] = raw
      .map((c: any) => c?.video)
      .filter(Boolean)
      .map((v: any) => {
        const thumbs = Array.isArray(v.thumbnails) ? v.thumbnails : [];
        const authorThumbs = Array.isArray(v.author?.avatar) ? v.author.avatar : [];
        return {
          videoId: v.videoId,
          title: v.title ?? '',
          description: v.descriptionSnippet ?? '',
          thumbnail: thumbs[thumbs.length - 1]?.url ?? '',
          duration: typeof v.lengthSeconds === 'number' ? v.lengthSeconds : 0,
          publishedTimeText: v.publishedTimeText ?? '',
          viewCountText: v.stats?.viewsText ?? v.stats?.views?.toString() ?? '',
          author: {
            name: v.author?.title ?? '',
            avatar: authorThumbs[authorThumbs.length - 1]?.url ?? '',
            channelId: v.author?.channelId ?? '',
          },
        };
      })
      .filter((i: Item) => i.videoId);

    return new Response(JSON.stringify({ items, cursorNext: json?.cursorNext ?? null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
