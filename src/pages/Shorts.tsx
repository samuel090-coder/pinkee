import { useMemo, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, Music, Volume2, VolumeX, Play, Pause,
  Bookmark, MoreVertical, Send, Copy, Flag
} from 'lucide-react';
import { useVideo } from '@/contexts/VideoContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

const Shorts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startVideoId = searchParams.get('start');
  
  const { user } = useAuth();
  const { videos } = useVideo();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  
  // Interactions state
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  
  // Comments state
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Share state
  const [shareOpen, setShareOpen] = useState(false);

  const shorts = useMemo(() => {
    const allShorts = [...videos]
      .filter(v => v.is_published)
      .filter(v => {
        const dur = v.duration || 0;
        const category = (v.category || '').toLowerCase();
        return category === 'shorts' || (dur > 0 && dur <= 60);
      })
      .slice(0, 30);
    
    // If we have a start video ID, reorder to put it first
    if (startVideoId) {
      const startIndex = allShorts.findIndex(v => v.id === startVideoId);
      if (startIndex > 0) {
        const [startVideo] = allShorts.splice(startIndex, 1);
        allShorts.unshift(startVideo);
      }
    }
    
    return allShorts;
  }, [videos, startVideoId]);

  // Fetch user's likes
  useEffect(() => {
    if (!user) return;
    
    const fetchLikes = async () => {
      const { data } = await supabase
        .from('video_likes')
        .select('video_id')
        .eq('user_id', user.id)
        .eq('is_like', true);
      
      if (data) {
        setLikedVideos(new Set(data.map(l => l.video_id)));
      }
    };
    
    fetchLikes();
  }, [user]);

  // Initialize like counts
  useEffect(() => {
    const counts: Record<string, number> = {};
    shorts.forEach(s => {
      counts[s.id] = s.likes_count || 0;
    });
    setLikeCounts(counts);
  }, [shorts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const index = videoRefs.current.indexOf(video);
          
          if (entry.isIntersecting) {
            video.play();
            setPlaying(true);
            setCurrentIndex(index);
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

  const handleLike = async (videoId: string) => {
    if (!user) {
      toast({ title: 'Sign in to like videos' });
      return;
    }

    const isLiked = likedVideos.has(videoId);
    
    // Optimistic update
    setLikedVideos(prev => {
      const next = new Set(prev);
      if (isLiked) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
    
    setLikeCounts(prev => ({
      ...prev,
      [videoId]: (prev[videoId] || 0) + (isLiked ? -1 : 1)
    }));

    try {
      if (isLiked) {
        await supabase.from('video_likes').delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
      } else {
        await supabase.from('video_likes').upsert({
          user_id: user.id,
          video_id: videoId,
          is_like: true
        });
        
        // Update video likes count
        await supabase.from('videos').update({
          likes_count: (likeCounts[videoId] || 0) + 1
        }).eq('id', videoId);
      }
    } catch (e) {
      console.error('Error liking:', e);
      // Revert on error
      setLikedVideos(prev => {
        const next = new Set(prev);
        if (isLiked) {
          next.add(videoId);
        } else {
          next.delete(videoId);
        }
        return next;
      });
    }
  };

  const handleSave = async (videoId: string) => {
    if (!user) {
      toast({ title: 'Sign in to save videos' });
      return;
    }

    const isSaved = savedVideos.has(videoId);
    
    setSavedVideos(prev => {
      const next = new Set(prev);
      if (isSaved) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
    
    toast({ title: isSaved ? 'Removed from saved' : 'Saved to Watch Later' });
  };

  const openComments = async (videoId: string) => {
    setActiveVideoId(videoId);
    setCommentsOpen(true);
    setLoadingComments(true);
    
    try {
      const { data } = await supabase
        .from('comments')
        .select('id, content, user_id, created_at')
        .eq('video_id', videoId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) {
        // Fetch profiles
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
        
        setComments(data.map(c => ({
          ...c,
          profile: profileMap.get(c.user_id) || undefined
        })));
      }
    } catch (e) {
      console.error('Error fetching comments:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !activeVideoId || !newComment.trim()) return;
    
    setSubmittingComment(true);
    
    try {
      const { data, error } = await supabase.from('comments').insert({
        video_id: activeVideoId,
        user_id: user.id,
        content: newComment.trim()
      }).select('id, content, user_id, created_at').single();
      
      if (error) throw error;
      
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('user_id', user.id)
        .single();
      
      setComments(prev => [{
        ...data,
        profile: profile || undefined
      }, ...prev]);
      
      setNewComment('');
      toast({ title: 'Comment added!' });
    } catch (e) {
      console.error('Error posting comment:', e);
      toast({ title: 'Failed to post comment', variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async (videoId: string) => {
    const url = `${window.location.origin}/watch/${videoId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this video',
          url
        });
      } catch (e) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied!' });
    }
  };

  const handleReport = (videoId: string) => {
    navigate(`/report?video=${videoId}`);
  };

  const viewSound = (short: any) => {
    // Navigate to sound detail page
    navigate(`/sound/${short.id}`);
  };

  if (!shorts.length) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center text-center px-4">
        <Play className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">No Shorts yet</h2>
        <p className="text-muted-foreground mb-4">Upload a video under 60 seconds to see it here</p>
        <Button onClick={() => navigate('/upload')}>Create Short</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black snap-y snap-mandatory overflow-y-scroll" ref={containerRef}>
      {shorts.map((short, index) => {
        const uploader = short.uploader_profile;
        const channelName = uploader?.channel_name || uploader?.display_name || uploader?.username || 'Unknown';
        const avatarUrl = uploader?.avatar_url || short.poster?.avatar_url;
        const isLiked = likedVideos.has(short.id);
        const likeCount = likeCounts[short.id] || 0;

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
              <Link to={uploader?.user_id ? `/channel/${uploader.user_id}` : '#'} className="relative">
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
              <button onClick={() => handleLike(short.id)} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors",
                  isLiked ? "bg-destructive" : "bg-white/10"
                )}>
                  <Heart className={cn("w-6 h-6", isLiked ? "text-white fill-white" : "text-white")} />
                </div>
                <span className="text-white text-xs font-medium">{formatViews(likeCount)}</span>
              </button>

              {/* Comment */}
              <button onClick={() => openComments(short.id)} className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs font-medium">{formatViews(short.comments_count || 0)}</span>
              </button>

              {/* Save */}
              <button onClick={() => handleSave(short.id)} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-sm",
                  savedVideos.has(short.id) ? "bg-primary" : "bg-white/10"
                )}>
                  <Bookmark className={cn("w-6 h-6", savedVideos.has(short.id) ? "text-white fill-white" : "text-white")} />
                </div>
                <span className="text-white text-xs font-medium">Save</span>
              </button>

              {/* Share */}
              <button onClick={() => handleShare(short.id)} className="flex flex-col items-center gap-1">
                <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs font-medium">Share</span>
              </button>

              {/* More */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex flex-col items-center gap-1">
                    <div className="w-11 h-11 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <MoreVertical className="w-6 h-6 text-white" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border">
                  <DropdownMenuItem onClick={() => handleReport(short.id)}>
                    <Flag className="w-4 h-4 mr-2" /> Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sound Disc */}
              <button onClick={() => viewSound(short)}>
                <motion.div
                  animate={{ rotate: playing && index === currentIndex ? 360 : 0 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-zinc-700 flex items-center justify-center"
                >
                  <Music className="w-5 h-5 text-white" />
                </motion.div>
              </button>
            </div>

            {/* Bottom info */}
            <div className="absolute left-4 right-20 bottom-8 space-y-3">
              <Link to={uploader?.user_id ? `/channel/${uploader.user_id}` : '#'}>
                <p className="text-white font-semibold">@{uploader?.username || channelName}</p>
              </Link>
              <p className="text-white/90 text-sm line-clamp-2">{short.title}</p>
              {short.description && (
                <p className="text-white/70 text-xs line-clamp-1">{short.description}</p>
              )}
              
              {/* Sound bar - clickable */}
              <button 
                onClick={() => viewSound(short)}
                className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 w-fit backdrop-blur-sm hover:bg-white/20 transition-colors"
              >
                <Music className="w-4 h-4 text-white" />
                <span className="text-white text-xs truncate max-w-[150px]">Original Sound</span>
              </button>
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
            <AnimatePresence>
              {!playing && index === currentIndex && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div className="h-full bg-white w-0 transition-all" />
            </div>
          </div>
        );
      })}

      {/* Comments Sheet */}
      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent side="bottom" className="h-[70vh] bg-card">
          <SheetHeader>
            <SheetTitle>Comments</SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col h-full">
            {/* Comments list */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No comments yet. Be the first!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {(comment.profile?.display_name || 'U').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {comment.profile?.display_name || comment.profile?.username || 'User'}
                      </p>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Comment input */}
            {user ? (
              <div className="flex gap-2 py-4 border-t border-border">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-input border-border"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                />
                <Button 
                  size="icon" 
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submittingComment}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="py-4 border-t border-border text-center">
                <Button variant="link" onClick={() => navigate('/auth')}>
                  Sign in to comment
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Shorts;
