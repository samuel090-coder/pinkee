import { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Music, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useVideo } from '@/contexts/VideoContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const Shorts = () => {
  const { videos } = useVideo();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const shorts = useMemo(() => {
    return [...videos]
      .filter(v => v.is_published)
      .filter(v => (v.duration || 0) > 0 && (v.duration || 0) <= 60)
      .slice(0, 30);
  }, [videos]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play();
            setPlaying(true);
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.7 }
    );

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => observer.disconnect();
  }, [shorts]);

  const formatViews = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const togglePlay = (index: number) => {
    const video = videoRefs.current[index];
    if (!video) return;
    
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  if (!shorts.length) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Play className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">No Shorts yet</h2>
          <p className="text-muted-foreground">Upload a video under 60 seconds to see it here</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <div className="fixed inset-0 bg-black snap-y snap-mandatory overflow-y-scroll" ref={containerRef}>
      {shorts.map((short, index) => {
        const uploader = short.uploader_profile;
        const channelName = uploader?.channel_name || uploader?.display_name || uploader?.username || 'Unknown';
        const avatarUrl = uploader?.avatar_url || short.poster?.avatar_url;

        return (
          <div
            key={short.id}
            className="relative h-screen w-full snap-start flex items-center justify-center"
          >
            {/* Video */}
            <video
              ref={(el) => { videoRefs.current[index] = el; }}
              src={short.video_url || undefined}
              poster={short.thumbnail_url || undefined}
              className="absolute inset-0 w-full h-full object-cover"
              loop
              muted={muted}
              playsInline
              onClick={() => togglePlay(index)}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Right side actions */}
            <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
              {/* Profile */}
              <Link to={uploader?.id ? `/channel/${uploader.id}` : '#'} className="relative">
                <Avatar className="w-12 h-12 border-2 border-white">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {channelName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">+</span>
                </div>
              </Link>

              {/* Like */}
              <button className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs font-medium">{formatViews(short.likes_count || 0)}</span>
              </button>

              {/* Comment */}
              <Link to={`/watch/${short.id}`} className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs font-medium">{formatViews(short.comments_count || 0)}</span>
              </Link>

              {/* Share */}
              <button className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs font-medium">Share</span>
              </button>

              {/* Sound Disc */}
              <motion.div
                animate={{ rotate: playing ? 360 : 0 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-zinc-700 flex items-center justify-center"
              >
                <Music className="w-5 h-5 text-white" />
              </motion.div>
            </div>

            {/* Bottom info */}
            <div className="absolute left-4 right-20 bottom-8 space-y-3">
              <Link to={uploader?.id ? `/channel/${uploader.id}` : '#'}>
                <p className="text-white font-semibold">@{uploader?.username || channelName}</p>
              </Link>
              <p className="text-white/90 text-sm line-clamp-2">{short.title}</p>
              {short.description && (
                <p className="text-white/70 text-xs line-clamp-1">{short.description}</p>
              )}
              
              {/* Sound bar */}
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 w-fit backdrop-blur-sm">
                <Music className="w-4 h-4 text-white" />
                <span className="text-white text-xs truncate max-w-[150px]">Original Sound</span>
              </div>
            </div>

            {/* Volume toggle */}
            <button
              onClick={() => setMuted(!muted)}
              className="absolute top-16 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm"
            >
              {muted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Play/Pause indicator */}
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
              </div>
            )}

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div className="h-full bg-white w-0 transition-all" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Shorts;
