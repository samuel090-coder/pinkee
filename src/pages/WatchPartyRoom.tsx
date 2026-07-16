import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Users, Copy, LogOut, Loader2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo } from '@/contexts/VideoContext';
import { toast } from '@/hooks/use-toast';

const REACTION_EMOJIS = ['❤️', '😂', '🔥', '😮', '👏', '💯'];

interface Party {
  id: string; host_id: string; title: string; content_type: string; content_ref: string;
  content_title: string | null; is_public: boolean; current_time_seconds: number;
  is_playing: boolean; participant_count: number; is_active: boolean;
}
interface Msg { id: string; user_id: string; content: string; message_type: string; emoji: string | null; created_at: string; }

export default function WatchPartyRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const { videos } = useVideo();
  const navigate = useNavigate();
  const [party, setParty] = useState<Party | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [floating, setFloating] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const applyingRemote = useRef(false);

  const video = useMemo(() => videos.find(v => v.id === party?.content_ref), [videos, party?.content_ref]);
  const isHost = user?.id === party?.host_id;

  // Load party + join + subscribe
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase.from('watch_parties').select('*').eq('id', id).maybeSingle();
      if (!mounted) return;
      if (!data) { toast({ title: 'Party not found', variant: 'destructive' }); navigate('/watch-parties'); return; }
      setParty(data as Party);
      if (user) {
        await supabase.from('watch_party_participants').upsert({ party_id: id, user_id: user.id, left_at: null }, { onConflict: 'party_id,user_id' });
        // bump participant count
        const { count } = await supabase.from('watch_party_participants').select('*', { count: 'exact', head: true }).eq('party_id', id).is('left_at', null);
        await supabase.from('watch_parties').update({ participant_count: count || 1 }).eq('id', id);
      }
      const { data: msgs } = await supabase.from('watch_party_messages').select('*').eq('party_id', id).order('created_at', { ascending: true }).limit(200);
      setMessages((msgs || []) as Msg[]);
    })();

    const ch = supabase.channel(`party:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watch_party_messages', filter: `party_id=eq.${id}` }, (p) => {
        if (p.eventType === 'INSERT') {
          const m = p.new as Msg;
          setMessages(prev => [...prev, m]);
          if (m.message_type === 'reaction' && m.emoji) {
            const fid = Math.random().toString(36).slice(2);
            setFloating(f => [...f, { id: fid, emoji: m.emoji!, x: 20 + Math.random() * 60 }]);
            setTimeout(() => setFloating(f => f.filter(x => x.id !== fid)), 3000);
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'watch_parties', filter: `id=eq.${id}` }, (p) => {
        const next = p.new as Party;
        setParty(next);
        if (!isHost && videoRef.current) {
          const drift = Math.abs(videoRef.current.currentTime - next.current_time_seconds);
          if (drift > 2) {
            applyingRemote.current = true;
            videoRef.current.currentTime = next.current_time_seconds;
            setTimeout(() => { applyingRemote.current = false; }, 300);
          }
          if (next.is_playing && videoRef.current.paused) videoRef.current.play().catch(() => {});
          if (!next.is_playing && !videoRef.current.paused) videoRef.current.pause();
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
      if (user && id) supabase.from('watch_party_participants').update({ left_at: new Date().toISOString() }).eq('party_id', id).eq('user_id', user.id);
    };
  }, [id, user?.id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  // Host: broadcast state every 3s
  useEffect(() => {
    if (!isHost || !id) return;
    const t = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      supabase.from('watch_parties').update({
        current_time_seconds: v.currentTime,
        is_playing: !v.paused,
        last_sync_at: new Date().toISOString(),
      }).eq('id', id);
    }, 3000);
    return () => clearInterval(t);
  }, [isHost, id]);

  const send = async () => {
    if (!text.trim() || !user || !id) return;
    await supabase.from('watch_party_messages').insert({ party_id: id, user_id: user.id, content: text.trim(), message_type: 'chat' });
    setText('');
  };
  const react = async (emoji: string) => {
    if (!user || !id) return;
    await supabase.from('watch_party_messages').insert({ party_id: id, user_id: user.id, content: emoji, emoji, message_type: 'reaction' });
  };
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link copied!' });
  };
  const leave = async () => {
    if (isHost && id) await supabase.from('watch_parties').update({ is_active: false, ended_at: new Date().toISOString() }).eq('id', id);
    navigate('/watch-parties');
  };

  if (!party) return <div className="flex items-center justify-center h-screen bg-black"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Video */}
      <div className="flex-1 relative flex flex-col">
        <div className="bg-black/80 backdrop-blur p-3 flex items-center justify-between border-b border-white/10">
          <div className="min-w-0">
            <p className="font-bold truncate">{party.title}</p>
            <p className="text-xs text-white/60 truncate">{party.content_title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs flex items-center gap-1 bg-white/10 px-2 py-1 rounded"><Users className="w-3 h-3" /> {party.participant_count}</span>
            <Button size="sm" variant="ghost" onClick={copyLink}><Copy className="w-4 h-4" /></Button>
            <Button size="sm" variant="destructive" onClick={leave}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="flex-1 relative bg-black flex items-center justify-center">
          {video?.video_url ? (
            <video
              ref={videoRef}
              src={video.video_url}
              className="max-h-full max-w-full"
              controls={isHost}
              autoPlay
              playsInline
              onPlay={() => { if (isHost && id && !applyingRemote.current) supabase.from('watch_parties').update({ is_playing: true }).eq('id', id); }}
              onPause={() => { if (isHost && id && !applyingRemote.current) supabase.from('watch_parties').update({ is_playing: false }).eq('id', id); }}
            />
          ) : (
            <p className="text-white/60">Video unavailable</p>
          )}

          {/* Floating reactions */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <AnimatePresence>
              {floating.map(f => (
                <motion.div key={f.id} initial={{ y: '100%', opacity: 1, scale: 0.5 }} animate={{ y: '-20%', opacity: 0, scale: 1.5 }}
                  transition={{ duration: 3, ease: 'easeOut' }}
                  className="absolute text-4xl" style={{ left: `${f.x}%`, bottom: 0 }}>
                  {f.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Reaction bar */}
        <div className="p-3 bg-black/80 flex justify-center gap-2 border-t border-white/10">
          {REACTION_EMOJIS.map(e => (
            <button key={e} onClick={() => react(e)} className="text-2xl hover:scale-125 transition-transform">{e}</button>
          ))}
        </div>
      </div>

      {/* Chat sidebar */}
      <div className="lg:w-80 border-l border-white/10 bg-black flex flex-col h-[50vh] lg:h-auto">
        <div className="p-3 border-b border-white/10 font-medium text-sm">Live chat</div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.filter(m => m.message_type !== 'reaction').map(m => (
            <div key={m.id} className="text-sm">
              <span className="text-primary font-medium">{m.user_id === user?.id ? 'You' : `User ${m.user_id.slice(0, 6)}`}: </span>
              <span className="text-white/90">{m.content}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="p-3 border-t border-white/10 flex gap-2">
          <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Say something..." className="bg-white/5 border-white/10 text-white" />
          <Button size="icon" onClick={send}><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}
