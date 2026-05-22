import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Sparkles, MessageCircle, Image as ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface Conv {
  id: string;
  user_id: string;
  last_message_at: string;
  unread_admin: number;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

interface Msg {
  id: string;
  conversation_id: string;
  sender: 'user' | 'ai' | 'admin';
  content: string | null;
  image_url: string | null;
  created_at: string;
}

export const SupportInbox = () => {
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [polished, setPolished] = useState<string | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    const { data } = await supabase
      .from('support_conversations')
      .select('*')
      .order('last_message_at', { ascending: false });
    if (!data) return;
    const userIds = data.map((c: any) => c.user_id);
    const { data: profs } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, avatar_url')
      .in('user_id', userIds);
    const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
    setConversations(data.map((c: any) => ({ ...c, profile: map.get(c.user_id) ?? null })));
  };

  useEffect(() => {
    loadConvs();
    supabase.from('support_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) { setAiEnabled(!!data.ai_enabled); setSettingsId(data.id); }
    });
    const ch = supabase
      .channel('admin-support')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations' }, () => loadConvs())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (p: any) => {
        if (selectedIdRef.current === p.new.conversation_id) {
          setMessages((prev) => [...prev, p.new as Msg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    supabase
      .from('support_messages')
      .select('*')
      .eq('conversation_id', selectedId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data ?? []) as Msg[]));
    supabase.from('support_conversations').update({ unread_admin: 0 }).eq('id', selectedId).then(() => loadConvs());
  }, [selectedId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const toggleAi = async (val: boolean) => {
    setAiEnabled(val);
    if (settingsId) {
      await supabase.from('support_settings').update({ ai_enabled: val, updated_at: new Date().toISOString() }).eq('id', settingsId);
    } else {
      const { data } = await supabase.from('support_settings').insert({ ai_enabled: val }).select().single();
      if (data) setSettingsId(data.id);
    }
    toast({ title: val ? 'AI auto-reply enabled' : 'AI auto-reply disabled', description: val ? 'AI will handle messages.' : 'You will reply manually.' });
  };

  const handleFile = (f: File | null) => {
    setImageFile(f);
    if (f) {
      const r = new FileReader();
      r.onload = () => setImagePreview(r.result as string);
      r.readAsDataURL(f);
    } else setImagePreview(null);
  };

  const polishDraft = async () => {
    if (!draft.trim()) return;
    setPolishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('support-polish', { body: { draft } });
      if (error) throw error;
      setPolished(data.polished);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Polish failed', description: e.message });
    } finally {
      setPolishing(false);
    }
  };

  const sendReply = async () => {
    if (!selectedId) return;
    const conv = conversations.find((c) => c.id === selectedId);
    if (!conv) return;
    const finalText = polished ?? draft;
    if (!finalText.trim() && !imageFile) return;
    setSending(true);
    try {
      let image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'png';
        const path = `${conv.user_id}/admin-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('support-attachments').upload(path, imageFile);
        if (!upErr) {
          const { data: signed } = await supabase.storage.from('support-attachments').createSignedUrl(path, 60 * 60 * 24 * 365);
          image_url = signed?.signedUrl ?? null;
        }
      }
      await supabase.from('support_messages').insert({
        conversation_id: selectedId,
        sender: 'admin',
        content: finalText || null,
        image_url,
      });
      await supabase.from('support_conversations').update({
        last_message_at: new Date().toISOString(),
        unread_user: (conv as any).unread_user ? (conv as any).unread_user + 1 : 1,
      }).eq('id', selectedId);
      // Notify user
      await supabase.from('user_notifications').insert({
        user_id: conv.user_id,
        type: 'support',
        title: 'New reply from Pinkee Support',
        body: finalText.slice(0, 100) || 'You received an image',
        link: '/',
      });
      setDraft('');
      setPolished(null);
      handleFile(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Send failed', description: e.message });
    } finally {
      setSending(false);
    }
  };

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 glass rounded-xl">
        <div>
          <h2 className="text-xl font-bold">Support Inbox</h2>
          <p className="text-sm text-muted-foreground">Manage user conversations</p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="ai-toggle" className="text-sm">AI auto-reply</Label>
          <Switch id="ai-toggle" checked={aiEnabled} onCheckedChange={toggleAi} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
        {/* Convs list */}
        <div className="glass rounded-xl overflow-y-auto">
          {conversations.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              No conversations yet
            </div>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                'w-full p-3 flex items-center gap-3 border-b border-border hover:bg-accent/50 text-left',
                selectedId === c.id && 'bg-accent',
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0">
                {c.profile?.avatar_url ? <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (c.profile?.display_name?.[0] ?? 'U')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{c.profile?.display_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}</p>
              </div>
              {c.unread_admin > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full w-5 h-5 flex items-center justify-center">{c.unread_admin}</span>
              )}
            </button>
          ))}
        </div>

        {/* Thread */}
        <div className="md:col-span-2 glass rounded-xl flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a conversation</div>
          ) : (
            <>
              <div className="p-3 border-b border-border">
                <p className="font-medium">{selected.profile?.display_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">@{selected.profile?.username || 'user'}</p>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div key={m.id} className={cn('flex', isUser ? 'justify-start' : 'justify-end')}>
                      <div className={cn(
                        'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                        isUser ? 'bg-muted' : m.sender === 'ai' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground',
                      )}>
                        {m.image_url && <img src={m.image_url} className="rounded-lg mb-1 max-w-full" alt="" />}
                        {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                        <p className="text-[10px] opacity-70 mt-1">
                          {m.sender === 'ai' ? 'AI' : m.sender === 'admin' ? 'You' : 'User'} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-border space-y-2">
                {imagePreview && (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="" className="h-16 rounded-md" />
                    <button onClick={() => handleFile(null)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {polished && (
                  <div className="p-2 bg-accent/30 rounded-md text-xs">
                    <p className="font-semibold mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Polished version (will be sent):</p>
                    <p className="whitespace-pre-wrap">{polished}</p>
                    <button onClick={() => setPolished(null)} className="text-primary text-xs mt-1">Use my original instead</button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={fileRef} type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} className="hidden" />
                  <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()}><ImageIcon className="w-5 h-5" /></Button>
                  <Input
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); setPolished(null); }}
                    placeholder="Type your reply (will be auto-polished)…"
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={polishDraft} disabled={polishing || !draft.trim()} title="Polish grammar">
                    {polishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  </Button>
                  <Button onClick={sendReply} disabled={sending || (!draft.trim() && !imageFile)}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Tip: Click ✨ to polish grammar before sending. Or just hit send — original text will go through.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
