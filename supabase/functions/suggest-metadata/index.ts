import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

interface SuggestBody {
  filename?: string;
  duration?: number;
  width?: number;
  height?: number;
  is_short?: boolean;
  thumbnail_base64?: string;
  hint?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as SuggestBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanedName = (body.filename || "")
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[_\-\.]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const messages: any[] = [
      {
        role: "system",
        content:
          "You generate concise, high-quality metadata for a creator video platform. Write engaging titles (max 70 chars), a 1-2 sentence description, choose one category from the provided enum, and 5-8 short lowercase tags. Never invent facts you don't know — infer only from the provided signals.",
      },
    ];

    const userContent: any[] = [
      {
        type: "text",
        text: `Signals:
- filename: ${cleanedName || "unknown"}
- duration_seconds: ${body.duration ?? "unknown"}
- resolution: ${body.width ?? "?"}x${body.height ?? "?"}
- format: ${body.is_short ? "vertical short-form" : "horizontal long-form"}
- extra: ${body.hint || "none"}`,
      },
    ];

    if (body.thumbnail_base64) {
      const dataUrl = body.thumbnail_base64.startsWith("data:")
        ? body.thumbnail_base64
        : `data:image/jpeg;base64,${body.thumbnail_base64}`;
      userContent.push({ type: "image_url", image_url: { url: dataUrl } });
    }

    messages.push({ role: "user", content: userContent });

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_metadata",
                description: "Return suggested video metadata",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    category: { type: "string", enum: CATEGORIES },
                    tags: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 3,
                      maxItems: 10,
                    },
                  },
                  required: ["title", "description", "category", "tags"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "suggest_metadata" },
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI gateway ${response.status}`);
    }

    const data = await response.json();
    const args =
      data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;

    const suggestion = {
      title:
        parsed?.title?.slice(0, 100) ||
        cleanedName ||
        "Untitled Video",
      description: parsed?.description?.slice(0, 500) || "",
      category: CATEGORIES.includes(parsed?.category)
        ? parsed.category
        : body.is_short
        ? "Entertainment"
        : "People & Blogs",
      tags: Array.isArray(parsed?.tags)
        ? parsed.tags
            .map((t: unknown) => String(t).toLowerCase().trim())
            .filter(Boolean)
            .slice(0, 10)
        : [],
    };

    return new Response(
      JSON.stringify({ success: true, suggestion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("suggest-metadata error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
