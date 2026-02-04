import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Image,
  Film,
  Globe,
  Lock,
  Users,
  Tag,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wand2,
  Music,
  Camera,
  Video,
  Timer,
  RotateCcw,
  Sparkles,
  ScanFace,
  ChevronUp,
  FolderOpen,
  Zap,
  Volume2,
  Crown,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo } from '@/contexts/VideoContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type UploadMode = 'video' | 'short' | 'live' | 'post';
type UploadStep = 'create' | 'details' | 'processing' | 'complete';
type VisibilityType = 'public' | 'unlisted' | 'private';

interface MusicTrack {
  id: string;
  title: string;
  artist_name: string | null;
  cover_url: string | null;
  price: number;
  license_type: string;
  audio_url: string;
}

const CATEGORIES = [
  'Entertainment', 'Music', 'Gaming', 'Education', 'Science & Technology',
  'Sports', 'Comedy', 'Film & Animation', 'News & Politics', 'Howto & Style',
  'Pets & Animals', 'Travel & Events', 'Autos & Vehicles', 'People & Blogs',
];

const DURATION_OPTIONS = ['15s', '30s', '60s', '3m'];

const Upload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { uploadFile, addVideo } = useVideo();

  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const addedAudioRef = useRef<HTMLAudioElement>(null);

  const [mode, setMode] = useState<UploadMode>('short');
  const [step, setStep] = useState<UploadStep>('create');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Video file
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState('15s');

  // Thumbnail
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);

  // Sound
  const [showSoundSheet, setShowSoundSheet] = useState(false);
  const [sounds, setSounds] = useState<MusicTrack[]>([]);
  const [selectedSound, setSelectedSound] = useState<MusicTrack | null>(null);
  const [loadingSounds, setLoadingSounds] = useState(false);

  // Audio mix settings
  const [audioMixSettings, setAudioMixSettings] = useState({
    originalVolume: 100,
    addedSoundVolume: 80,
    primaryAudio: 'added' as 'original' | 'added',
    muteOriginal: false,
    muteAdded: false,
  });

  // Controls
  const [showControls, setShowControls] = useState(false);
  const [showAudioMixer, setShowAudioMixer] = useState(false);

  // Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('public');
  const [isSubscriptionOnly, setIsSubscriptionOnly] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState('');
  const [scheduleDate, setScheduleDate] = useState<string>('');

  // Fetch sounds
  useEffect(() => {
    const fetchSounds = async () => {
      setLoadingSounds(true);
      try {
        const { data, error } = await supabase
          .from('music_tracks')
          .select('id, title, artist_name, cover_url, price, license_type, audio_url')
          .eq('is_published', true)
          .order('downloads_count', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setSounds((data || []) as MusicTrack[]);
      } catch (e) {
        console.error('Error fetching sounds:', e);
      } finally {
        setLoadingSounds(false);
      }
    };
    fetchSounds();
  }, []);

  const handleVideoSelect = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      toast({ title: 'Invalid file', description: 'Please select a video file', variant: 'destructive' });
      return;
    }

    const maxSize = mode === 'short' ? 100 * 1024 * 1024 : 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: 'File too large', description: `Video must be under ${mode === 'short' ? '100MB' : '500MB'}`, variant: 'destructive' });
      return;
    }

    setVideoFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ''));

    const url = URL.createObjectURL(file);
    setVideoPreview(url);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      setVideoDuration(Math.floor(video.duration));
    };
    video.src = url;

    setStep('details');
  }, [mode]);

  const handleCameraCapture = useCallback((file: File) => {
    handleVideoSelect(file);
  }, [handleVideoSelect]);

  const handleSelectSound = async (sound: MusicTrack) => {
    // Check if sound requires purchase
    if (sound.license_type !== 'free' && sound.price > 0) {
      // Check if user already has license
      const { data: existingLicense } = await supabase
        .from('music_licenses')
        .select('id')
        .eq('track_id', sound.id)
        .eq('buyer_id', user!.id)
        .maybeSingle();

      if (!existingLicense) {
        toast({
          title: `Premium Sound - $${sound.price}`,
          description: 'This sound requires a purchase. Go to Music Marketplace to buy.',
        });
        return;
      }
    }
    
    setSelectedSound(sound);
    setShowSoundSheet(false);
    toast({ title: 'Sound added!', description: sound.title });
  };

  const handleThumbnailSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleGenerateThumbnail = async () => {
    if (!videoPreview) return;
    setGeneratingThumbnail(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-thumbnail', {
        body: { video_url: videoPreview, title, description },
      });
      if (error) throw error;
      if (data?.thumbnail_url) {
        setThumbnailPreview(data.thumbnail_url);
        toast({ title: 'Thumbnail generated!' });
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      toast({ title: 'Error', description: 'Failed to generate thumbnail', variant: 'destructive' });
    } finally {
      setGeneratingThumbnail(false);
    }
  };

  const handleUpload = async () => {
    if (!videoFile || !title.trim()) {
      toast({ title: 'Missing required fields', variant: 'destructive' });
      return;
    }

    setStep('processing');
    setUploading(true);

    try {
      setUploadProgress(10);
      const videoUrl = await uploadFile(videoFile, 'videos');
      if (!videoUrl) throw new Error('Failed to upload video');

      setUploadProgress(60);

      let thumbnailUrl = thumbnailPreview;
      if (thumbnailFile) {
        const uploaded = await uploadFile(thumbnailFile, 'thumbnails');
        if (uploaded) thumbnailUrl = uploaded;
      }

      setUploadProgress(80);

      // Create video record and get the ID
      const { data: newVideo, error: videoError } = await supabase
        .from('videos')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl || null,
          duration: videoDuration,
          uploader_id: user!.id,
          category: mode === 'short' ? 'Shorts' : category || null,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          status: visibility === 'public' ? 'published' : visibility,
          is_subscription_only: isSubscriptionOnly,
          is_premium: isPremium,
          premium_price: isPremium ? parseFloat(premiumPrice) || 0 : 0,
          is_published: visibility === 'public',
          published_at: scheduleDate || new Date().toISOString(),
        })
        .select('id')
        .single();

      if (videoError) throw videoError;

      // Track sound usage if selected - this triggers artist earnings!
      if (selectedSound && newVideo) {
        const { error: usageError } = await supabase.from('sound_usages').insert({
          track_id: selectedSound.id,
          video_id: newVideo.id,
          creator_id: user!.id,
        });

        if (usageError) {
          console.error('Error tracking sound usage:', usageError);
        } else {
          toast({ 
            title: 'Sound added!', 
            description: `Using "${selectedSound.title}" in your video` 
          });
        }
      }

      setUploadProgress(100);
      setStep('complete');
      toast({ title: 'Video uploaded successfully!' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: 'Please try again', variant: 'destructive' });
      setStep('details');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Film className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Sign in to upload</h2>
          <p className="text-muted-foreground mb-6">You need to be signed in to upload videos</p>
          <Button onClick={() => navigate('/auth')} className="bg-primary">Sign In</Button>
        </div>
      </MainLayout>
    );
  }

  // TikTok-style Create Screen
  if (step === 'create') {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Top Bar */}
        <div className="relative flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="w-6 h-6" />
          </Button>

          <Button
            variant="ghost"
            className="flex items-center gap-2 bg-secondary/80 rounded-full px-4 py-2"
            onClick={() => setShowSoundSheet(true)}
          >
            <Music className="w-4 h-4" />
            <span>{selectedSound ? selectedSound.title : 'Add sound'}</span>
          </Button>

          <div className="bg-secondary/80 rounded-full px-3 py-1 text-sm font-medium">
            {selectedDuration}
          </div>
        </div>

        {/* Camera Preview Area */}
        <div className="flex-1 relative bg-black">
          {videoPreview ? (
            <video
              src={videoPreview}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              loop
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="w-20 h-20 text-muted-foreground/50" />
            </div>
          )}

          {/* Right Side Controls */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="bg-secondary/50 rounded-full w-12 h-12"
              onClick={() => {/* flip camera */}}
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-secondary/50 rounded-full w-12 h-12"
            >
              <span className="text-sm font-medium">1x</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-secondary/50 rounded-full w-12 h-12"
            >
              <Timer className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-secondary/50 rounded-full w-12 h-12"
            >
              <Sparkles className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-secondary/50 rounded-full w-12 h-12"
            >
              <ScanFace className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-secondary/50 rounded-full w-12 h-12"
              onClick={() => setShowControls(!showControls)}
            >
              {showControls ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="bg-background p-6 space-y-4">
          <div className="flex items-center justify-between">
            {/* Gallery/Add */}
            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-lg bg-secondary border border-border overflow-hidden">
                <FolderOpen className="w-6 h-6 m-auto mt-3 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Add</span>
            </button>

            {/* Record Button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-destructive" />
            </button>

            {/* Drafts */}
            <button className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-lg bg-secondary border border-border flex items-center justify-center">
                <Video className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Drafts</span>
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex justify-center gap-6">
            {(['video', 'short', 'live', 'post'] as UploadMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  mode === m ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {m === 'short' ? (
                  <span className="bg-secondary px-3 py-1.5 rounded-full">{m.charAt(0).toUpperCase() + m.slice(1)}</span>
                ) : (
                  m.charAt(0).toUpperCase() + m.slice(1)
                )}
              </button>
            ))}
          </div>

          {/* Duration Options (for Shorts) */}
          {mode === 'short' && (
            <div className="flex justify-center gap-3">
              {DURATION_OPTIONS.map((d) => (
                <Button
                  key={d}
                  variant={selectedDuration === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDuration(d)}
                  className="rounded-full"
                >
                  {d}
                </Button>
              ))}
            </div>
          )}
        </div>

        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={(e) => e.target.files?.[0] && handleVideoSelect(e.target.files[0])}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={(e) => e.target.files?.[0] && handleCameraCapture(e.target.files[0])}
          className="hidden"
        />

        {/* Sound Sheet */}
        <Sheet open={showSoundSheet} onOpenChange={setShowSoundSheet}>
          <SheetContent side="bottom" className="h-[70vh] bg-card">
            <SheetHeader>
              <SheetTitle>Add Sound</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(70vh-80px)]">
              {loadingSounds ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : sounds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="w-12 h-12 mx-auto mb-2" />
                  <p>No sounds available</p>
                  <Link to="/music/upload" className="text-primary hover:underline text-sm">
                    Upload your own music
                  </Link>
                </div>
              ) : (
                sounds.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => handleSelectSound(sound)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg transition-colors',
                      selectedSound?.id === sound.id ? 'bg-primary/20' : 'bg-secondary hover:bg-secondary/80'
                    )}
                  >
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      {sound.cover_url ? (
                        <img src={sound.cover_url} alt="" className="w-full h-full object-cover rounded" />
                      ) : (
                        <Music className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-medium text-foreground truncate">{sound.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{sound.artist_name || 'Unknown'}</p>
                    </div>
                    {sound.license_type !== 'free' && sound.price > 0 ? (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                        ${sound.price}
                      </span>
                    ) : (
                      <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full">
                        Free
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Details Step
  if (step === 'details') {
    return (
      <MainLayout>
        <div className="container max-w-3xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Preview */}
            <div className="aspect-[9/16] max-h-[400px] bg-black rounded-xl overflow-hidden mx-auto">
              {videoPreview && (
                <video
                  ref={previewVideoRef}
                  src={videoPreview}
                  className="w-full h-full object-contain"
                  controls
                />
              )}
            </div>

            {selectedSound && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <Music className="w-5 h-5 text-primary" />
                  <span className="text-foreground flex-1">{selectedSound.title}</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowAudioMixer(!showAudioMixer)}>
                    <Volume2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSound(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Audio Mixer */}
                {showAudioMixer && (
                  <div className="p-4 bg-card rounded-lg border border-border space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Audio Settings</span>
                    </div>
                    
                    {/* Primary Audio Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Which audio should play?</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={audioMixSettings.primaryAudio === 'original' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setAudioMixSettings(prev => ({ ...prev, primaryAudio: 'original' }))}
                          className="flex-1"
                        >
                          Original Sound
                        </Button>
                        <Button
                          type="button"
                          variant={audioMixSettings.primaryAudio === 'added' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setAudioMixSettings(prev => ({ ...prev, primaryAudio: 'added' }))}
                          className="flex-1"
                        >
                          Added Sound
                        </Button>
                      </div>
                    </div>
                    
                    {/* Volume Controls */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Original Video Volume</span>
                        <span className="text-xs text-muted-foreground">{audioMixSettings.originalVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={audioMixSettings.originalVolume}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setAudioMixSettings(prev => ({ ...prev, originalVolume: value }));
                          if (previewVideoRef.current) {
                            previewVideoRef.current.volume = value / 100;
                          }
                        }}
                        className="w-full accent-primary"
                      />
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Added Sound Volume</span>
                        <span className="text-xs text-muted-foreground">{audioMixSettings.addedSoundVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={audioMixSettings.addedSoundVolume}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setAudioMixSettings(prev => ({ ...prev, addedSoundVolume: value }));
                          if (addedAudioRef.current) {
                            addedAudioRef.current.volume = value / 100;
                          }
                        }}
                        className="w-full accent-primary"
                      />
                      
                      {/* Play added sound preview */}
                      {selectedSound && (
                        <audio
                          ref={addedAudioRef}
                          src={selectedSound.audio_url}
                          loop
                          className="hidden"
                        />
                      )}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          if (addedAudioRef.current) {
                            if (addedAudioRef.current.paused) {
                              addedAudioRef.current.volume = audioMixSettings.addedSoundVolume / 100;
                              addedAudioRef.current.play();
                            } else {
                              addedAudioRef.current.pause();
                            }
                          }
                        }}
                      >
                        Preview Added Sound
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Add a title..."
                  className="mt-1 bg-input border-border"
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers about your video..."
                  className="mt-1 bg-input border-border min-h-[100px]"
                />
              </div>

              {mode !== 'short' && (
                <>
                  <div>
                    <Label>Thumbnail</Label>
                    <div className="flex gap-4 mt-2">
                      {thumbnailPreview ? (
                        <div className="relative w-32 aspect-video rounded-lg overflow-hidden">
                          <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 w-6 h-6"
                            onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="w-32 aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary"
                        >
                          <Image className="w-5 h-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Upload</span>
                        </div>
                      )}
                      <Button variant="outline" onClick={handleGenerateThumbnail} disabled={generatingThumbnail}>
                        {generatingThumbnail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                        AI Generate
                      </Button>
                    </div>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleThumbnailSelect(e.target.files[0])}
                      className="hidden"
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="mt-1 bg-input border-border">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="gaming, tutorial, etc."
                  className="mt-1 bg-input border-border"
                />
              </div>

              {/* Visibility */}
              <div className="space-y-3">
                <Label>Visibility</Label>
                {[
                  { value: 'public', icon: Globe, label: 'Public', desc: 'Everyone can watch' },
                  { value: 'unlisted', icon: Users, label: 'Unlisted', desc: 'Anyone with link' },
                  { value: 'private', icon: Lock, label: 'Private', desc: 'Only you' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all',
                      visibility === opt.value ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={opt.value}
                      checked={visibility === opt.value}
                      onChange={() => setVisibility(opt.value as VisibilityType)}
                      className="sr-only"
                    />
                    <opt.icon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{opt.label}</p>
                      <p className="text-sm text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Premium Content */}
              <div className="p-4 rounded-lg border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Premium Video</p>
                      <p className="text-sm text-muted-foreground">Viewers pay to watch</p>
                    </div>
                  </div>
                  <Switch
                    checked={isPremium}
                    onCheckedChange={setIsPremium}
                  />
                </div>
                
                {isPremium && (
                  <div className="pt-2 border-t border-border">
                    <Label>Price (USD)</Label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={premiumPrice}
                        onChange={(e) => setPremiumPrice(e.target.value)}
                        placeholder="1.99"
                        className="pl-9 bg-input border-border"
                        min="0.50"
                        step="0.50"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      You keep 90% of each sale. Platform fee: 10%
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('create')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !title.trim()} className="flex-1">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Post
              </Button>
            </div>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // Processing
  if (step === 'processing') {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Uploading your video...</h2>
          <Progress value={uploadProgress} className="w-64 h-2 mb-2" />
          <p className="text-muted-foreground">{uploadProgress}%</p>
        </div>
      </MainLayout>
    );
  }

  // Complete
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Video Published!</h2>
        <p className="text-muted-foreground mb-6">Your video is now live</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setStep('create'); setVideoFile(null); setVideoPreview(null); }}>
            Upload Another
          </Button>
          <Button onClick={() => navigate('/studio')}>Go to Studio</Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Upload;
