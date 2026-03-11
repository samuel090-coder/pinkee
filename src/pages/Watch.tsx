import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Download,
  MoreHorizontal,
  Flag,
  Save,
  Scissors,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  Settings,
  Loader2,
  Bell,
  BellOff,
  CheckCircle,
  Crown,
  Lock,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { MainLayout } from '@/components/layout/MainLayout';
import { VideoCardNew } from '@/components/video/VideoCardNew';
import { CommentSection } from '@/components/watch/CommentSection';
import { PremiumVideoOverlay } from '@/components/video/PremiumVideoOverlay';
import { useVideo } from '@/contexts/VideoContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { videos, incrementViews, addWatchTime, getRandomAdCode } = useVideo();
  const { user, profile } = useAuth();

  const video = videos.find(v => v.id === id);
  const relatedVideos = videos.filter(v => v.id !== id).slice(0, 10);

  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const watchTimeRef = useRef(0);

  // Interaction state
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [likesCount, setLikesCount] = useState(video?.likes_count || 0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(false);

  // Ad state
  const [showAd, setShowAd] = useState(false);
  const [adTimeRemaining, setAdTimeRemaining] = useState(0);
  const [adHtml, setAdHtml] = useState<string | null>(null);
  const lastAdTimeRef = useRef(0);

  // Check premium access
  useEffect(() => {
    if (!video) return;
    
    const checkPremiumAccess = async () => {
      // If not premium, grant access
      if (!video.is_premium) {
        setHasAccess(true);
        return;
      }
      
      // If not logged in, no access
      if (!user) {
        setHasAccess(false);
        return;
      }

      setCheckingAccess(true);
      try {
        // Check if user is the uploader
        if (video.uploader_id === user.id) {
          setHasAccess(true);
          return;
        }

        // Check for existing purchase
        const { data: purchase } = await supabase
          .from('video_purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('video_id', video.id)
          .maybeSingle();

        if (purchase) {
          setHasAccess(true);
          return;
        }

        // Check for active subscription
        const { data: subscription } = await supabase
          .from('premium_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (subscription) {
          setHasAccess(true);
          return;
        }

        setHasAccess(false);
      } catch (error) {
        console.error('Error checking premium access:', error);
        setHasAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkPremiumAccess();
  }, [video, user]);

  // Check user interactions
  useEffect(() => {
    if (!user || !video) return;

    const checkInteractions = async () => {
      // Check like status
      const { data: likeData } = await supabase
        .from('video_likes')
        .select('is_like')
        .eq('video_id', video.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (likeData) {
        setIsLiked(likeData.is_like);
        setIsDisliked(!likeData.is_like);
      }

      // Check subscription (if video has a channel)
      const channelId = video.uploader_profile?.id;
      if (channelId) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('channel_id', channelId)
          .eq('subscriber_id', user.id)
          .maybeSingle();

        setIsSubscribed(!!subData);
      }
    };

    checkInteractions();
  }, [user, video]);

  // View counting
  useEffect(() => {
    if (!video || viewCounted) return;

    const timer = setTimeout(() => {
      incrementViews(video.id);
      setViewCounted(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [video, viewCounted, incrementViews]);

  // Watch time tracking
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && video) {
        watchTimeRef.current += 1;
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (video && watchTimeRef.current > 0) {
        addWatchTime(video.id, watchTimeRef.current);
      }
    };
  }, [isPlaying, video, addWatchTime]);

  // Ad logic
  useEffect(() => {
    if (!video || showAd) return;

    const adFrequency = video.ad_frequency || 5;
    const minutesSinceLastAd = (currentTime - lastAdTimeRef.current) / 60;

    if (minutesSinceLastAd >= adFrequency && currentTime > 0) {
      const adCode = getRandomAdCode();
      if (adCode) {
        videoRef.current?.pause();
        setIsPlaying(false);
        setAdHtml(adCode);
        setAdTimeRemaining(5);
        setShowAd(true);
        lastAdTimeRef.current = currentTime;
      }
    }
  }, [currentTime, video, showAd, getRandomAdCode]);

  // Ad countdown
  useEffect(() => {
    if (!showAd) return;

    const interval = setInterval(() => {
      setAdTimeRemaining(prev => {
        if (prev <= 1) {
          setShowAd(false);
          setAdHtml(null);
          videoRef.current?.play();
          setIsPlaying(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showAd]);

  // Controls auto-hide
  useEffect(() => {
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, showControls]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0];
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleLike = async () => {
    if (!user || !video) {
      toast({ title: 'Sign in required', description: 'Please sign in to like videos' });
      return;
    }

    try {
      if (isLiked) {
        await supabase.from('video_likes').delete().eq('video_id', video.id).eq('user_id', user.id);
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        if (isDisliked) {
          await supabase.from('video_likes').update({ is_like: true }).eq('video_id', video.id).eq('user_id', user.id);
        } else {
          await supabase.from('video_likes').insert({ video_id: video.id, user_id: user.id, is_like: true });
        }
        setIsLiked(true);
        setIsDisliked(false);
        setLikesCount(prev => prev + (isDisliked ? 1 : 1));
      }

      // Update video likes count
      await supabase.from('videos').update({ likes_count: likesCount + (isLiked ? -1 : 1) }).eq('id', video.id);
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  const handleDislike = async () => {
    if (!user || !video) {
      toast({ title: 'Sign in required', description: 'Please sign in to dislike videos' });
      return;
    }

    try {
      if (isDisliked) {
        await supabase.from('video_likes').delete().eq('video_id', video.id).eq('user_id', user.id);
        setIsDisliked(false);
      } else {
        if (isLiked) {
          await supabase.from('video_likes').update({ is_like: false }).eq('video_id', video.id).eq('user_id', user.id);
          setLikesCount(prev => prev - 1);
        } else {
          await supabase.from('video_likes').insert({ video_id: video.id, user_id: user.id, is_like: false });
        }
        setIsDisliked(true);
        setIsLiked(false);
      }
    } catch (error) {
      console.error('Error disliking video:', error);
    }
  };

  const handleSubscribe = async () => {
    const channelId = video?.uploader_profile?.id;
    const channelName =
      video?.uploader_profile?.channel_name ||
      video?.uploader_profile?.display_name ||
      video?.uploader_profile?.username ||
      'this channel';

    if (!user || !channelId) {
      toast({ title: 'Sign in required', description: 'Please sign in to subscribe' });
      return;
    }

    try {
      if (isSubscribed) {
        await supabase.from('subscriptions').delete().eq('channel_id', channelId).eq('subscriber_id', user.id);
        setIsSubscribed(false);
        toast({ title: 'Unsubscribed' });
      } else {
        await supabase.from('subscriptions').insert({ channel_id: channelId, subscriber_id: user.id });
        setIsSubscribed(true);
        toast({ title: 'Subscribed!', description: `You're now subscribed to ${channelName}` });
      }
    } catch (error) {
      console.error('Error subscribing:', error);
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

  const handleShare = async () => {
    try {
      await navigator.share({
        title: video?.title,
        url: window.location.href,
      });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied!' });
    }
  };

  if (!video) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const uploader = video.uploader_profile;
  const channelName =
    uploader?.channel_name ||
    uploader?.display_name ||
    uploader?.username ||
    video.poster?.name ||
    'Unknown Channel';
  const channelHref = uploader?.id
    ? `/channel/${uploader.id}`
    : video.poster?.id
      ? `/poster/${video.poster.id}`
      : '#';
  const channelAvatarUrl = uploader?.avatar_url || video.poster?.avatar_url || undefined;

  return (
    <MainLayout>
      <div className="container max-w-[1800px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2 space-y-4">
            {/* Video Player */}
            <div
              ref={containerRef}
              className="relative bg-black rounded-xl overflow-hidden aspect-video"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => isPlaying && setShowControls(false)}
            >
              {/* Premium Video Overlay */}
              {video.is_premium && !hasAccess && !checkingAccess && (
                <PremiumVideoOverlay
                  videoId={video.id}
                  price={video.premium_price || 0}
                  thumbnailUrl={video.thumbnail_url || video.video_url || undefined}
                  title={video.title}
                  onUnlocked={() => setHasAccess(true)}
                />
              )}

              {checkingAccess && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}

              <video
                ref={videoRef}
                src={hasAccess ? (video.video_url || undefined) : undefined}
                poster={video.thumbnail_url || video.video_url || undefined}
                className={cn(
                  "w-full h-full object-contain",
                  !hasAccess && video.is_premium && "blur-sm"
                )}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                  }
                }}
                onProgress={() => {
                  if (videoRef.current && videoRef.current.buffered.length > 0) {
                    setBuffered(videoRef.current.buffered.end(0));
                  }
                }}
                onEnded={() => setIsPlaying(false)}
                onClick={hasAccess ? togglePlay : undefined}
              />

              {/* Ad Overlay */}
              <AnimatePresence>
                {showAd && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/90 flex items-center justify-center z-20"
                  >
                    <div className="text-center">
                      {adHtml && (
                        <div
                          dangerouslySetInnerHTML={{ __html: adHtml }}
                          className="mb-4"
                        />
                      )}
                      <p className="text-muted-foreground">
                        Ad ends in {adTimeRemaining}s
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Center Play Button */}
              <AnimatePresence>
                {!isPlaying && !showAd && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center pink-glow">
                      <Play className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Controls */}
              <AnimatePresence>
                {showControls && !showAd && (
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
                        style={{ width: `${(buffered / duration) * 100}%` }}
                      />
                      <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="relative z-10"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => skip(-10)}>
                          <SkipBack className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={togglePlay}>
                          {isPlaying ? (
                            <Pause className="w-6 h-6" fill="currentColor" />
                          ) : (
                            <Play className="w-6 h-6" fill="currentColor" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => skip(10)}>
                          <SkipForward className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center gap-2 ml-2">
                          <Button variant="ghost" size="icon" onClick={toggleMute}>
                            {isMuted ? (
                              <VolumeX className="w-5 h-5" />
                            ) : (
                              <Volume2 className="w-5 h-5" />
                            )}
                          </Button>
                          <Slider
                            value={[isMuted ? 0 : volume]}
                            max={1}
                            step={0.1}
                            onValueChange={handleVolumeChange}
                            className="w-20"
                          />
                        </div>

                        <span className="text-sm text-white ml-4">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <Settings className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                          {isFullscreen ? (
                            <Minimize className="w-5 h-5" />
                          ) : (
                            <Maximize className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Video Info */}
            <div className="space-y-4">
              <h1 className="text-xl font-semibold text-foreground">
                {video.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Channel Info */}
                <div className="flex items-center gap-4">
                  {channelHref !== '#' ? (
                    <Link to={channelHref}>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={channelAvatarUrl} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {channelName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">C</AvatarFallback>
                    </Avatar>
                  )}

                  <div>
                    {channelHref !== '#' ? (
                      <Link
                        to={channelHref}
                        className="font-medium text-foreground hover:text-primary flex items-center gap-1"
                      >
                        {channelName}
                        <CheckCircle className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    ) : (
                      <div className="font-medium text-foreground flex items-center gap-1">
                        {channelName}
                        <CheckCircle className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatViews(video.views)} views
                    </p>
                  </div>

                  {uploader?.id && (
                    <Button
                      onClick={handleSubscribe}
                      variant={isSubscribed ? 'secondary' : 'default'}
                      className={isSubscribed ? '' : 'bg-primary hover:bg-primary/90'}
                    >
                      {isSubscribed ? (
                        <>
                          <BellOff className="w-4 h-4 mr-2" />
                          Subscribed
                        </>
                      ) : (
                        'Subscribe'
                      )}
                    </Button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-secondary rounded-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLike}
                      className={`rounded-l-full rounded-r-none ${isLiked ? 'text-primary' : ''}`}
                    >
                      <ThumbsUp className={`w-5 h-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                      {formatViews(likesCount)}
                    </Button>
                    <div className="w-px h-6 bg-border" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDislike}
                      className={`rounded-r-full rounded-l-none ${isDisliked ? 'text-primary' : ''}`}
                    >
                      <ThumbsDown className={`w-5 h-5 ${isDisliked ? 'fill-current' : ''}`} />
                    </Button>
                  </div>

                  <Button variant="secondary" size="sm" className="rounded-full" onClick={handleShare}>
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                  </Button>

                  <Button variant="secondary" size="sm" className="rounded-full">
                    <Download className="w-5 h-5 mr-2" />
                    Download
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="rounded-full">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border">
                      <DropdownMenuItem>
                        <Save className="w-4 h-4 mr-3" />
                        Save to playlist
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Scissors className="w-4 h-4 mr-3" />
                        Clip
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Flag className="w-4 h-4 mr-3" />
                        Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Description */}
              <div className="bg-secondary rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <span>{formatViews(video.views)} views</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</span>
                </div>

                <div className={`text-sm text-muted-foreground ${showDescription ? '' : 'line-clamp-2'}`}>
                  {video.description || 'No description'}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDescription(!showDescription)}
                  className="mt-2 p-0 h-auto text-foreground font-medium"
                >
                  {showDescription ? (
                    <>Show less <ChevronUp className="w-4 h-4 ml-1" /></>
                  ) : (
                    <>Show more <ChevronDown className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </div>

              {/* CTA Button */}
              {video.cta_link && video.cta_text && (
                <a
                  href={video.cta_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full bg-primary hover:bg-primary/90 pink-glow">
                    {video.cta_text}
                  </Button>
                </a>
              )}

              {/* Comments Section */}
              <CommentSection videoId={video.id} />
            </div>
          </div>

          {/* Related Videos */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">Related Videos</h3>
            <div className="space-y-3">
              {relatedVideos.map(v => (
                <VideoCardNew key={v.id} video={v} variant="list" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Watch;
