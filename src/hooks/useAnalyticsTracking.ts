import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'pinkee:analytics-session';

function getSessionId(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return 'unknown';
  }
}

function detectDevice(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

/**
 * Mount once at app root. Logs every route change to `page_views`.
 * Fire-and-forget — never blocks UI.
 */
export function usePageViewTracking() {
  const location = useLocation();
  const lastPath = useRef<string>('');

  useEffect(() => {
    const path = location.pathname;
    if (path === lastPath.current) return;
    lastPath.current = path;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('page_views' as any).insert({
          user_id: user?.id ?? null,
          path,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent.slice(0, 300),
          device: detectDevice(),
          session_id: getSessionId(),
        });
      } catch {
        // analytics never breaks the app
      }
    })();
  }, [location.pathname]);
}

interface WatchTrackerArgs {
  videoId?: string | null;
  tmdbId?: number | null;
  mediaType?: 'movie' | 'tv' | 'short' | 'video' | null;
  title?: string | null;
  /** % of total length that counts as "watched / threshold reached" (default 0.5 = 50%). */
  thresholdPercent?: number;
}

/**
 * Returns helpers to record progress for an HTML5 <video>.
 * Pass `videoRef.current` periodically (already wired to `timeupdate` here).
 */
export function useVideoWatchTracking(
  videoRef: React.RefObject<HTMLVideoElement>,
  args: WatchTrackerArgs,
) {
  const lastReport = useRef<number>(0);
  const reportedCompletion = useRef(false);
  const reportedThreshold = useRef(false);
  const threshold = args.thresholdPercent ?? 0.5;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    reportedCompletion.current = false;
    reportedThreshold.current = false;
    lastReport.current = 0;

    const flush = async (final = false) => {
      try {
        const watched = Math.floor(v.currentTime || 0);
        const total = Math.floor(v.duration || 0) || null;
        const pct = total ? Math.min(1, watched / total) : 0;
        const reached = pct >= threshold;
        const completed = pct >= 0.9 || final;

        // Only insert at thresholds to avoid spam: 25%, 50%, 75%, end
        const milestones = [0.25, 0.5, 0.75, 1];
        const cross = milestones.find(m => pct >= m && lastReport.current < m);
        if (!cross && !final) return;
        lastReport.current = cross ?? lastReport.current;

        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('video_watch_events' as any).insert({
          user_id: user?.id ?? null,
          video_id: args.videoId ?? null,
          tmdb_id: args.tmdbId ?? null,
          media_type: args.mediaType ?? null,
          title: args.title ?? null,
          watched_seconds: watched,
          total_seconds: total,
          percent_watched: Number(pct.toFixed(3)),
          reached_threshold: reached,
          completed,
          session_id: getSessionId(),
        });

        if (reached) reportedThreshold.current = true;
        if (completed) reportedCompletion.current = true;
      } catch {
        // ignore
      }
    };

    const onTime = () => { void flush(false); };
    const onEnded = () => { void flush(true); };

    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', onEnded);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', onEnded);
      // flush a final partial-watch event when unmounting
      void flush(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.videoId, args.tmdbId, args.title]);
}
