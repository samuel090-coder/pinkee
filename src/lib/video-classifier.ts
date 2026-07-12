/**
 * Client-side video probe + Short/Long classifier.
 *
 * A "Short" is:
 *   - duration <= 60s, OR
 *   - portrait aspect ratio (height > width) with duration <= 180s.
 */

export interface VideoProbe {
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
  isShort: boolean;
  orientation: "portrait" | "landscape" | "square";
}

export async function probeVideoFile(file: File): Promise<VideoProbe> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("metadata load failed"));
      setTimeout(() => reject(new Error("metadata timeout")), 15000);
    });

    const duration = isFinite(video.duration) ? Math.round(video.duration) : 0;
    const width = video.videoWidth || 0;
    const height = video.videoHeight || 1;
    const aspectRatio = width / height;

    const orientation: VideoProbe["orientation"] =
      height > width ? "portrait" : width === height ? "square" : "landscape";

    const isShort =
      duration > 0 &&
      (duration <= 60 ||
        (orientation === "portrait" && duration <= 180));

    return { duration, width, height, aspectRatio, isShort, orientation };
  } finally {
    URL.revokeObjectURL(url);
    video.src = "";
    video.load();
  }
}
