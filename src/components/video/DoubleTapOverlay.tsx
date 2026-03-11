import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipBack, SkipForward } from 'lucide-react';

interface DoubleTapOverlayProps {
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onSingleTap: () => void;
  children: React.ReactNode;
}

export function DoubleTapOverlay({ onDoubleTapLeft, onDoubleTapRight, onSingleTap, children }: DoubleTapOverlayProps) {
  const [ripple, setRipple] = useState<{ side: 'left' | 'right'; key: number } | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' | null }>({ time: 0, side: null });
  const rippleKeyRef = useRef(0);

  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    let clientX: number;
    
    if ('touches' in e) {
      clientX = e.changedTouches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    
    const relativeX = clientX - rect.left;
    const side = relativeX < rect.width / 2 ? 'left' : 'right';
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current.time;

    if (timeSinceLastTap < 300 && lastTapRef.current.side === side) {
      // Double tap detected
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      lastTapRef.current = { time: 0, side: null };

      rippleKeyRef.current += 1;
      setRipple({ side, key: rippleKeyRef.current });
      setTimeout(() => setRipple(null), 600);

      if (side === 'left') onDoubleTapLeft();
      else onDoubleTapRight();
    } else {
      lastTapRef.current = { time: now, side };
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        onSingleTap();
        lastTapRef.current = { time: 0, side: null };
      }, 300);
    }
  }, [onDoubleTapLeft, onDoubleTapRight, onSingleTap]);

  return (
    <div className="relative w-full h-full" onClick={handleTap}>
      {children}

      <AnimatePresence>
        {ripple && (
          <motion.div
            key={ripple.key}
            initial={{ opacity: 0.7, scale: 0.5 }}
            animate={{ opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none ${
              ripple.side === 'left' ? 'left-[15%]' : 'right-[15%]'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {ripple.side === 'left' ? (
                <div className="flex items-center gap-1 text-white text-sm font-medium">
                  <SkipBack className="w-5 h-5" />
                  10s
                </div>
              ) : (
                <div className="flex items-center gap-1 text-white text-sm font-medium">
                  10s
                  <SkipForward className="w-5 h-5" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
