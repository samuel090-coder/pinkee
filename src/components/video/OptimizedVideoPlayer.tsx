import { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedVideoPlayerProps {
  src: string;
  poster?: string | null;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  controls?: boolean;
}

export const OptimizedVideoPlayer = ({
  src,
  poster,
  autoPlay = false,
  muted = false,
  loop = false,
  className,
  onTimeUpdate,
  onDurationChange,
  onEnded,
  onPlay,
  onPause,
  controls = true,
}: OptimizedVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Preload and optimize video loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set up video for fast loading
    video.preload = 'auto';
    
    // Use native lazy loading for videos below the fold
    if ('loading' in HTMLVideoElement.prototype) {
      (video as any).loading = 'lazy';
    }

    // Handle loaded metadata
    const handleLoadedMetadata = () => {
      setIsLoaded(true);
      if (onDurationChange) {
        onDurationChange(video.duration);
      }
    };

    // Handle can play - video is ready
    const handleCanPlay = () => {
      setIsLoaded(true);
      if (autoPlay) {
        video.play().catch(() => {
          // Auto-play blocked, try muted
          video.muted = true;
          video.play().catch(console.error);
        });
      }
    };

    const handleError = () => {
      setError(true);
      console.error('Video failed to load:', src);
    };

    const handleTimeUpdate = () => {
      if (onTimeUpdate) {
        onTimeUpdate(video.currentTime);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', () => onEnded?.());
    video.addEventListener('play', () => onPlay?.());
    video.addEventListener('pause', () => onPause?.());

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [src, autoPlay, onDurationChange, onTimeUpdate, onEnded, onPlay, onPause]);

  // Use video as poster if no thumbnail
  const effectivePoster = poster || undefined;

  return (
    <div className={cn('relative bg-black', className)}>
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <p className="text-muted-foreground text-sm">Video failed to load</p>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        poster={effectivePoster}
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline
        className={cn(
          'w-full h-full object-contain transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
};

// Hook for video thumbnail extraction
export const useVideoThumbnail = () => {
  const extractThumbnail = useCallback(async (videoUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';
      
      video.onloadeddata = () => {
        // Seek to 1 second or 10% of video
        video.currentTime = Math.min(1, video.duration * 0.1);
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(null);
        }
      };
      
      video.onerror = () => resolve(null);
      video.src = videoUrl;
    });
  }, []);

  return { extractThumbnail };
};
