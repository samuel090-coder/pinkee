import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((+t - +yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const body = await req.json().catch(() => ({}));
    const targetUserId: string | undefined = body.user_id;
    const wk = weekKey();

    const { data: users } = targetUserId
      ? { data: [{ user_id: targetUserId }] }
      : await admin.from('profiles').select('user_id').limit(500);

    if (!users?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let processed = 0;
    for (const u of users) {
      const uid = u.user_id;
      const { data: existing } = await admin.from('weekly_digests').select('id').eq('user_id', uid).eq('week_key', wk).maybeSingle();
      if (existing) continue;

      // Gather week activity
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ data: history }, { data: likes }, { data: rewards }] = await Promise.all([
        admin.from('watch_history').select('video_id, watched_at').eq('user_id', uid).gte('watched_at', since).limit(50),
        admin.from('video_likes').select('video_id').eq('user_id', uid).gte('created_at', since).limit(50),
        admin.from('user_rewards').select('current_streak, points_balance, lifetime_ngn').eq('user_id', uid).maybeSingle(),
      ]);

      const watchedIds = [...new Set((history || []).map((h: any) => h.video_id))].slice(0, 20);
      const { data: watchedVideos } = watchedIds.length
        ? await admin.from('videos').select('id, title, category, thumbnail_url').in('id', watchedIds)
        : { data: [] };

      // Recommendations: top categories
      const cats = new Map<string, number>();
      (watchedVideos || []).forEach((v: any) => v.category && cats.set(v.category, (cats.get(v.category) || 0) + 1));
      const topCats = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
      const { data: recs } = topCats.length
        ? await admin.from('videos').select('id, title, thumbnail_url, category').in('category', topCats).eq('is_published', true).order('views', { ascending: false }).limit(6)
        : await admin.from('videos').select('id, title, thumbnail_url, category').eq('is_published', true).order('views', { ascending: false }).limit(6);

      // AI headline
      let headline = 'Your week on Pinkee';
      try {
        const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{
              role: 'user',
              content: `Write a single upbeat, personalized 8-word headline for a weekly recap on the Pinkee streaming app. Watched ${history?.length || 0} videos, liked ${likes?.length || 0}, top interests: ${topCats.join(', ') || 'variety'}. Streak: ${rewards?.current_streak || 0} days. Return only the headline text, no quotes.`,
            }],
          }),
        });
        if (aiRes.ok) {
          const j = await aiRes.json();
          headline = j.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || headline;
        }
      } catch (_) { /* fallback headline */ }

      const content = {
        headline,
        stats: {
          videos_watched: history?.length || 0,
          liked: likes?.length || 0,
          streak: rewards?.current_streak || 0,
          top_categories: topCats,
        },
        highlights: (watchedVideos || []).slice(0, 4),
        recommendations: recs || [],
      };

      await admin.from('weekly_digests').insert({ user_id: uid, week_key: wk, content });
      await admin.from('user_notifications').insert({
        user_id: uid,
        type: 'digest',
        title: '✨ Your Pinkee week is ready',
        body: headline,
        link: '/rewards?tab=digest',
      });
      processed++;
    }

    return new Response(JSON.stringify({ ok: true, processed, week: wk }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('digest error', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
