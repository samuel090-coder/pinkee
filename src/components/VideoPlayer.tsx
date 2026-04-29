import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Play, Pause, Volume2, VolumeX, Maximize, 
  Heart, Eye, SkipBack, SkipForward 
} from 'lucide-react';
import { Video } from '@/contexts/VideoContext';
import { useVideo } from '@/contexts/VideoContext';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useAdaptivePlayback } from '@/hooks/use-adaptive-playback';

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
}

export function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  const { incrementViews, incrementReactions, addWatchTime, getRandomAdCode, adCodes } = useVideo();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const watchTimeRef = useRef(0);
  const adContainerRef = useRef<HTMLDivElement>(null);

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
  const [currentAdCode, setCurrentAdCode] = useState<string | null>(null);
  const [lastAdTime, setLastAdTime] = useState(-1);

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

  // Show ad every X minutes - only trigger once per interval
  useEffect(() => {
    const adFrequencySeconds = video.ad_frequency * 60;
    const currentSecond = Math.floor(currentTime);
    
    // Only trigger if we've passed an ad interval and haven't shown an ad at this interval yet
    if (
      currentSecond > 0 && 
      currentSecond % adFrequencySeconds === 0 && 
      currentSecond !== lastAdTime &&
      isPlaying && 
      !showAd &&
      adCodes.length > 0
    ) {
      const adCode = getRandomAdCode();
      if (adCode) {
        setLastAdTime(currentSecond);
        setCurrentAdCode(adCode);
        setShowAd(true);
        setAdTimeRemaining(5);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      }
    }
  }, [Math.floor(currentTime), video.ad_frequency, isPlaying, showAd, getRandomAdCode, lastAdTime, adCodes.length]);

  // Inject ad code into container and execute scripts
  useEffect(() => {
    if (showAd && currentAdCode && adContainerRef.current) {
      // Clear previous content
      adContainerRef.current.innerHTML = '';
      
      // Check if it's a URL (redirect ad) or HTML/script code
      if (currentAdCode.startsWith('http://') || currentAdCode.startsWith('https://')) {
        // It's a URL - open in new tab when user clicks
        const link = document.createElement('a');
        link.href = currentAdCode;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'block w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center text-center p-4';
        link.innerHTML = '<span class="text-foreground">Click to view sponsored content</span>';
        adContainerRef.current.appendChild(link);
      } else {
        // It's HTML/script code - need to execute it properly
        // Create a temporary container
        const temp = document.createElement('div');
        temp.innerHTML = currentAdCode;
        
        // Move non-script elements
        Array.from(temp.childNodes).forEach(node => {
          if (node.nodeName !== 'SCRIPT') {
            adContainerRef.current?.appendChild(node.cloneNode(true));
          }
        });
        
        // Execute scripts properly
        const scripts = temp.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          
          // Copy all attributes
          Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          
          // Copy inline content
          if (oldScript.textContent) {
            newScript.textContent = oldScript.textContent;
          }
          
          // Append to body to execute
          document.body.appendChild(newScript);
        });
      }
    }
    
    // Cleanup scripts when ad closes
    return () => {
      // Scripts appended to body will persist - this is intentional for ad networks
    };
  }, [showAd, currentAdCode]);

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
    let timeout: ReturnType<typeof setTimeout>;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/98 backdrop-blur-xl"
      onClick={onClose}
      role="dialog"
      aria-label={`Playing ${video.title}`}
      aria-modal="true"
    >
      <motion.div
        ref={containerRef}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden bg-card border border-border shadow-2xl"
        onClick={e => e.stopPropagation()}
        onMouseMove={() => setShowControls(true)}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
          aria-label="Close player"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Video Container */}
        <div className="relative aspect-video bg-black">
          {video.video_url ? (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              playsInline
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-muted-foreground">No video available</p>
            </div>
          )}

          {/* Ad Overlay */}
          <AnimatePresence>
            {showAd && currentAdCode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/95 flex flex-col items-center justify-center z-20"
              >
              <div className="text-center space-y-4 w-full max-w-md mx-auto px-4">
                  <p className="text-muted-foreground text-sm font-medium">Sponsored Content</p>
                  <div 
                    ref={adContainerRef}
                    className="w-full min-h-[250px] bg-muted/50 rounded-lg flex items-center justify-center overflow-visible"
                    style={{ minWidth: '300px' }}
                  >
                    <p className="text-muted-foreground text-sm">Loading advertisement...</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Video resumes in {adTimeRemaining}s
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
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-primary transition-all pointer-events-auto"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 text-primary-foreground" fill="currentColor" />
                  ) : (
                    <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Controls */}
          <AnimatePresence>
            {showControls && !showAd && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-8 pb-3"
              >
                {/* Live indicator & Time */}
                <div className="flex items-center justify-between text-xs text-white/80 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span>{formatTime(currentTime)}</span>
                  </div>
                  <span>{formatTime(duration)}</span>
                </div>

                {/* Progress Bar */}
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer mb-3"
                  aria-label="Video progress"
                />

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => skip(-10)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                      aria-label="Skip back 10 seconds"
                    >
                      <SkipBack className="w-5 h-5" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => skip(10)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                      aria-label="Skip forward 10 seconds"
                    >
                      <SkipForward className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={toggleMute}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <div className="w-20 hidden sm:block">
                        <Slider
                          value={[isMuted ? 0 : volume]}
                          max={1}
                          step={0.1}
                          onValueChange={handleVolumeChange}
                          aria-label="Volume"
                        />
                      </div>
                    </div>
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
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

        {/* Footer Info */}
        <div className="p-4 bg-card border-t border-border">
          <h2 className="font-display font-semibold text-lg mb-1">{video.title}</h2>
          <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{video.description}</p>
          
          <div className="flex items-center gap-3">
            {/* View Count */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm">
              <Eye className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span>{formatViews(video.views + (viewCounted ? 1 : 0))}</span>
            </div>

            {/* React Button */}
            <button
              onClick={handleReaction}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
                hasReacted 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted hover:bg-muted/80"
              )}
              aria-pressed={hasReacted}
            >
              <Heart 
                className={cn("w-4 h-4", hasReacted && "fill-current")} 
                aria-hidden="true"
              />
              <span>{formatViews(video.reactions + (hasReacted ? 1 : 0))}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}