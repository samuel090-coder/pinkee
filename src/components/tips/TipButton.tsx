import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TipModal } from './TipModal';

interface Props {
  creatorId: string;
  creatorName: string;
  videoId?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  label?: string;
}

export function TipButton({ creatorId, creatorName, videoId, variant = 'default', size = 'sm', className, label = 'Tip' }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} className={`gap-1.5 ${className || ''}`} onClick={() => setOpen(true)}>
        <Heart className="w-4 h-4" />
        {label}
      </Button>
      <TipModal open={open} onOpenChange={setOpen} creatorId={creatorId} creatorName={creatorName} videoId={videoId} />
    </>
  );
}
