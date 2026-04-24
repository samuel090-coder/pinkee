import { useState, useEffect, useRef } from 'react';
import { Volume2, MousePointerClick, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IframePlayerShieldProps {
  src: string;
  iframeKey?: string;
  className?: string;
  /** When true, briefly disables the shield so user can press a control inside the iframe */
  unlockDurationMs?: number;
}

/**
 * Wraps a third-party streaming iframe with:
 * - A transparent click-shield that intercepts taps so hidden ad-overlays
 *   inside the iframe can't trigger redirects.
 * - Two unlock buttons: "Volume" (briefly unlocks so the user can tap the
 *   player's own volume control) and "Controls" (toggles the shield off).
 *
 * Note: hardware volume keys on the user's phone always control system media
 * volume natively — no JS is needed for that. The iframe just has to be
 * playing (unmuted) for the keys to affect it.
 */
export function IframePlayerShield({
  src,
  iframeKey,
  className = '',
  unlockDurationMs = 4000,
}: IframePlayerShieldProps) {
  const [shieldActive, setShieldActive] = useState(true);
  const [unlockHint, setUnlockHint] = useState<string | null>(null);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    };
  }, []);

  const temporaryUnlock = (label: string) => {
    setShieldActive(false);
    setUnlockHint(label);
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => {
      setShieldActive(true);
      setUnlockHint(null);
    }, unlockDurationMs);
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <iframe
        key={iframeKey}
        src={src}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        referrerPolicy="no-referrer"
      />

      {/* Transparent click-shield — blocks ad-redirect taps */}
      {shieldActive && (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed"
          style={{ background: 'transparent' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setUnlockHint('Tap protected. Use the Volume or Controls button below.');
            if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
            unlockTimerRef.current = setTimeout(() => setUnlockHint(null), 2200);
          }}
          aria-hidden="true"
        />
      )}

      {/* Top-left status badge */}
      <div className="absolute top-2 left-2 z-20 pointer-events-none">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm ${
            shieldActive
              ? 'bg-primary/80 text-primary-foreground'
              : 'bg-amber-500/80 text-black'
          }`}
        >
          {shieldActive ? (
            <>
              <Lock className="w-3 h-3" /> Tap-shield ON
            </>
          ) : (
            <>
              <MousePointerClick className="w-3 h-3" /> Unlocked
            </>
          )}
        </span>
      </div>

      {/* Bottom hint toast */}
      {unlockHint && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="px-3 py-1.5 rounded-full bg-background/90 text-foreground text-[11px] shadow-lg">
            {unlockHint}
          </span>
        </div>
      )}

      {/* Floating quick-action buttons */}
      <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 px-2 gap-1 text-xs shadow-lg"
          onClick={() => temporaryUnlock('Tap the volume icon inside the player now')}
          title="Enable volume controls"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant={shieldActive ? 'secondary' : 'default'}
          className="h-8 px-2 gap-1 text-xs shadow-lg"
          onClick={() => {
            if (shieldActive) {
              setShieldActive(false);
              setUnlockHint('Controls unlocked — tap carefully');
              if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
              unlockTimerRef.current = setTimeout(() => setUnlockHint(null), 2000);
            } else {
              setShieldActive(true);
              setUnlockHint('Tap-shield re-enabled');
              if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
              unlockTimerRef.current = setTimeout(() => setUnlockHint(null), 1500);
            }
          }}
          title={shieldActive ? 'Unlock player controls' : 'Lock tap-shield'}
        >
          {shieldActive ? <MousePointerClick className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}
