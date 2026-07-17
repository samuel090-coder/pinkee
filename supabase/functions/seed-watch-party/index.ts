import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const NAMES = ['Ava M.','Jordan B.','Noah K.','Zara P.','Leo M.','Maya R.','Ethan C.','Chloe N.','Marcus B.','Sofia A.','Ryan O.','Isabella W.','Kai A.','Amara J.','Diego S.','Lily T.','Jaden P.','Aria S.','Malik H.','Nia R.','Tobi A.','Emma R.','Lucas C.','Zoey I.','Ben C.','Riya K.','Omar F.','Grace W.','Kenji T.','Yara D.'];
const FALLBACK = ['this scene 🔥','omg wait','no because how','the vibes here','replay button worn out','ok this hits','who else came back to this','instant classic','vibes ✨','wait wait wait','this part 🥶','yesss','pause — that was clean','goosebumps fr','sending this to my gc','iconic','how is this real','sound design >>>','the pacing tho','lmaooo','not me watching this again','bro cooked','main character energy','ok that transition','the way i gasped'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Expire overdue parties
    await admin.rpc('expire_watch_parties');

    // Pick active seed-enabled parties in the last 6h
    const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    const { data: parties } = await admin.from('watch_parties')
      .select('id, content_title, content_ref, ai_seed_enabled, ai_viewer_count, participant_count, last_ai_seed_at, created_at')
      .eq('is_active', true).eq('ai_seed_enabled', true)
      .gte('created_at', since).limit(50);

    let seeded = 0;
    for (const p of (parties || [])) {
      const lastAt = p.last_ai_seed_at ? new Date(p.last_ai_seed_at).getTime() : 0;
      // Rate limit: only re-seed every 60s per party
      if (Date.now() - lastAt < 55_000) continue;

      // Try AI-generated context-aware comments
      let lines: string[] = [];
      try {
        const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [{
              role: 'user',
              content: `Write 4 short live-chat messages (max 8 words each) from viewers watching "${p.content_title || 'a video'}" together. Casual, reactive, no hashtags, no quotes. Return only the 4 messages separated by newlines.`,
            }],
          }),
        });
        if (res.ok) {
          const j = await res.json();
          const text: string = j.choices?.[0]?.message?.content || '';
          lines = text.split('\n').map((s: string) => s.replace(/^[\d\-\.\)"'\s]+/, '').trim()).filter(Boolean).slice(0, 4);
        }
      } catch (_) { /* fallback */ }
      if (lines.length === 0) lines = pickN(FALLBACK, 2 + Math.floor(Math.random() * 3));

      // Stagger inserts across ~50s
      const inserts = lines.slice(0, 3 + Math.floor(Math.random() * 2)).map((content, i) => {
        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        return {
          party_id: p.id, display_name: name, avatar_seed: name.replace(/\W/g, ''),
          content, message_type: 'chat',
          created_at: new Date(Date.now() + i * (10_000 + Math.random() * 5000)).toISOString(),
        };
      });
      await admin.from('watch_party_ai_comments').insert(inserts);

      // Bump ambient viewer count gently (bounded)
      const target = Math.min(200, 3 + Math.floor((p.participant_count || 1) * (1 + Math.random() * 4)));
      const nextViewers = Math.max(1, Math.round(((p.ai_viewer_count || 0) * 0.7) + (target * 0.3) + (Math.random() * 4 - 2)));

      await admin.from('watch_parties').update({
        last_ai_seed_at: new Date().toISOString(),
        ai_viewer_count: nextViewers,
      }).eq('id', p.id);
      seeded++;
    }

    return new Response(JSON.stringify({ ok: true, seeded }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('seed-watch-party error', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr]; const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}
