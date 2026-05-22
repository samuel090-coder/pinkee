import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authedClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await authedClient.auth.getUser();
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { user_message, image_url } = await req.json();
    if (!user_message && !image_url) {
      return new Response(JSON.stringify({ error: "Empty message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get or create conversation
    let { data: conv } = await supabase
      .from("support_conversations")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await supabase
        .from("support_conversations")
        .insert({ user_id: user.id })
        .select()
        .single();
      conv = newConv;
    }

    // Insert user message
    await supabase.from("support_messages").insert({
      conversation_id: conv.id,
      sender: "user",
      content: user_message ?? null,
      image_url: image_url ?? null,
    });

    await supabase.from("support_conversations").update({
      last_message_at: new Date().toISOString(),
      unread_admin: (conv.unread_admin ?? 0) + 1,
    }).eq("id", conv.id);

    // Check AI toggle
    const { data: settings } = await supabase.from("support_settings").select("ai_enabled").limit(1).maybeSingle();
    if (!settings?.ai_enabled) {
      return new Response(JSON.stringify({ ok: true, ai_replied: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Gather user context
    const [profile, wallet, txns, earnings, artistEarn, withdrawals, videos, history, prevMessages] = await Promise.all([
      supabase.from("profiles").select("display_name, username, joined_at, is_channel, channel_name, bio").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallets").select("balance, total_spent, total_deposited").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("type, amount, description, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("creator_earnings").select("total_earned, pending_withdrawal, views_counted").eq("creator_id", user.id),
      supabase.from("artist_earnings").select("total_earned, pending_withdrawal, usage_count").eq("artist_id", user.id),
      supabase.from("withdrawal_requests").select("amount, status, created_at").eq("artist_id", user.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("videos").select("title, views, likes_count, created_at").eq("uploader_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("watch_history").select("video_id, watched_at").eq("user_id", user.id).order("watched_at", { ascending: false }).limit(10),
      supabase.from("support_messages").select("sender, content, image_url").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(20),
    ]);

    const context = {
      profile: profile.data,
      wallet: wallet.data,
      recent_transactions: txns.data,
      creator_earnings: earnings.data,
      artist_earnings: artistEarn.data,
      withdrawals: withdrawals.data,
      recent_uploads: videos.data,
      recent_watches: history.data,
    };

    const history20 = (prevMessages.data ?? []).reverse();
    const chatMessages: any[] = history20.map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.image_url
        ? [
            { type: "text", text: m.content ?? "" },
            { type: "image_url", image_url: { url: m.image_url } },
          ]
        : (m.content ?? ""),
    }));

    const systemPrompt = `You are "Pinkee Support", a warm, friendly, professional human-style customer support agent for the Pinkee streaming platform. Respond in a natural, helpful, empathetic tone — like a real person. Use the user's name when appropriate. You have access to the user's real account data below — refer to it when relevant (balance, earnings, uploads, etc.) but never expose raw IDs. Never reveal that you are an AI unless directly asked.

USER CONTEXT (JSON):
${JSON.stringify(context, null, 2)}

If you want to send an image to the user (e.g., a visual explanation, illustration), end your reply with a line in the exact format:
[GENERATE_IMAGE: short prompt describing the image]
Otherwise just reply normally with text. Keep replies concise and friendly.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "AI failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiResp.json();
    let aiText: string = aiJson.choices?.[0]?.message?.content ?? "";

    // Detect image generation request
    let generatedImageUrl: string | null = null;
    const imgMatch = aiText.match(/\[GENERATE_IMAGE:\s*([^\]]+)\]/i);
    if (imgMatch) {
      aiText = aiText.replace(imgMatch[0], "").trim();
      try {
        const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: imgMatch[1].trim() }],
            modalities: ["image", "text"],
          }),
        });
        if (imgResp.ok) {
          const ij = await imgResp.json();
          const b64 = ij.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (b64) generatedImageUrl = b64;
        }
      } catch (e) {
        console.error("image gen failed", e);
      }
    }

    await supabase.from("support_messages").insert({
      conversation_id: conv.id,
      sender: "ai",
      content: aiText || null,
      image_url: generatedImageUrl,
      is_ai_generated: true,
    });

    await supabase.from("support_conversations").update({
      last_message_at: new Date().toISOString(),
      unread_user: (conv.unread_user ?? 0) + 1,
    }).eq("id", conv.id);

    return new Response(JSON.stringify({ ok: true, ai_replied: true, reply: aiText, image_url: generatedImageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("support-ai error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
