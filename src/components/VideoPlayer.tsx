import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Play, Pause, Volume2, VolumeX, Maximize, 
  Heart, Eye, SkipBack, SkipForward, ExternalLink 
} from 'lucide-react';
import { Video } from '@/types/video';
import { useVideo } from '@/contexts/VideoContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
}

export function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  const { incrementViews, incrementReactions, addWatchTime, adminSettings } = useVideo();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const watchTimeRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [hasReacted, setHasReacted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showAd, setShowAd] = useState(false);
  const [adTimeRemaining, setAdTimeRemaining] = useState(5);
  const [viewCounted, setViewCounted] = useState(false);

  // Track view after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!viewCounted) {
        incrementViews(video.id);
        setViewCounted(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [video.id, viewCounted, incrementViews]);

  // Track watch time
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && !showAd) {
        watchTimeRef.current += 1;
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (watchTimeRef.current > 0) {
        addWatchTime(video.id, watchTimeRef.current);
      }
    };
  }, [video.id, isPlaying, showAd, addWatchTime]);

  // Show ad every X minutes
  useEffect(() => {
    if (currentTime > 0 && currentTime % (video.adFrequency * 60) < 1 && isPlaying) {
      setShowAd(true);
      setAdTimeRemaining(5);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [Math.floor(currentTime / 60), video.adFrequency, isPlaying]);

  // Ad countdown
  useEffect(() => {
    if (showAd && adTimeRemaining > 0) {
      const timer = setTimeout(() => setAdTimeRemaining(adTimeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showAd && adTimeRemaining === 0) {
      setShowAd(false);
      if (videoRef.current) {
        videoRef.current.play();
      }
    }
  }, [showAd, adTimeRemaining]);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isPlaying && showControls) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, showControls]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'm') toggleMute();
      if (e.key === 'ArrowLeft') skip(-10);
      if (e.key === 'ArrowRight') skip(10);
      if (e.key === 'f') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.volume = value[0];
      setVolume(value[0]);
      setIsMuted(value[0] === 0);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const handleReaction = () => {
    if (!hasReacted) {
      incrementReactions(video.id);
      setHasReacted(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl"
      onClick={onClose}
      role="dialog"
      aria-label={`Playing ${video.title}`}
      aria-modal="true"
    >
      <motion.div
        ref={containerRef}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-5xl mx-4 rounded-2xl overflow-hidden glass pink-glow"
        onClick={e => e.stopPropagation()}
        onMouseMove={() => setShowControls(true)}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors"
          aria-label="Close player"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video Container */}
        <div className="relative aspect-video bg-muted">
          <video
            ref={videoRef}
            src={video.videoUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            playsInline
          />

          {/* Ad Overlay */}
          <AnimatePresence>
            {showAd && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center z-20"
              >
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">Advertisement</p>
                  <div className="w-64 h-40 bg-muted rounded-lg flex items-center justify-center">
                    <iframe
                      src={adminSettings.adCode}
                      className="w-full h-full"
                      frameBorder="0"
                      title="Advertisement"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Video will resume in {adTimeRemaining} seconds
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center Play/Pause Button */}
          <AnimatePresence>
            {showControls && !showAd && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <button
                  onClick={togglePlay}
                  className="w-20 h-20 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center pink-glow hover:bg-primary transition-colors"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-10 h-10 text-primary-foreground" fill="currentColor" />
                  ) : (
                    <Play className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" />
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls Overlay */}
          <AnimatePresence>
            {showControls && !showAd && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/50 to-transparent p-4"
              >
                {/* Progress Bar */}
                <div className="mb-4">
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={1}
                    onValueChange={handleSeek}
                    className="cursor-pointer"
                    aria-label="Video progress"
                  />
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => skip(-10)}
                      className="p-2 hover:bg-muted rounded-full transition-colors"
                      aria-label="Skip back 10 seconds"
                    >
                      <SkipBack className="w-5 h-5" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="p-2 hover:bg-muted rounded-full transition-colors"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => skip(10)}
                      className="p-2 hover:bg-muted rounded-full transition-colors"
                      aria-label="Skip forward 10 seconds"
                    >
                      <SkipForward className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={toggleMute}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        max={1}
                        step={0.1}
                        onValueChange={handleVolumeChange}
                        className="w-20"
                        aria-label="Volume"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 hover:bg-muted rounded-full transition-colors"
                      aria-label="Toggle fullscreen"
                    >
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="font-display font-semibold text-lg">{video.title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-1">{video.description}</p>
            </div>

            <div className="flex items-center gap-4">
              {/* View Count */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
                <Eye className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium" aria-label={`${video.views + (viewCounted ? 1 : 0)} views`}>
                  {formatViews(video.views + (viewCounted ? 1 : 0))}
                </span>
              </div>

              {/* React Button */}
              <Button
                variant={hasReacted ? "default" : "outline"}
                onClick={handleReaction}
                className={cn(
                  "flex items-center gap-2 transition-all",
                  hasReacted && "bg-primary pink-glow"
                )}
                aria-pressed={hasReacted}
                aria-label={hasReacted ? `Loved: ${video.reactions + 1} reactions` : `Love this video: ${video.reactions} reactions`}
              >
                <Heart 
                  className={cn("w-5 h-5", hasReacted && "fill-current")} 
                  aria-hidden="true"
                />
                <span>{formatViews(video.reactions + (hasReacted ? 1 : 0))}</span>
              </Button>

              {/* CTA Link */}
              {video.ctaLink && video.ctaText && (
                <Button
                  asChild
                  className="bg-primary pink-glow hover:bg-primary/90"
                >
                  <a href={video.ctaLink} target="_blank" rel="noopener noreferrer">
                    {video.ctaText}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
