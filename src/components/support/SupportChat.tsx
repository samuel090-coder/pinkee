import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Image as ImageIcon, Loader2, Headphones } from 'lucide-react';
import { useSupport } from '@/contexts/SupportContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
}

export const SupportChat = ({ open }: Props) => {
  const { close, messages, sending, sendMessage, aiEnabled } = useSupport();
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const handleFile = (f: File | null) => {
    setImageFile(f);
    if (f) {
      const r = new FileReader();
      r.onload = () => setImagePreview(r.result as string);
      r.readAsDataURL(f);
    } else setImagePreview(null);
  };

  const handleSend = async () => {
    if (!text.trim() && !imageFile) return;
    const t = text;
    const f = imageFile;
    setText('');
    handleFile(null);
    await sendMessage(t, f);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 bottom-0 lg:inset-auto lg:right-6 lg:bottom-24 z-[55] lg:w-[400px] lg:rounded-2xl bg-card border border-border shadow-2xl flex flex-col h-[80vh] lg:h-[600px] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Pinkee Support</p>
                <p className="text-[11px] opacity-80">{aiEnabled ? 'Online · Replies instantly' : 'Online · We reply soon'}</p>
              </div>
            </div>
            <button onClick={close} aria-label="Close" className="p-1 hover:bg-primary-foreground/10 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm pt-10">
                <Headphones className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Hi! How can we help you today?</p>
              </div>
            )}
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div key={m.id} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3 py-2 text-sm break-words',
                      isUser
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm',
                    )}
                  >
                    {m.image_url && (
                      <img src={m.image_url} alt="attachment" className="rounded-lg mb-1 max-w-full" />
                    )}
                    {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-2 flex gap-1">
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3 bg-card">
            {imagePreview && (
              <div className="relative inline-block mb-2">
                <img src={imagePreview} alt="" className="h-16 rounded-md" />
                <button onClick={() => handleFile(null)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} disabled={sending}>
                <ImageIcon className="w-5 h-5" />
              </Button>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sending}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={sending || (!text.trim() && !imageFile)} size="icon">
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
