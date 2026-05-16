import { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, MousePointerClick, Lock, Loader2, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logStreamFailure, SERVER_LOAD_TIMEOUT_MS } from '@/lib/streaming';

interface ServerLike {
  name: string;
  build: () => string;
}

interface IframePlayerShieldProps {
  /** Ordered list of server candidates. Player auto-advances on failure. */
  servers: ServerLike[];
  /** Current chosen index (controlled by parent). */
  activeIndex: number;
  /** Notified when the player decides to switch (auto-fallback or all-failed). */
  onActiveIndexChange: (index: number) => void;
  /** For backend logging. */
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  season?: number;
  episode?: number;
  /** Cache-bust key for the iframe (parent supplies a stable string). */
  iframeKey?: string;
  className?: string;
  unlockDurationMs?: number;
}

/**
 * Wraps a third-party streaming iframe with:
 *  - Click-shield over the top portion (blocks ad redirects, leaves bottom 64px for player controls)
 *  - Auto health check: if `iframe.onload` doesn't fire within SERVER_LOAD_TIMEOUT_MS,
 *    assumes the provider is dead and rotates to the next server.
 *  - Logs each failure to `public.stream_failures` for provider auditing.
 *  - "Stream not available" UI state when all servers have been tried.
 *  - Manual "retry from first server" button.
 */
export function IframePlayerShield({
  servers,
  activeIndex,
  onActiveIndexChange,
  mediaType,
  tmdbId,
  season,
  episode,
  iframeKey,
  className = '',
  unlockDurationMs = 4000,
}: IframePlayerShieldProps) {
  const [shieldActive, setShieldActive] = useState(true);
  const [unlockHint, setUnlockHint] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'all-failed'>('loading');
  const [attemptedNames, setAttemptedNames] = useState<string[]>([]);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = servers[activeIndex];
  const currentSrc = current ? current.build() : '';

  // Reset state when source changes
  useEffect(() => {
    if (!current) return;
    setLoadState('loading');
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);

    loadTimerRef.current = setTimeout(() => {
      handleFailure(`timeout after ${SERVER_LOAD_TIMEOUT_MS}ms`);
    }, SERVER_LOAD_TIMEOUT_MS);

    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSrc, iframeKey]);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, []);

  const handleFailure = useCallback((reason: string) => {
    if (!current) return;
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);

    void logStreamFailure({
      serverName: current.name,
      mediaType,
      tmdbId,
      season,
      episode,
      embedUrl: currentSrc,
      errorReason: reason,
    });

    setAttemptedNames((prev) => (prev.includes(current.name) ? prev : [...prev, current.name]));

    // Find next un-attempted server
    const nextIdx = servers.findIndex((s, i) => i !== activeIndex && !attemptedNames.includes(s.name) && s.name !== current.name);
    if (nextIdx >= 0) {
      onActiveIndexChange(nextIdx);
    } else {
      setLoadState('all-failed');
    }
  }, [activeIndex, attemptedNames, current, currentSrc, episode, mediaType, onActiveIndexChange, season, servers, tmdbId]);

  const handleIframeLoad = () => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    setLoadState('ready');
  };

  const handleIframeError = () => {
    handleFailure('iframe error event');
  };

  const retryAll = () => {
    setAttemptedNames([]);
    setLoadState('loading');
    onActiveIndexChange(0);
  };

  const temporaryUnlock = (label: string) => {
    setShieldActive(false);
    setUnlockHint(label);
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => {
      setShieldActive(true);
      setUnlockHint(null);
    }, unlockDurationMs);
  };

  // Suggest the next provider not yet attempted
  const nextSuggestions = servers
    .filter((s) => !attemptedNames.includes(s.name))
    .slice(0, 3);

  // Detect nested-iframe context (e.g. Lovable preview). VidLink and similar
  // providers often refuse to render inside a sandboxed parent frame and show a
  // "please disable sandbox" warning. In that case we surface a clear CTA to
  // open the stream in a new tab.
  const isNestedFrame = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <div className={`relative w-full h-full ${className}`}>
      {currentSrc && (
        <iframe
          key={`${iframeKey}-${activeIndex}`}
          src={currentSrc}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
          referrerPolicy="origin"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}

      {/* Nested-frame banner: VidLink blocks playback inside Lovable's preview iframe.
          On the published site this won't trigger. */}
      {isNestedFrame && currentSrc && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 max-w-[90%]">
          <a
            href={currentSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold shadow-lg"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Stream blocked in preview — open in new tab
          </a>
        </div>
      )}

      {/* Loading overlay while we wait for the iframe load event */}
      {loadState === 'loading' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/85 text-foreground pointer-events-none">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">
            Connecting to <span className="text-foreground font-semibold">{current?.name ?? '—'}</span>…
          </p>
          {attemptedNames.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Skipped: {attemptedNames.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* All-failed troubleshooting screen */}
      {loadState === 'all-failed' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/95 text-foreground p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
          <div>
            <h3 className="text-base font-semibold">Stream not available right now</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              We tried {attemptedNames.length} provider{attemptedNames.length === 1 ? '' : 's'} and none of them returned a working stream for this title.
            </p>
          </div>

          <ul className="text-[11px] text-muted-foreground text-left space-y-1 max-w-xs">
            <li>• Very new releases may not be on free providers yet — try again in a day or two.</li>
            <li>• Disable VPN / proxy and reload.</li>
            <li>• Use Brave or install uBlock Origin to dodge popup ads that block playback.</li>
            <li>• Pick a different server from the row below the player.</li>
          </ul>

          {nextSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-[10px] text-muted-foreground mr-1">Try next:</span>
              {nextSuggestions.map((s) => {
                const idx = servers.findIndex((x) => x.name === s.name);
                return (
                  <Button
                    key={s.name}
                    size="sm"
                    variant="secondary"
                    className="h-7 text-[11px] px-2"
                    onClick={() => {
                      setAttemptedNames((prev) => prev.filter((n) => n !== s.name));
                      setLoadState('loading');
                      onActiveIndexChange(idx);
                    }}
                  >
                    {s.name}
                  </Button>
                );
              })}
            </div>
          )}

          <Button size="sm" className="gap-1.5 mt-1" onClick={retryAll}>
            <RefreshCw className="w-3.5 h-3.5" /> Retry from first server
          </Button>
        </div>
      )}

      {/* Click-shield (only when player is ready and shield is on) */}
      {loadState === 'ready' && shieldActive && (
        <div
          className="absolute left-0 right-0 top-0 z-10 cursor-not-allowed"
          style={{ background: 'transparent', bottom: '64px' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setUnlockHint('Tap blocked here. Use the bottom of the player for volume / play.');
            if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
            unlockTimerRef.current = setTimeout(() => setUnlockHint(null), 2200);
          }}
          aria-hidden="true"
        />
      )}

      {/* Status badge */}
      <div className="absolute top-2 left-2 z-20 pointer-events-none">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm ${
            loadState === 'all-failed'
              ? 'bg-destructive/80 text-destructive-foreground'
              : shieldActive
              ? 'bg-primary/80 text-primary-foreground'
              : 'bg-amber-500/80 text-black'
          }`}
        >
          {loadState === 'all-failed' ? (
            <>
              <AlertTriangle className="w-3 h-3" /> All servers failed
            </>
          ) : shieldActive ? (
            <>
              <Lock className="w-3 h-3" /> Shield ON · Volume free
            </>
          ) : (
            <>
              <MousePointerClick className="w-3 h-3" /> Unlocked
            </>
          )}
        </span>
      </div>

      {/* Bottom hint toast */}
      {unlockHint && loadState === 'ready' && (
        <div className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none" style={{ bottom: '72px' }}>
          <span className="px-3 py-1.5 rounded-full bg-background/90 text-foreground text-[11px] shadow-lg">
            {unlockHint}
          </span>
        </div>
      )}

      {/* Floating quick-action buttons */}
      {loadState === 'ready' && (
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 px-2 gap-1 text-xs shadow-lg"
            onClick={() => temporaryUnlock('Tap the speaker icon at the bottom of the player to unmute')}
            title="Enable volume controls"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Unmute</span>
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
            {shieldActive ? <MousePointerClick className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      )}

      {/* Visual indicator of the always-tappable bottom strip */}
      {loadState === 'ready' && shieldActive && (
        <div
          className="absolute left-0 right-0 bottom-0 z-[5] pointer-events-none border-t border-primary/30"
          style={{ height: '64px', background: 'linear-gradient(to top, hsl(var(--primary) / 0.08), transparent)' }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
