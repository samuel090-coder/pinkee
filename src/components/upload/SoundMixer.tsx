import { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Music, Mic } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SoundMixerProps {
  selectedSound: {
    id: string;
    title: string;
    artist_name?: string;
    cover_url?: string;
  } | null;
  onMixSettingsChange: (settings: {
    originalVolume: number;
    addedSoundVolume: number;
    primaryAudio: 'original' | 'added';
    muteOriginal: boolean;
    muteAdded: boolean;
  }) => void;
}

export const SoundMixer = ({ selectedSound, onMixSettingsChange }: SoundMixerProps) => {
  const [originalVolume, setOriginalVolume] = useState(100);
  const [addedSoundVolume, setAddedSoundVolume] = useState(80);
  const [primaryAudio, setPrimaryAudio] = useState<'original' | 'added'>('added');
  const [muteOriginal, setMuteOriginal] = useState(false);
  const [muteAdded, setMuteAdded] = useState(false);

  const handleVolumeChange = (type: 'original' | 'added', value: number[]) => {
    if (type === 'original') {
      setOriginalVolume(value[0]);
    } else {
      setAddedSoundVolume(value[0]);
    }
    
    onMixSettingsChange({
      originalVolume: type === 'original' ? value[0] : originalVolume,
      addedSoundVolume: type === 'added' ? value[0] : addedSoundVolume,
      primaryAudio,
      muteOriginal,
      muteAdded
    });
  };

  const handlePrimaryChange = (audio: 'original' | 'added') => {
    setPrimaryAudio(audio);
    onMixSettingsChange({
      originalVolume,
      addedSoundVolume,
      primaryAudio: audio,
      muteOriginal,
      muteAdded
    });
  };

  const handleMuteChange = (type: 'original' | 'added', muted: boolean) => {
    if (type === 'original') {
      setMuteOriginal(muted);
    } else {
      setMuteAdded(muted);
    }
    
    onMixSettingsChange({
      originalVolume,
      addedSoundVolume,
      primaryAudio,
      muteOriginal: type === 'original' ? muted : muteOriginal,
      muteAdded: type === 'added' ? muted : muteAdded
    });
  };

  if (!selectedSound) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card/80 backdrop-blur-md rounded-2xl p-4 space-y-4 border border-border"
    >
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Audio Mixer</h3>
      </div>

      {/* Selected Sound Info */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
        {selectedSound.cover_url ? (
          <img 
            src={selectedSound.cover_url} 
            alt={selectedSound.title}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
            <Music className="w-6 h-6 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{selectedSound.title}</p>
          <p className="text-sm text-muted-foreground truncate">{selectedSound.artist_name || 'Unknown'}</p>
        </div>
      </div>

      {/* Primary Audio Selection */}
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Primary Audio</Label>
        <div className="flex gap-2">
          <button
            onClick={() => handlePrimaryChange('original')}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all",
              primaryAudio === 'original' 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <Mic className="w-4 h-4" />
            <span className="text-sm">Original</span>
          </button>
          <button
            onClick={() => handlePrimaryChange('added')}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all",
              primaryAudio === 'added' 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <Music className="w-4 h-4" />
            <span className="text-sm">Added Sound</span>
          </button>
        </div>
      </div>

      {/* Original Sound Volume */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Original Sound
          </Label>
          <button
            onClick={() => handleMuteChange('original', !muteOriginal)}
            className="p-1 hover:bg-muted rounded"
          >
            {muteOriginal ? (
              <VolumeX className="w-4 h-4 text-red-500" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Slider
            value={[muteOriginal ? 0 : originalVolume]}
            onValueChange={(v) => handleVolumeChange('original', v)}
            max={100}
            step={1}
            className={cn("flex-1", muteOriginal && "opacity-50")}
            disabled={muteOriginal}
          />
          <span className="text-sm w-10 text-right">{muteOriginal ? 0 : originalVolume}%</span>
        </div>
      </div>

      {/* Added Sound Volume */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm flex items-center gap-2">
            <Music className="w-4 h-4" />
            Added Sound
          </Label>
          <button
            onClick={() => handleMuteChange('added', !muteAdded)}
            className="p-1 hover:bg-muted rounded"
          >
            {muteAdded ? (
              <VolumeX className="w-4 h-4 text-red-500" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <Slider
            value={[muteAdded ? 0 : addedSoundVolume]}
            onValueChange={(v) => handleVolumeChange('added', v)}
            max={100}
            step={1}
            className={cn("flex-1", muteAdded && "opacity-50")}
            disabled={muteAdded}
          />
          <span className="text-sm w-10 text-right">{muteAdded ? 0 : addedSoundVolume}%</span>
        </div>
      </div>

      {/* Tips */}
      <div className="p-3 bg-primary/10 rounded-xl text-sm">
        <p className="text-primary font-medium mb-1">💡 Audio Tips</p>
        <ul className="text-muted-foreground text-xs space-y-1">
          <li>• Primary audio will be louder in the final video</li>
          <li>• Mute original to only play the added sound</li>
          <li>• Balance both for a mixed audio experience</li>
        </ul>
      </div>
    </motion.div>
  );
};
