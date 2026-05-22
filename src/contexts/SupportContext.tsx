import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender: 'user' | 'ai' | 'admin';
  content: string | null;
  image_url: string | null;
  is_ai_generated: boolean;
  created_at: string;
}

interface SupportContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: SupportMessage[];
  sending: boolean;
  unreadCount: number;
  sendMessage: (text: string, imageFile?: File | null) => Promise<void>;
  markRead: () => Promise<void>;
  aiEnabled: boolean;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

export const SupportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [aiEnabled, setAiEnabled] = useState(true);
  const channelRef = useRef<any>(null);

  // Load conversation + messages on auth
  useEffect(() => {
    if (!user) {
      setConversationId(null);
      setMessages([]);
      setUnreadCount(0);
      return;
    }
    (async () => {
      let { data: conv } = await supabase
        .from('support_conversations')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!conv) {
        const { data: created } = await supabase
          .from('support_conversations')
          .insert({ user_id: user.id })
          .select()
          .single();
        conv = created;
      }
      if (!conv) return;

      setConversationId(conv.id);
      setUnreadCount(conv.unread_user ?? 0);

      const { data: msgs } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });
      setMessages((msgs ?? []) as SupportMessage[]);

      // Realtime
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = supabase
        .channel(`support-${conv.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${conv.id}` },
          (payload) => {
            const newMsg = payload.new as SupportMessage;
            setMessages((prev) => (prev.find((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
            if (newMsg.sender !== 'user' && !isOpenRef.current) {
              setUnreadCount((c) => c + 1);
            }
          },
        )
        .subscribe();
    })();

    // AI toggle
    supabase.from('support_settings').select('ai_enabled').limit(1).maybeSingle().then(({ data }) => {
      if (data) setAiEnabled(!!data.ai_enabled);
    });
    const settingsChannel = supabase
      .channel('support-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_settings' }, (payload: any) => {
        if (payload.new) setAiEnabled(!!payload.new.ai_enabled);
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      supabase.removeChannel(settingsChannel);
    };
  }, [user]);

  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const markRead = useCallback(async () => {
    if (!conversationId) return;
    setUnreadCount(0);
    await supabase.from('support_conversations').update({ unread_user: 0 }).eq('id', conversationId);
  }, [conversationId]);

  const open = useCallback(() => {
    setIsOpen(true);
    markRead();
  }, [markRead]);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((o) => {
    if (!o) markRead();
    return !o;
  }), [markRead]);

  const sendMessage = useCallback(async (text: string, imageFile?: File | null) => {
    if (!user || (!text.trim() && !imageFile)) return;
    setSending(true);
    try {
      let image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() || 'png';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('support-attachments').upload(path, imageFile);
        if (!upErr) {
          const { data: signed } = await supabase.storage.from('support-attachments').createSignedUrl(path, 60 * 60 * 24 * 365);
          image_url = signed?.signedUrl ?? null;
        }
      }
      await supabase.functions.invoke('support-ai', {
        body: { user_message: text, image_url },
      });
    } catch (e) {
      console.error('sendMessage error', e);
    } finally {
      setSending(false);
    }
  }, [user]);

  return (
    <SupportContext.Provider value={{ isOpen, open, close, toggle, messages, sending, unreadCount, sendMessage, markRead, aiEnabled }}>
      {children}
    </SupportContext.Provider>
  );
};

export const useSupport = () => {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport must be used within SupportProvider');
  return ctx;
};
