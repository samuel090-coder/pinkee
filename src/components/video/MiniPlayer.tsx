import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePiP } from '@/contexts/PiPContext';
import { Button } from '@/components/ui/button';

export function MiniPlayer() {
  const { pipVideo, isMinimized, exitPiP, updateTime } = usePiP();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (videoRef.current && pipVideo) {
      videoRef.current.currentTime = pipVideo.currentTime;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [pipVideo?.id]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const expand = () => {
    if (pipVideo) {
      const time = videoRef.current?.currentTime || 0;
      exitPiP();
      navigate(`/watch/${pipVideo.id}?t=${Math.floor(time)}`);
    }
  };

  if (!pipVideo || !isMinimized) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        drag
        dragConstraints={{ left: -200, right: 200, top: -400, bottom: 0 }}
        className="fixed bottom-20 right-4 z-50 w-[280px] sm:w-[320px] rounded-xl overflow-hidden shadow-2xl border border-border bg-card"
      >
        <div className="relative aspect-video bg-black group">
          <video
            ref={videoRef}
            src={pipVideo.videoUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={() => {
              if (videoRef.current) updateTime(videoRef.current.currentTime);
            }}
            onEnded={() => setIsPlaying(false)}
            playsInline
          />

          {/* Hover controls */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" onClick={togglePlay} className="h-8 w-8 text-white hover:bg-white/20">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={expand} className="h-8 w-8 text-white hover:bg-white/20">
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={exitPiP} className="h-8 w-8 text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-2">
          <p className="text-xs font-medium text-foreground truncate">{pipVideo.title}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
