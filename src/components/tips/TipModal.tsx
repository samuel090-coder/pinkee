import { useState } from 'react';
import { Heart, Loader2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const PRESETS = [100, 500, 1000, 2000, 5000, 10000];

const SUPER_CHAT_COLORS: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  yellow: 'from-yellow-500 to-yellow-600',
  orange: 'from-orange-500 to-orange-600',
  magenta: 'from-fuchsia-500 to-pink-600',
  red: 'from-red-500 to-red-700',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  creatorId: string;
  creatorName: string;
  videoId?: string;
}

export function TipModal({ open, onOpenChange, creatorId, creatorName, videoId }: Props) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(500);
  const [message, setMessage] = useState('');
  const [isSuperChat, setIsSuperChat] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!user) {
      toast({ title: 'Please sign in to tip', variant: 'destructive' });
      return;
    }
    if (amount < 50) {
      toast({ title: 'Minimum tip is ₦50', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('send_creator_tip', {
        _to_creator_id: creatorId,
        _amount: amount,
        _video_id: videoId || null,
        _message: message || null,
        _is_super_chat: isSuperChat,
      });
      if (error) throw error;
      const d = data as any;
      if (!d?.ok) {
        toast({ title: 'Could not send tip', description: d?.error === 'insufficient_balance' ? 'Top up your wallet first.' : d?.error, variant: 'destructive' });
      } else {
        toast({ title: '💝 Tip sent!', description: `${creatorName} received ₦${d.creator_amount}.` });
        onOpenChange(false);
        setMessage(''); setAmount(500); setIsSuperChat(false);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const previewColor = amount >= 10000 ? 'red' : amount >= 5000 ? 'magenta' : amount >= 2000 ? 'orange' : amount >= 1000 ? 'yellow' : amount >= 500 ? 'green' : 'blue';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Heart className="w-5 h-5 text-pink-500 fill-pink-500" /> Tip {creatorName}</DialogTitle>
          <DialogDescription>Support the creator directly from your wallet. 10% platform fee.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map(p => (
              <Button key={p} variant={amount === p ? 'default' : 'outline'} size="sm" onClick={() => setAmount(p)}>
                ₦{p.toLocaleString()}
              </Button>
            ))}
          </div>
          <div>
            <Label>Custom amount (₦)</Label>
            <Input type="number" min={50} value={amount} onChange={e => setAmount(Number(e.target.value) || 0)} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium text-sm flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-yellow-500" /> Super Chat</p>
              <p className="text-xs text-muted-foreground">Pin your message with a colored highlight</p>
            </div>
            <Switch checked={isSuperChat} onCheckedChange={setIsSuperChat} />
          </div>

          <div>
            <Label>Message (optional)</Label>
            <Textarea maxLength={200} value={message} onChange={e => setMessage(e.target.value)} placeholder="Say something nice..." rows={2} />
          </div>

          {isSuperChat && message && (
            <div className={`bg-gradient-to-r ${SUPER_CHAT_COLORS[previewColor]} rounded-lg p-3 text-white`}>
              <p className="font-bold text-sm">₦{amount.toLocaleString()}</p>
              <p className="text-sm">{message}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground border-t pt-3 flex justify-between">
            <span>Creator receives</span>
            <span className="font-medium text-foreground">₦{Math.floor(amount * 0.9).toLocaleString()}</span>
          </div>

          <Button className="w-full" onClick={send} disabled={loading || amount < 50}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Heart className="w-4 h-4 mr-2" />}
            Send ₦{amount.toLocaleString()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
