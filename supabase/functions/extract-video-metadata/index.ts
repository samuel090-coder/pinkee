import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if this is an embeddable video link
    const embedInfo = getEmbedInfo(url);

    const prompt = `Given this video URL: "${url}"

Analyze this URL and extract/generate metadata for it. If you can recognize the platform (YouTube, Vimeo, TikTok, Instagram, Facebook, Twitter/X, Dailymotion, etc.), extract what you can from the URL structure.

Generate a compelling title and description that would be suitable for a video streaming platform.

IMPORTANT: You must call the extract_metadata function with your response.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a video metadata extraction assistant. Extract or generate title, description, category, and tags from video URLs.' },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_metadata',
              description: 'Return extracted video metadata',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'A compelling title for the video (max 100 chars)' },
                  description: { type: 'string', description: 'A detailed description of the video content (max 500 chars)' },
                  category: { type: 'string', enum: ['Entertainment', 'Music', 'Gaming', 'Education', 'Science & Technology', 'Sports', 'Comedy', 'Film & Animation', 'News & Politics', 'Howto & Style', 'Pets & Animals', 'Travel & Events', 'Autos & Vehicles', 'People & Blogs'] },
                  tags: { type: 'array', items: { type: 'string' }, description: 'Relevant tags for the video' },
                  platform: { type: 'string', description: 'Detected platform name (YouTube, Vimeo, TikTok, etc.)' },
                },
                required: ['title', 'description', 'category', 'tags'],
                additionalProperties: false,
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_metadata' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limited, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let metadata = { title: 'Untitled Video', description: '', category: 'Entertainment', tags: [], platform: 'Unknown' };
    
    if (toolCall?.function?.arguments) {
      try {
        metadata = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        metadata,
        embed: embedInfo,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error extracting metadata:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getEmbedInfo(url: string): { type: string; embed_url: string; video_url: string } | null {
  try {
    const u = new URL(url);
    
    // YouTube
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId = '';
      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get('v') || '';
        // Handle /shorts/ URLs
        const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/);
        if (shortsMatch) videoId = shortsMatch[1];
      }
      if (videoId) {
        return {
          type: 'youtube',
          embed_url: `https://www.youtube.com/embed/${videoId}`,
          video_url: url,
        };
      }
    }

    // Vimeo
    if (u.hostname.includes('vimeo.com')) {
      const videoId = u.pathname.split('/').filter(Boolean).pop();
      if (videoId) {
        return {
          type: 'vimeo',
          embed_url: `https://player.vimeo.com/video/${videoId}`,
          video_url: url,
        };
      }
    }

    // Dailymotion
    if (u.hostname.includes('dailymotion.com') || u.hostname.includes('dai.ly')) {
      const match = u.pathname.match(/video\/([^_/]+)/);
      const videoId = match ? match[1] : u.pathname.split('/').pop();
      if (videoId) {
        return {
          type: 'dailymotion',
          embed_url: `https://www.dailymotion.com/embed/video/${videoId}`,
          video_url: url,
        };
      }
    }

    // TikTok
    if (u.hostname.includes('tiktok.com')) {
      return {
        type: 'tiktok',
        embed_url: `https://www.tiktok.com/embed/v2/${u.pathname.split('/').pop()}`,
        video_url: url,
      };
    }

    // Facebook
    if (u.hostname.includes('facebook.com') || u.hostname.includes('fb.watch')) {
      return {
        type: 'facebook',
        embed_url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`,
        video_url: url,
      };
    }

    // Twitter/X
    if (u.hostname.includes('twitter.com') || u.hostname.includes('x.com')) {
      return {
        type: 'twitter',
        embed_url: url,
        video_url: url,
      };
    }

    // Direct video file links
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(u.pathname)) {
      return {
        type: 'direct',
        embed_url: url,
        video_url: url,
      };
    }

    // Unknown - treat as direct link
    return {
      type: 'link',
      embed_url: url,
      video_url: url,
    };
  } catch {
    return null;
  }
}
