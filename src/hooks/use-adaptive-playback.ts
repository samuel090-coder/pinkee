import { useEffect, RefObject } from 'react';
import Hls from 'hls.js';

/**
 * Adaptive-bitrate playback for uploaded videos.
 *
 * - If `src` ends in `.m3u8`, attaches HLS.js (or uses native HLS on Safari).
 * - Otherwise the browser plays the regular MP4/WebM directly via the native `src` attribute.
 *
 * Usage:
 *   <video ref={ref} ... />  // do NOT set `src` on the element
 *   useAdaptivePlayback(ref, video.video_url);
 *
 * Falls back gracefully on errors and tries to recover network/media errors automatically.
 */
export function useAdaptivePlayback(
  videoRef: RefObject<HTMLVideoElement>,
  src: string | null | undefined,
) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const isHls = /\.m3u8(\?|$)/i.test(src);

    // Native MP4/WebM (or Safari native HLS)
    if (!isHls || video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    if (!Hls.isSupported()) {
      // Last-resort fallback: assign as plain src and hope the browser copes
      video.src = src;
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 30,
    });
    hls.loadSource(src);
    hls.attachMedia(video);

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError();
          break;
        default:
          hls.destroy();
          break;
      }
    });

    return () => {
      hls.destroy();
    };
  }, [src, videoRef]);
}
