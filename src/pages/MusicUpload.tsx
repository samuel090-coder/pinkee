import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Music, Upload, Image, DollarSign } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo } from '@/contexts/VideoContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const GENRES = [
  'Pop', 'Hip Hop', 'R&B', 'Electronic', 'Rock', 'Jazz', 'Classical',
  'Country', 'Reggae', 'Latin', 'Indie', 'Lo-Fi', 'Ambient', 'Other'
];

const LICENSE_TYPES = [
  { value: 'free', label: 'Free', description: 'Anyone can use for free' },
  { value: 'standard', label: 'Standard', description: 'Basic commercial use' },
  { value: 'premium', label: 'Premium', description: 'Extended commercial rights' },
  { value: 'exclusive', label: 'Exclusive', description: 'One buyer only' },
];

const MusicUpload = () => {
  const navigate = useNavigate();
  const { user, isCreator } = useAuth();
  const { uploadFile } = useVideo();

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [bpm, setBpm] = useState('');
  const [musicalKey, setMusicalKey] = useState('');
  const [licenseType, setLicenseType] = useState('free');
  const [price, setPrice] = useState('0');

  const handleAudioSelect = useCallback((file: File) => {
    if (!file.type.startsWith('audio/')) {
      toast({ title: 'Invalid file', description: 'Please select an audio file', variant: 'destructive' });
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast({ title: 'File too large', description: 'Audio must be under 50MB', variant: 'destructive' });
      return;
    }

    setAudioFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ''));

    const url = URL.createObjectURL(file);
    setAudioPreview(url);

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      setAudioDuration(Math.floor(audio.duration));
    };
    audio.src = url;
  }, []);

  const handleCoverSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image', variant: 'destructive' });
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }, []);

  const handleUpload = async () => {
    if (!audioFile || !title.trim()) {
      toast({ title: 'Missing info', description: 'Please add audio and title', variant: 'destructive' });
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Upload audio
      const audioPath = `music/${Date.now()}-${audioFile.name}`;
      const { error: audioError } = await supabase.storage
        .from('videos')
        .upload(audioPath, audioFile);

      if (audioError) throw audioError;

      const { data: audioUrl } = supabase.storage.from('videos').getPublicUrl(audioPath);
      setUploadProgress(50);

      // Upload cover if provided
      let coverUrl: string | null = null;
      if (coverFile) {
        const coverPath = `covers/${Date.now()}-${coverFile.name}`;
        const { error: coverError } = await supabase.storage
          .from('thumbnails')
          .upload(coverPath, coverFile);

        if (!coverError) {
          const { data } = supabase.storage.from('thumbnails').getPublicUrl(coverPath);
          coverUrl = data.publicUrl;
        }
      }
      setUploadProgress(80);

      // Create track record
      const { error: insertError } = await supabase.from('music_tracks').insert({
        creator_id: user!.id,
        title: title.trim(),
        artist_name: artistName.trim() || null,
        audio_url: audioUrl.publicUrl,
        cover_url: coverUrl,
        duration: audioDuration,
        genre: genre || null,
        bpm: bpm ? parseInt(bpm) : null,
        key: musicalKey || null,
        description: description.trim() || null,
        price: parseFloat(price) || 0,
        license_type: licenseType,
      });

      if (insertError) throw insertError;

      setUploadProgress(100);
      toast({ title: 'Track uploaded!', description: 'Your music is now available in the marketplace.' });
      navigate('/music');
    } catch (e: any) {
      console.error('Error uploading:', e);
      toast({ title: 'Upload failed', description: e?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Music className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Sign in to upload music</h2>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </MainLayout>
    );
  }

  if (!isCreator) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Music className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Creator Access Required</h2>
          <p className="text-muted-foreground mb-6">You need creator privileges to sell music</p>
          <Button onClick={() => navigate('/settings')} variant="secondary">
            Request Creator Access
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-3xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Upload Music</h1>
          <p className="text-muted-foreground">Sell your tracks on the marketplace</p>
        </header>

        <div className="space-y-6">
          {/* Audio Upload */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                Audio File
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAudioSelect(e.target.files[0])}
              />
              {audioFile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <span className="text-foreground truncate">{audioFile.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => audioInputRef.current?.click()}>
                      Change
                    </Button>
                  </div>
                  {audioPreview && (
                    <audio controls src={audioPreview} className="w-full" />
                  )}
                </div>
              ) : (
                <div
                  onClick={() => audioInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-medium">Click to upload audio</p>
                  <p className="text-sm text-muted-foreground">MP3, WAV, FLAC up to 50MB</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cover Upload */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Cover Art (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleCoverSelect(e.target.files[0])}
              />
              {coverPreview ? (
                <div className="flex items-center gap-4">
                  <img src={coverPreview} alt="Cover" className="w-24 h-24 object-cover rounded-lg" />
                  <Button variant="ghost" onClick={() => coverInputRef.current?.click()}>Change</Button>
                </div>
              ) : (
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Upload cover art</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Track Details */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Track Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-input border-border"
                    placeholder="Track title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artist">Artist Name</Label>
                  <Input
                    id="artist"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className="bg-input border-border"
                    placeholder="Your artist name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-input border-border min-h-[100px]"
                  placeholder="Tell listeners about this track..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Genre</Label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {GENRES.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bpm">BPM</Label>
                  <Input
                    id="bpm"
                    type="number"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    className="bg-input border-border"
                    placeholder="120"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="key">Key</Label>
                  <Input
                    id="key"
                    value={musicalKey}
                    onChange={(e) => setMusicalKey(e.target.value)}
                    className="bg-input border-border"
                    placeholder="C Major"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing & License
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>License Type</Label>
                <Select value={licenseType} onValueChange={setLicenseType}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {LICENSE_TYPES.map(lt => (
                      <SelectItem key={lt.value} value={lt.value}>
                        <div>
                          <span className="font-medium">{lt.label}</span>
                          <span className="text-muted-foreground ml-2">{lt.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {licenseType !== 'free' && (
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="bg-input border-border"
                    placeholder="9.99"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Button */}
          {uploading && (
            <Progress value={uploadProgress} className="h-2" />
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || !audioFile || !title.trim()}
            className="w-full"
            size="lg"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Track
              </>
            )}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default MusicUpload;
