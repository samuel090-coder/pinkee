import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, Music, Play, Pause, ArrowLeft, Video } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface SoundUsage {
  id: string;
  video_id: string;
  created_at: string;
  video?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    views: number;
  };
}

interface TrackDetails {
  id: string;
  title: string;
  artist_name: string | null;
  audio_url: string;
  cover_url: string | null;
  duration: number | null;
  genre: string | null;
  downloads_count: number | null;
  creator_id: string;
  price: number;
  license_type: string;
  creator?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

const SoundDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState<TrackDetails | null>(null);
  const [usages, setUsages] = useState<SoundUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchSoundDetails = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // First try to get from music_tracks
        const { data: trackData, error: trackError } = await supabase
          .from('music_tracks')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (trackData) {
          // Get creator profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, username, avatar_url')
            .eq('user_id', trackData.creator_id)
            .single();

          setTrack({
            ...trackData,
            creator: profile || undefined
          });

          // Get sound usages
          const { data: usageData } = await supabase
            .from('sound_usages')
            .select('id, video_id, created_at')
            .eq('track_id', id)
            .order('created_at', { ascending: false });

          if (usageData && usageData.length > 0) {
            // Fetch video details for each usage
            const videoIds = usageData.map(u => u.video_id);
            const { data: videos } = await supabase
              .from('videos')
              .select('id, title, thumbnail_url, views')
              .in('id', videoIds);

            const videoMap = new Map(videos?.map(v => [v.id, v]));
            
            setUsages(usageData.map(u => ({
              ...u,
              video: videoMap.get(u.video_id)
            })));
          }
        } else {
          // This might be a video ID (original sound), show videos using it
          const { data: video } = await supabase
            .from('videos')
            .select('*')
            .eq('id', id)
            .single();

          if (video) {
            setTrack({
              id: video.id,
              title: 'Original Sound - ' + video.title,
              artist_name: null,
              audio_url: video.video_url || '',
              cover_url: video.thumbnail_url,
              duration: video.duration,
              genre: null,
              downloads_count: 0,
              creator_id: video.uploader_id || '',
              price: 0,
              license_type: 'free'
            });
          }
        }
      } catch (e) {
        console.error('Error fetching sound:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchSoundDetails();

    return () => {
      audio?.pause();
    };
  }, [id]);

  const togglePlay = () => {
    if (!track) return;

    if (playing) {
      audio?.pause();
      setPlaying(false);
    } else {
      const newAudio = new Audio(track.audio_url);
      newAudio.play();
      newAudio.onended = () => setPlaying(false);
      setAudio(newAudio);
      setPlaying(true);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!track) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Music className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Sound not found</h2>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Sound Info */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Cover */}
          <div className="relative w-48 h-48 flex-shrink-0 mx-auto md:mx-0">
            {track.cover_url ? (
              <img 
                src={track.cover_url} 
                alt={track.title} 
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-full bg-secondary rounded-xl flex items-center justify-center">
                <Music className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <Button
              size="icon"
              className="absolute bottom-3 right-3 rounded-full w-12 h-12"
              onClick={togglePlay}
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{track.title}</h1>
              <p className="text-muted-foreground">{track.artist_name || 'Unknown Artist'}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {track.genre && <Badge variant="outline">{track.genre}</Badge>}
              <Badge variant="secondary">{formatDuration(track.duration)}</Badge>
              {track.license_type === 'free' ? (
                <Badge className="bg-green-500/20 text-green-500">Free</Badge>
              ) : (
                <Badge className="bg-primary/20 text-primary">${track.price}</Badge>
              )}
            </div>

            {track.creator && (
              <div className="flex items-center gap-3 pt-2">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={track.creator.avatar_url || undefined} />
                  <AvatarFallback>
                    {(track.creator.display_name || 'A').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {track.creator.display_name || track.creator.username}
                  </p>
                  <p className="text-sm text-muted-foreground">Artist</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Videos using this sound */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Video className="w-5 h-5" />
            Videos using this sound ({usages.length})
          </h2>

          {usages.length === 0 ? (
            <Card className="p-8 text-center bg-card border-border">
              <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No videos are using this sound yet</p>
              <Button className="mt-4" onClick={() => navigate('/upload')}>
                Create a video with this sound
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {usages.map((usage) => (
                usage.video && (
                  <Link key={usage.id} to={`/watch/${usage.video.id}`}>
                    <Card className="overflow-hidden bg-card border-border hover:border-primary/50 transition-colors">
                      <div className="aspect-[9/16] bg-muted relative">
                        {usage.video.thumbnail_url ? (
                          <img 
                            src={usage.video.thumbnail_url} 
                            alt={usage.video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {usage.video.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {usage.video.views || 0} views
                        </p>
                      </div>
                    </Card>
                  </Link>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SoundDetail;
