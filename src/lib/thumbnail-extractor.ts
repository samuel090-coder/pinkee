/**
 * Browser-side video thumbnail extraction.
 *
 * Samples N frames from a video file, scores each frame by a cheap visual
 * quality heuristic (brightness + variance — avoids black, white, blurry,
 * and flat frames), and returns the best one as a Blob ready for upload.
 *
 * Also returns the full set of candidates so callers can show a "pick a
 * frame" UI later if desired.
 */

export interface ThumbnailCandidate {
  blob: Blob;
  dataUrl: string;
  timestamp: number;
  score: number;
  width: number;
  height: number;
}

export interface ExtractOptions {
  frames?: number;          // how many candidates to sample
  maxWidth?: number;        // output width cap
  quality?: number;         // jpeg quality 0..1
}

/**
 * Score a frame: prefer mid-brightness + high variance (interesting/sharp).
 * Reject near-black, near-white, and very flat frames.
 */
function scoreImageData(img: ImageData): number {
  const { data, width, height } = img;
  const stride = 4 * 8; // sample every 8th pixel to stay fast
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += stride) {
    // luma
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += y;
    sumSq += y * y;
    n++;
  }
  if (n === 0) return 0;
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;

  // brightness window: 30..225 sweet spot
  let brightnessScore = 1;
  if (mean < 30 || mean > 225) brightnessScore = 0;
  else if (mean < 60) brightnessScore = (mean - 30) / 30;
  else if (mean > 195) brightnessScore = (225 - mean) / 30;

  // variance: higher = sharper/more interesting (cap at 4000)
  const varianceScore = Math.min(variance / 4000, 1);

  // mild bonus for landscape-ish frames
  const ratioScore = width / height > 0.6 ? 1 : 0.8;

  return brightnessScore * 0.4 + varianceScore * 0.55 + ratioScore * 0.05;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function extractVideoThumbnails(
  file: File | Blob | string,
  opts: ExtractOptions = {},
): Promise<ThumbnailCandidate[]> {
  const frames = opts.frames ?? 5;
  const maxWidth = opts.maxWidth ?? 1280;
  const quality = opts.quality ?? 0.82;

  const url = typeof file === 'string' ? file : URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.crossOrigin = 'anonymous';
  video.preload = 'auto';
  video.playsInline = true;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('video metadata load failed'));
      setTimeout(() => reject(new Error('video metadata timeout')), 15000);
    });

    const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    if (duration === 0) throw new Error('zero duration');

    // skip the very start (often black/intro) and very end (often credits)
    const start = Math.min(1, duration * 0.05);
    const end = Math.max(start + 0.1, duration * 0.9);
    const stops = Array.from({ length: frames }, (_, i) =>
      start + ((end - start) * i) / Math.max(frames - 1, 1),
    );

    const w = Math.min(maxWidth, video.videoWidth || maxWidth);
    const h = Math.round((video.videoHeight || (w * 9) / 16) * (w / (video.videoWidth || w)));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('no 2d context');

    const candidates: ThumbnailCandidate[] = [];
    for (const t of stops) {
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        try { video.currentTime = t; } catch { reject(new Error('seek failed')); }
        setTimeout(() => {
          video.removeEventListener('seeked', onSeeked);
          resolve(); // tolerate seek miss
        }, 4000);
      });

      ctx.drawImage(video, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const score = scoreImageData(img);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      candidates.push({
        blob: dataUrlToBlob(dataUrl),
        dataUrl,
        timestamp: t,
        score,
        width: w,
        height: h,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  } finally {
    if (typeof file !== 'string') URL.revokeObjectURL(url);
    video.src = '';
    video.load();
  }
}

export async function extractBestThumbnail(
  file: File | Blob | string,
  opts: ExtractOptions = {},
): Promise<ThumbnailCandidate | null> {
  const all = await extractVideoThumbnails(file, opts);
  return all[0] ?? null;
}
