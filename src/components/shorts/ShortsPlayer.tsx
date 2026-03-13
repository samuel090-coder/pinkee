import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Share2,
  ThumbsDown,
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  MoreVertical,
  ArrowLeft,
  Search,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Video } from "@/contexts/VideoContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { isExternalUrl, getEmbedUrl } from "@/lib/video-utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface ShortsPlayerProps {
  shorts: Video[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
}

export function ShortsPlayer({ shorts, currentIndex, setCurrentIndex }: ShortsPlayerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [subscribedChannels, setSubscribedChannels] = useState<Set<string>>(new Set());
  const [subscribing, setSubscribing] = useState(false);
  
  // Comments
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Fetch user's likes and subscriptions
  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      const [likesRes, subsRes] = await Promise.all([
        supabase
          .from("video_likes")
          .select("video_id")
          .eq("user_id", user.id)
          .eq("is_like", true),
        supabase
          .from("subscriptions")
          .select("channel_id")
          .eq("subscriber_id", user.id),
      ]);
      if (likesRes.data) {
        setLikedVideos(new Set(likesRes.data.map((l) => l.video_id)));
      }
      if (subsRes.data) {
        // Map channel_id (profile.id) to uploader user_ids for matching
        const channelIds = subsRes.data.map((s) => s.channel_id);
        if (channelIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, user_id")
            .in("id", channelIds);
          if (profiles) {
            setSubscribedChannels(new Set(profiles.map((p) => p.user_id)));
          }
        }
      }
    };
    fetchUserData();
  }, [user]);

  // Initialize like counts
  useEffect(() => {
    const counts: Record<string, number> = {};
    shorts.forEach((s) => {
      counts[s.id] = s.likes_count || 0;
    });
    setLikeCounts(counts);
  }, [shorts]);

  // Intersection observer for auto-play (direct video files only)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const index = videoRefs.current.indexOf(video);
          if (index < 0) return;

          if (entry.isIntersecting) {
            video.play().catch(() => {});
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
  }, [shorts, setCurrentIndex]);

  const togglePlay = (index: number) => {
    const short = shorts[index];
    if (short && isExternalUrl(short.video_url)) {
      navigate(`/watch/${short.id}`);
      return;
    }

    const video = videoRefs.current[index];
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const handleLike = async (videoId: string) => {
    if (!user) {
      toast({ title: "Sign in to like videos" });
      return;
    }
    const isLiked = likedVideos.has(videoId);
    setLikedVideos((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [videoId]: (prev[videoId] || 0) + (isLiked ? -1 : 1),
    }));
    try {
      if (isLiked) {
        await supabase.from("video_likes").delete().eq("user_id", user.id).eq("video_id", videoId);
      } else {
        await supabase.from("video_likes").upsert({ user_id: user.id, video_id: videoId, is_like: true });
      }
    } catch (e) {
      console.error("Error liking:", e);
    }
  };

  const openComments = async (videoId: string) => {
    setActiveVideoId(videoId);
    setCommentsOpen(true);
    setLoadingComments(true);
    try {
      const { data } = await supabase
        .from("comments")
        .select("id, content, user_id, created_at")
        .eq("video_id", videoId)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) {
        const userIds = [...new Set(data.map((c) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", userIds);
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
        setComments(
          data.map((c) => ({
            ...c,
            profile: profileMap.get(c.user_id) || undefined,
          }))
        );
      }
    } catch (e) {
      console.error("Error fetching comments:", e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !activeVideoId || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({ video_id: activeVideoId, user_id: user.id, content: newComment.trim() })
        .select("id, content, user_id, created_at")
        .single();
      if (error) throw error;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("user_id", user.id)
        .single();
      setComments((prev) => [{ ...data, profile: profile || undefined }, ...prev]);
      setNewComment("");
      toast({ title: "Comment added!" });
    } catch (e) {
      console.error("Error posting comment:", e);
      toast({ title: "Failed to post comment", variant: "destructive" });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubscribe = async (uploaderId: string | null | undefined) => {
    if (!user) {
      toast({ title: "Sign in to subscribe" });
      navigate("/auth");
      return;
    }
    if (!uploaderId || subscribing) return;
    
    setSubscribing(true);
    try {
      // Get the profile id for the channel
      const { data: channelProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", uploaderId)
        .maybeSingle();
      
      if (!channelProfile) {
        toast({ title: "Channel not found", variant: "destructive" });
        return;
      }

      const isSub = subscribedChannels.has(uploaderId);
      if (isSub) {
        await supabase.from("subscriptions").delete()
          .eq("channel_id", channelProfile.id)
          .eq("subscriber_id", user.id);
        setSubscribedChannels(prev => {
          const next = new Set(prev);
          next.delete(uploaderId);
          return next;
        });
        toast({ title: "Unsubscribed" });
      } else {
        await supabase.from("subscriptions").insert({
          channel_id: channelProfile.id,
          subscriber_id: user.id,
        });
        setSubscribedChannels(prev => new Set(prev).add(uploaderId));
        toast({ title: "Subscribed!" });
      }
    } catch (e) {
      console.error("Error subscribing:", e);
      toast({ title: "Failed to subscribe", variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  const handleShare = async (videoId: string) => {
    const url = `${window.location.origin}/shorts?start=${videoId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Check out this short", url });
      } catch (e) {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  if (!shorts.length) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-center px-4">
        <Play className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold text-white mb-2">No Shorts yet</h2>
        <p className="text-white/70 mb-4">Upload a video under 60 seconds to see it here</p>
        <Button onClick={() => navigate("/upload")}>Create Short</Button>
      </div>
    );
  }

  return (
    <>
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/50 to-transparent">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white">
            <Search className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white">
            <MoreVertical className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Videos container */}
      <div
        ref={containerRef}
        className="fixed inset-0 bg-black snap-y snap-mandatory overflow-y-scroll"
      >
        {shorts.map((short, index) => {
          const uploader = short.uploader_profile;
          const channelName = uploader?.channel_name || uploader?.display_name || uploader?.username || "Unknown";
          const avatarUrl = uploader?.avatar_url || short.poster?.avatar_url;
          const isLiked = likedVideos.has(short.id);
          const likeCount = likeCounts[short.id] || 0;
          const uploaderId = uploader?.user_id || short.uploader_id;
          const isSub = uploaderId ? subscribedChannels.has(uploaderId) : false;
          const isOwnVideo = user && uploaderId === user.id;
          const isExternal = isExternalUrl(short.video_url);

          return (
            <div key={short.id} className="relative h-screen w-full snap-start">
              {/* Video */}
              {isExternal ? (
                <iframe
                  src={short.video_url ? getEmbedUrl(short.video_url) : undefined}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={short.title}
                />
              ) : (
                <video
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  src={short.video_url || undefined}
                  poster={short.thumbnail_url || undefined}
                  className="absolute inset-0 w-full h-full object-cover"
                  loop
                  muted={muted}
                  playsInline
                  onClick={() => togglePlay(index)}
                />
              )}

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

              {/* Right side actions - YouTube style */}
              <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
                {/* Like */}
                <button onClick={() => handleLike(short.id)} className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    isLiked ? "bg-transparent" : "bg-transparent"
                  )}>
                    <Heart className={cn("w-7 h-7", isLiked ? "text-white fill-white" : "text-white")} />
                  </div>
                  <span className="text-white text-xs font-medium">{formatNumber(likeCount)}</span>
                </button>

                {/* Dislike */}
                <button className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center">
                    <ThumbsDown className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">Dislike</span>
                </button>

                {/* Comment */}
                <button onClick={() => openComments(short.id)} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">{formatNumber(short.comments_count || 0)}</span>
                </button>

                {/* Share */}
                <button onClick={() => handleShare(short.id)} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center">
                    <Share2 className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">Share</span>
                </button>

                {/* Remix */}
                <button className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">Remix</span>
                </button>

                {/* Sound Disc */}
                <motion.div
                  animate={{ rotate: playing && index === currentIndex ? 360 : 0 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white/30"
                >
                  {short.thumbnail_url ? (
                    <img src={short.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                      <Music className="w-5 h-5 text-white" />
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Bottom info - YouTube style */}
              <div className="absolute left-4 right-20 bottom-20 space-y-3">
                {/* Category tag */}
                {short.category && (
                  <div className="inline-block px-2 py-1 bg-primary/80 rounded text-xs font-medium text-primary-foreground">
                    {short.category}
                  </div>
                )}

                {/* Channel info */}
                <div className="flex items-center gap-3">
                  <Link to={uploaderId ? `/channel/${uploaderId}` : "#"}>
                    <Avatar className="w-10 h-10 border-2 border-foreground/20">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {channelName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <Link to={uploaderId ? `/channel/${uploaderId}` : "#"} className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                      @{uploader?.username || channelName}
                    </p>
                  </Link>
                  {!isOwnVideo && (
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      onClick={() => handleSubscribe(uploaderId)}
                      disabled={subscribing}
                      className={cn(
                        "rounded-full px-4 h-8",
                        isSub 
                          ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" 
                          : "bg-white text-black hover:bg-white/90"
                      )}
                    >
                      {isSub ? "Subscribed" : "Subscribe"}
                    </Button>
                  )}
                </div>

                {/* Title/Description */}
                <p className="text-white/90 text-sm line-clamp-2">{short.title}</p>

                {/* Sound bar */}
                <div className="flex items-center gap-2 max-w-[250px]">
                  <Music className="w-4 h-4 text-white shrink-0" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-white text-xs truncate animate-marquee">
                      Original Sound - {channelName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Volume toggle */}
              <button
                onClick={() => setMuted(!muted)}
                className="absolute top-20 right-4 w-9 h-9 bg-black/30 rounded-full flex items-center justify-center"
              >
                {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
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
                    <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center">
                      <Play className="w-10 h-10 text-white" fill="white" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Comments Sheet */}
      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl bg-card border-border">
          <SheetHeader className="pb-2 border-b border-border">
            <SheetTitle className="text-center">
              {comments.length} Comments
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[calc(70vh-120px)]">
            {loadingComments ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No comments yet. Be the first!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {comment.profile?.display_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">
                      {comment.profile?.display_name || comment.profile?.username || "User"}
                    </p>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {user && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
                  className="flex-1 bg-secondary border-0"
                />
                <Button onClick={handleSubmitComment} disabled={submittingComment || !newComment.trim()}>
                  Post
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
