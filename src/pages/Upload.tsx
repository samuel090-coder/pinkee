import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload as UploadIcon,
  X,
  Image,
  Film,
  Globe,
  Lock,
  Users,
  Clock,
  Tag,
  Folder,
  ChevronDown,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wand2,
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
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo } from '@/contexts/VideoContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type VisibilityType = 'public' | 'unlisted' | 'private';
type UploadStep = 'select' | 'details' | 'processing' | 'complete';

const CATEGORIES = [
  'Entertainment',
  'Music',
  'Gaming',
  'Education',
  'Science & Technology',
  'Sports',
  'Comedy',
  'Film & Animation',
  'News & Politics',
  'Howto & Style',
  'Pets & Animals',
  'Travel & Events',
  'Autos & Vehicles',
  'People & Blogs',
  'Nonprofits & Activism',
];

const Upload = () => {
  const navigate = useNavigate();
  const { user, profile, isCreator } = useAuth();
  const { uploadFile, addVideo } = useVideo();

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<UploadStep>('select');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Video file
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);

  // Thumbnail
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);

  // Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<VisibilityType>('public');
  const [isSubscriptionOnly, setIsSubscriptionOnly] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>('');

  const handleVideoSelect = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      toast({ title: 'Invalid file', description: 'Please select a video file', variant: 'destructive' });
      return;
    }

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast({ title: 'File too large', description: 'Video must be under 500MB', variant: 'destructive' });
      return;
    }

    setVideoFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ''));

    // Create preview and get duration
    const url = URL.createObjectURL(file);
    setVideoPreview(url);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      setVideoDuration(Math.floor(video.duration));
    };
    video.src = url;

    setStep('details');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleVideoSelect(file);
  }, [handleVideoSelect]);

  // Redirect if not signed in
  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Film className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Sign in to upload</h2>
          <p className="text-muted-foreground mb-6">You need to be signed in to upload videos</p>
          <Button onClick={() => navigate('/auth')} className="bg-primary">
            Sign In
          </Button>
        </div>
      </MainLayout>
    );
  }

  // No restrictions - all users can upload

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
        body: {
          video_url: videoPreview,
          title,
          description,
        },
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
      // Upload video
      setUploadProgress(10);
      const videoUrl = await uploadFile(videoFile, 'videos');
      if (!videoUrl) throw new Error('Failed to upload video');

      setUploadProgress(60);

      // Upload thumbnail if provided
      let thumbnailUrl = thumbnailPreview;
      if (thumbnailFile) {
        const uploaded = await uploadFile(thumbnailFile, 'thumbnails');
        if (uploaded) thumbnailUrl = uploaded;
      }

      setUploadProgress(80);

      // Create video record
      await addVideo({
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl || null,
        duration: videoDuration,
        uploader_id: user.id,
        category: category || null,
        tags: tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        status: visibility === 'public' ? 'published' : visibility,
        is_subscription_only: isSubscriptionOnly,
        is_published: visibility === 'public',
        published_at: scheduleDate || new Date().toISOString(),
      });

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

  const renderStep = () => {
    switch (step) {
      case 'select':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => videoInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-16 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                <UploadIcon className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Drag and drop video files to upload
              </h2>
              <p className="text-muted-foreground mb-6">
                Your videos will be private until you publish them
              </p>
              <Button className="bg-primary hover:bg-primary/90">
                SELECT FILES
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                MP4, MOV, AVI • Max 500MB
              </p>
            </div>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={e => e.target.files?.[0] && handleVideoSelect(e.target.files[0])}
              className="hidden"
            />
          </motion.div>
        );

      case 'details':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left - Details Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-lg font-semibold text-foreground mb-6">Details</h2>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title (required)</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Add a title that describes your video"
                      className="mt-1 bg-input border-border"
                      maxLength={100}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{title.length}/100</p>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Tell viewers about your video"
                      className="mt-1 bg-input border-border min-h-[120px]"
                      maxLength={5000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{description.length}/5000</p>
                  </div>

                  {/* Thumbnail */}
                  <div>
                    <Label>Thumbnail</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload a custom thumbnail or generate one with AI
                    </p>
                    <div className="flex gap-4">
                      {thumbnailPreview ? (
                        <div className="relative w-40 aspect-video rounded-lg overflow-hidden">
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 w-6 h-6"
                            onClick={() => {
                              setThumbnailFile(null);
                              setThumbnailPreview(null);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => thumbnailInputRef.current?.click()}
                          className="w-40 aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary"
                        >
                          <Image className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Upload</span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        onClick={handleGenerateThumbnail}
                        disabled={generatingThumbnail}
                        className="h-auto"
                      >
                        {generatingThumbnail ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Wand2 className="w-4 h-4 mr-2" />
                        )}
                        AI Generate
                      </Button>
                    </div>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={e => e.target.files?.[0] && handleThumbnailSelect(e.target.files[0])}
                      className="hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="mt-1 bg-input border-border">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        value={tags}
                        onChange={e => setTags(e.target.value)}
                        placeholder="gaming, tutorial, etc."
                        className="mt-1 bg-input border-border"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Visibility */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-lg font-semibold text-foreground mb-4">Visibility</h2>

                <div className="space-y-3">
                  {[
                    { value: 'public', icon: Globe, label: 'Public', desc: 'Everyone can watch' },
                    { value: 'unlisted', icon: Users, label: 'Unlisted', desc: 'Anyone with link can watch' },
                    { value: 'private', icon: Lock, label: 'Private', desc: 'Only you can watch' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                        visibility === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground'
                      }`}
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

                <div className="mt-4 flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Subscribers only</p>
                    <p className="text-sm text-muted-foreground">Only subscribers can watch</p>
                  </div>
                  <Switch checked={isSubscriptionOnly} onCheckedChange={setIsSubscriptionOnly} />
                </div>
              </div>
            </div>

            {/* Right - Preview */}
            <div className="space-y-4">
              <div className="bg-card rounded-xl overflow-hidden border border-border sticky top-20">
                {videoPreview && (
                  <video
                    src={videoPreview}
                    className="w-full aspect-video object-cover"
                    controls
                  />
                )}
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Video link
                  </p>
                  <p className="text-sm text-primary truncate">
                    {window.location.origin}/watch/preview
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Filename: {videoFile?.name}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep('select');
                    setVideoFile(null);
                    setVideoPreview(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleUpload}
                  disabled={!title.trim() || uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Publish
                </Button>
              </div>
            </div>
          </motion.div>
        );

      case 'processing':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto text-center py-16"
          >
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Uploading your video...
            </h2>
            <p className="text-muted-foreground mb-6">
              Please don't close this page
            </p>
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">{uploadProgress}%</p>
          </motion.div>
        );

      case 'complete':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center py-16"
          >
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Video published!
            </h2>
            <p className="text-muted-foreground mb-8">
              Your video is now live and ready to watch
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/studio')}>
                Go to Studio
              </Button>
              <Button onClick={() => navigate('/')} className="bg-primary">
                View Video
              </Button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Upload Video</h1>
          {step === 'details' && (
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>

        {renderStep()}
      </div>
    </MainLayout>
  );
};

export default Upload;
