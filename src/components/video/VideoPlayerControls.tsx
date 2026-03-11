import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipForward, SkipBack, Settings, PictureInPicture2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface VideoPlayerControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  buffered: number;
  isFullscreen: boolean;
  playbackSpeed: number;
  quality: string;
  availableQualities: string[];
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number[]) => void;
  onSeek: (value: number[]) => void;
  onSkip: (seconds: number) => void;
  onToggleFullscreen: () => void;
  onSpeedChange: (speed: number) => void;
  onQualityChange: (quality: string) => void;
  onTogglePiP: () => void;
}

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function VideoPlayerControls({
  isPlaying, isMuted, volume, currentTime, duration, buffered,
  isFullscreen, playbackSpeed, quality, availableQualities,
  onTogglePlay, onToggleMute, onVolumeChange, onSeek, onSkip,
  onToggleFullscreen, onSpeedChange, onQualityChange, onTogglePiP,
}: VideoPlayerControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4"
    >
      {/* Progress Bar */}
      <div className="relative mb-4">
        <div className="absolute h-1 bg-muted/30 w-full rounded" />
        <div
          className="absolute h-1 bg-muted/50 rounded"
          style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
        />
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={onSeek}
          className="relative z-10"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" onClick={() => onSkip(-10)} className="h-8 w-8">
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onTogglePlay} className="h-8 w-8">
            {isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onSkip(10)} className="h-8 w-8">
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          <div className="hidden sm:flex items-center gap-2 ml-2">
            <Button variant="ghost" size="icon" onClick={onToggleMute} className="h-8 w-8">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={onVolumeChange}
              className="w-20"
            />
          </div>

          <span className="text-xs sm:text-sm text-white ml-2 sm:ml-4 whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Speed badge */}
          {playbackSpeed !== 1 && (
            <span className="text-xs text-primary font-medium px-1.5 py-0.5 bg-primary/20 rounded">
              {playbackSpeed}x
            </span>
          )}

          {/* Settings Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border w-48">
              {/* Playback Speed */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-sm">
                  Playback speed
                  <span className="ml-auto text-xs text-muted-foreground">{playbackSpeed}x</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-card border-border">
                  <DropdownMenuRadioGroup value={String(playbackSpeed)} onValueChange={(v) => onSpeedChange(Number(v))}>
                    {SPEED_OPTIONS.map(speed => (
                      <DropdownMenuRadioItem key={speed} value={String(speed)} className="text-sm">
                        {speed === 1 ? 'Normal' : `${speed}x`}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Quality */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-sm">
                  Quality
                  <span className="ml-auto text-xs text-muted-foreground">{quality}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="bg-card border-border">
                  <DropdownMenuRadioGroup value={quality} onValueChange={onQualityChange}>
                    {availableQualities.map(q => (
                      <DropdownMenuRadioItem key={q} value={q} className="text-sm">
                        {q}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* PiP */}
              <DropdownMenuItem onClick={onTogglePiP} className="text-sm">
                <PictureInPicture2 className="w-4 h-4 mr-2" />
                Mini player
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={onToggleFullscreen} className="h-8 w-8">
            {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
