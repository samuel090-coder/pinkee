import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Users, Copy, LogOut, Loader2, Clock, Share2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo } from '@/contexts/VideoContext';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { copyToClipboard } from '@/lib/native-capabilities';
import { getShareUrl } from '@/lib/navigation';

const REACTION_EMOJIS = ['❤️', '😂', '🔥', '😮', '👏', '💯'];

interface Party {
  id: string; host_id: string; title: string; content_type: string; content_ref: string;
  content_title: string | null; content_poster: string | null; is_public: boolean;
  current_time_seconds: number; is_playing: boolean; participant_count: number;
  is_active: boolean; expires_at: string | null; short_code: string | null;
  ai_viewer_count: number;
}
interface RealMsg { kind: 'real'; id: string; user_id: string; content: string; message_type: string; emoji: string | null; created_at: string; name?: string; username?: string; avatar?: string; }
interface AIMsg { kind: 'ai'; id: string; display_name: string; avatar_seed: string; content: string; message_type: string; emoji: string | null; created_at: string; }
type Msg = RealMsg | AIMsg;

export default function WatchPartyRoom() {
  const { id: routeParam } = useParams();
  const { user } = useAuth();
  const { videos } = useVideo();
  const navigate = useNavigate();
  const [party, setParty] = useState<Party | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [expired, setExpired] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [floating, setFloating] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [profilesCache, setProfilesCache] = useState<Map<string, { display_name: string; username: string; avatar_url: string }>>(new Map());
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const applyingRemote = useRef(false);

  const video = useMemo(() => videos.find(v => v.id === party?.content_ref), [videos, party?.content_ref]);
  const isHost = user?.id === party?.host_id;

  // Resolve party (by UUID or short_code)
  useEffect(() => {
    if (!routeParam) return;
    let mounted = true;
    (async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(routeParam);
      const q = supabase.from('watch_parties').select('*');
      const { data } = isUuid ? await q.eq('id', routeParam).maybeSingle() : await q.eq('short_code', routeParam.toUpperCase()).maybeSingle();
      if (!mounted) return;
      if (!data) { setNotFound(true); return; }
      const p = data as any as Party;
      // Expiration check
      if (p.expires_at && new Date(p.expires_at).getTime() <= Date.now()) {
        setExpired(true); setParty(p); return;
      }
      if (!p.is_active) { setExpired(true); setParty(p); return; }
      setParty(p);

      // Join if signed in
      if (user) {
        await (supabase.from('watch_party_participants') as any).upsert({ party_id: p.id, user_id: user.id, left_at: null }, { onConflict: 'party_id,user_id' });
        const { count } = await supabase.from('watch_party_participants').select('*', { count: 'exact', head: true }).eq('party_id', p.id).is('left_at', null);
        await (supabase.from('watch_parties') as any).update({ participant_count: count || 1 }).eq('id', p.id);
      }

      // Load messages
      const [{ data: real }, { data: ai }] = await Promise.all([
        supabase.from('watch_party_messages').select('*').eq('party_id', p.id).order('created_at', { ascending: true }).limit(200),
        (supabase.from('watch_party_ai_comments') as any).select('*').eq('party_id', p.id).order('created_at', { ascending: true }).limit(200),
      ]);
      const realMsgs: Msg[] = (real || []).map((m: any) => ({ kind: 'real', ...m }));
      const aiMsgs: Msg[] = (ai || []).map((m: any) => ({ kind: 'ai', ...m }));
      const merged = [...realMsgs, ...aiMsgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(merged);

      // Cache profiles
      const uids = Array.from(new Set(realMsgs.map(m => (m as RealMsg).user_id)));
      if (uids.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', uids);
        const m = new Map(profilesCache);
        (profs || []).forEach((pr: any) => m.set(pr.user_id, pr));
        setProfilesCache(m);
      }
    })();

    return () => { mounted = false; };
  }, [routeParam, user?.id]);

  // Realtime channel
  useEffect(() => {
    if (!party?.id) return;
    const ch = supabase.channel(`party:${party.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'watch_party_messages', filter: `party_id=eq.${party.id}` }, async (p) => {
        const m = { kind: 'real', ...(p.new as any) } as RealMsg;
        setMessages(prev => [...prev, m]);
        if (!profilesCache.has(m.user_id)) {
          const { data } = await supabase.from('profiles').select('user_id, display_name, username, avatar_url').eq('user_id', m.user_id).maybeSingle();
          if (data) setProfilesCache(prev => new Map(prev).set(m.user_id, data as any));
        }
        if (m.message_type === 'reaction' && m.emoji) pushFloat(m.emoji);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'watch_party_ai_comments', filter: `party_id=eq.${party.id}` }, (p) => {
        const m = { kind: 'ai', ...(p.new as any) } as AIMsg;
        setMessages(prev => [...prev, m]);
        if (m.message_type === 'reaction' && m.emoji) pushFloat(m.emoji);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'watch_parties', filter: `id=eq.${party.id}` }, (p) => {
        const next = p.new as any as Party;
        setParty(next);
        if (next.expires_at && new Date(next.expires_at).getTime() <= Date.now()) setExpired(true);
        if (!next.is_active) setExpired(true);
        if (!isHost && videoRef.current) {
          const drift = Math.abs(videoRef.current.currentTime - next.current_time_seconds);
          if (drift > 2) { applyingRemote.current = true; videoRef.current.currentTime = next.current_time_seconds; setTimeout(() => { applyingRemote.current = false; }, 300); }
          if (next.is_playing && videoRef.current.paused) videoRef.current.play().catch(() => {});
          if (!next.is_playing && !videoRef.current.paused) videoRef.current.pause();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      if (user && party.id) supabase.from('watch_party_participants').update({ left_at: new Date().toISOString() }).eq('party_id', party.id).eq('user_id', user.id);
    };
  }, [party?.id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  // Countdown + auto-bounce
  useEffect(() => {
    if (!party?.expires_at) return;
    const tick = () => {
      const ms = new Date(party.expires_at!).getTime() - Date.now();
      if (ms <= 0) { setExpired(true); setTimeLeft('Expired'); return; }
      const mins = Math.floor(ms / 60000);
      const hrs = Math.floor(mins / 60);
      setTimeLeft(hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`);
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [party?.expires_at]);

  // Host broadcast
  useEffect(() => {
    if (!isHost || !party?.id) return;
    const t = setInterval(() => {
      const v = videoRef.current; if (!v) return;
      (supabase.from('watch_parties') as any).update({ current_time_seconds: v.currentTime, is_playing: !v.paused, last_sync_at: new Date().toISOString() }).eq('id', party.id);
    }, 3000);
    return () => clearInterval(t);
  }, [isHost, party?.id]);

  const pushFloat = (emoji: string) => {
    const fid = Math.random().toString(36).slice(2);
    setFloating(f => [...f, { id: fid, emoji, x: 20 + Math.random() * 60 }]);
    setTimeout(() => setFloating(f => f.filter(x => x.id !== fid)), 3000);
  };

  const requireAuth = () => {
    if (!user) { toast({ title: 'Sign in to join the chat', description: 'Create a free account to comment and react.' }); navigate('/auth'); return false; }
    return true;
  };
  const send = async () => {
    if (!text.trim() || !party) return;
    if (!requireAuth()) return;
    await supabase.from('watch_party_messages').insert({ party_id: party.id, user_id: user!.id, content: text.trim(), message_type: 'chat' });
    setText('');
  };
  const react = async (emoji: string) => {
    if (!party) return;
    if (!requireAuth()) return;
    await supabase.from('watch_party_messages').insert({ party_id: party.id, user_id: user!.id, content: emoji, emoji, message_type: 'reaction' });
  };
  const copyLink = () => {
    const url = party?.short_code ? getShareUrl(`/wp/${party.short_code}`) : getShareUrl(`/watch-party/${party?.id || ''}`);
    void copyToClipboard(url).then((copied) => {
      if (copied) toast({ title: 'Share link copied!', description: url });
    });
  };
  const leave = async () => {
    if (isHost && party) await (supabase.from('watch_parties') as any).update({ is_active: false, ended_at: new Date().toISOString() }).eq('id', party.id);
    navigate('/watch-parties');
  };

  if (notFound) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <Lock className="w-12 h-12 mx-auto mb-3 text-white/60" />
        <p className="font-bold text-xl">Room not found</p>
        <p className="text-sm text-white/60 mt-2">This party link is invalid or was removed.</p>
        <Button className="mt-4" onClick={() => navigate('/watch-parties')}>Browse parties</Button>
      </div>
    </div>
  );

  if (!party) return <div className="flex items-center justify-center h-screen bg-black"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;

  if (expired) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <Clock className="w-12 h-12 mx-auto mb-3 text-orange-400" />
        <p className="font-bold text-xl">This party has ended</p>
        <p className="text-sm text-white/60 mt-2">The host closed the room or it reached its expiry time.</p>
        <Button className="mt-4" onClick={() => navigate('/watch-parties')}>Find another party</Button>
      </div>
    </div>
  );

  const totalViewers = (party.participant_count || 0) + (party.ai_viewer_count || 0);
  const rendered = messages.filter(m => m.message_type !== 'reaction');

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      <div className="flex-1 relative flex flex-col">
        <div className="bg-black/80 backdrop-blur p-3 flex items-center justify-between border-b border-white/10">
          <div className="min-w-0">
            <p className="font-bold truncate">{party.title}</p>
            <p className="text-xs text-white/60 truncate">{party.content_title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {timeLeft && <span className="text-xs flex items-center gap-1 bg-orange-500/20 text-orange-300 px-2 py-1 rounded"><Clock className="w-3 h-3" /> {timeLeft}</span>}
            <span className="text-xs flex items-center gap-1 bg-white/10 px-2 py-1 rounded"><Users className="w-3 h-3" /> {totalViewers}</span>
            <Button size="sm" variant="ghost" onClick={copyLink} title="Copy short link"><Share2 className="w-4 h-4" /></Button>
            <Button size="sm" variant="destructive" onClick={leave}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="flex-1 relative bg-black flex items-center justify-center">
          {video?.video_url ? (
            <video ref={videoRef} src={video.video_url} className="max-h-full max-w-full" controls={isHost} autoPlay playsInline
              onPlay={() => { if (isHost && party && !applyingRemote.current) (supabase.from('watch_parties') as any).update({ is_playing: true }).eq('id', party.id); }}
              onPause={() => { if (isHost && party && !applyingRemote.current) (supabase.from('watch_parties') as any).update({ is_playing: false }).eq('id', party.id); }}
            />
          ) : <p className="text-white/60">Video unavailable</p>}

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <AnimatePresence>
              {floating.map(f => (
                <motion.div key={f.id} initial={{ y: '100%', opacity: 1, scale: 0.5 }} animate={{ y: '-20%', opacity: 0, scale: 1.5 }} transition={{ duration: 3, ease: 'easeOut' }} className="absolute text-4xl" style={{ left: `${f.x}%`, bottom: 0 }}>{f.emoji}</motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-3 bg-black/80 flex justify-center gap-2 border-t border-white/10">
          {REACTION_EMOJIS.map(e => (
            <button key={e} onClick={() => react(e)} className="text-2xl hover:scale-125 transition-transform">{e}</button>
          ))}
        </div>
      </div>

      <div className="lg:w-80 border-l border-white/10 bg-black flex flex-col h-[50vh] lg:h-auto">
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <span className="font-medium text-sm">Live chat</span>
          {party.short_code && <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded">{party.short_code}</span>}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {rendered.map(m => {
            if (m.kind === 'ai') {
              return (
                <div key={m.id} className="text-sm flex items-start gap-2">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.avatar_seed}`} alt="" className="w-6 h-6 rounded-full shrink-0" />
                  <div className="min-w-0"><span className="text-white/80 font-medium">{m.display_name}</span>: <span className="text-white/90">{m.content}</span></div>
                </div>
              );
            }
            const prof = profilesCache.get(m.user_id);
            const name = m.user_id === user?.id ? 'You' : (prof?.display_name || 'Guest');
            const isMe = m.user_id === user?.id;
            return (
              <div key={m.id} className="text-sm flex items-start gap-2">
                {prof?.avatar_url && <img src={prof.avatar_url} alt="" className="w-6 h-6 rounded-full shrink-0" />}
                <div className="min-w-0">
                  {isMe ? <span className="text-primary font-medium">You</span> : (
                    <Link to={`/channel/${m.user_id}`} className="text-primary font-medium hover:underline">{name}</Link>
                  )}
                  <span className="text-white/90">: {m.content}</span>
                  <span className="text-[10px] text-white/40 ml-1">{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        <div className="p-3 border-t border-white/10 flex gap-2">
          <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={user ? 'Say something...' : 'Sign in to chat'} className="bg-white/5 border-white/10 text-white" />
          <Button size="icon" onClick={send}><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}
