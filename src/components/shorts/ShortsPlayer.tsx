import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Search,
  Loader2,
  Bookmark,
  Plus,
  Share,
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
import { useAdaptivePlayback } from "@/hooks/use-adaptive-playback";
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
  const [savedVideos, setSavedVideos] = useState<Set<string>>(new Set());
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [topTab, setTopTab] = useState<"explore" | "following" | "foryou">("foryou");

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
      const [realRes, seedRes] = await Promise.all([
        supabase
          .from("comments")
          .select("id, content, user_id, created_at")
          .eq("video_id", videoId)
          .is("parent_id", null)
          .order("created_at", { ascending: false })
          .limit(50),
        (supabase as any)
          .from("seed_comments")
          .select("*")
          .eq("video_id", videoId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const real = realRes.data || [];
      const userIds = [...new Set(real.map((c: any) => c.user_id))];
      let profileMap = new Map<string, any>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }

      const realComments: Comment[] = real.map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id) || undefined,
      }));

      const seedComments: Comment[] = (seedRes.data || []).map((s: any) => ({
        id: `seed_${s.id}`,
        content: s.content,
        user_id: `seed_${s.id}`,
        created_at: s.created_at,
        profile: {
          display_name: s.display_name,
          username: (s.display_name || "user").toLowerCase().replace(/\s+/g, ""),
          avatar_url: s.avatar_url,
        },
      }));

      const merged = [...realComments, ...seedComments].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setComments(merged);
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
      {/* Top bar - TikTok style tabs */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-3 pb-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="w-8" />
        <div className="flex items-center gap-5 text-[15px] font-semibold">
          {(["explore", "following", "foryou"] as const).map((tab) => {
            const label = tab === "explore" ? "Explore" : tab === "following" ? "Following" : "For You";
            const active = topTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setTopTab(tab)}
                className="relative flex flex-col items-center"
              >
                <span className={cn("relative", active ? "text-white" : "text-white/60")}>
                  {label}
                  {tab === "following" && (
                    <span className="absolute -top-0.5 -right-2 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </span>
                {active && (
                  <span className="mt-1 h-[3px] w-6 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>
        <button className="text-white p-1" aria-label="Search">
          <Search className="w-6 h-6" />
        </button>
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
          const isSaved = savedVideos.has(short.id);
          const isExpanded = expandedCaptions.has(short.id);
          const isExternal = isExternalUrl(short.video_url);
          if (isExternal) {
            videoRefs.current[index] = null;
          }

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
                <ShortVideo
                  src={short.video_url}
                  poster={short.thumbnail_url}
                  muted={muted}
                  onClick={() => togglePlay(index)}
                  onDoubleTap={() => {
                    if (!likedVideos.has(short.id)) handleLike(short.id);
                  }}
                  refCallback={(el) => {
                    videoRefs.current[index] = el;
                  }}
                />
              )}

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

              {/* Right side actions - TikTok style */}
              <div className="absolute right-2.5 bottom-24 flex flex-col items-center gap-5">
                {/* Avatar + subscribe pill */}
                <div className="relative mb-2">
                  <Link to={uploaderId ? `/channel/${uploaderId}` : "#"}>
                    <Avatar className="w-12 h-12 border-2 border-white">
                      <AvatarImage src={avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {channelName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  {!isOwnVideo && !isSub && (
                    <button
                      onClick={() => handleSubscribe(uploaderId)}
                      disabled={subscribing}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-black shadow-lg"
                      aria-label="Subscribe"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </button>
                  )}
                </div>

                {/* Like */}
                <button onClick={() => handleLike(short.id)} className="flex flex-col items-center gap-1">
                  <Heart className={cn("w-9 h-9 drop-shadow-md transition-transform active:scale-125", isLiked ? "text-primary fill-primary" : "text-white fill-white/95")} />
                  <span className="text-white text-[12px] font-semibold drop-shadow">{formatNumber(likeCount)}</span>
                </button>

                {/* Comment */}
                <button onClick={() => openComments(short.id)} className="flex flex-col items-center gap-1">
                  <MessageCircle className="w-9 h-9 text-white fill-white/95 drop-shadow-md" />
                  <span className="text-white text-[12px] font-semibold drop-shadow">{formatNumber(short.comments_count || 0)}</span>
                </button>

                {/* Bookmark / Save */}
                <button
                  onClick={() => {
                    setSavedVideos((prev) => {
                      const next = new Set(prev);
                      if (next.has(short.id)) next.delete(short.id);
                      else next.add(short.id);
                      return next;
                    });
                    toast({ title: isSaved ? "Removed from favorites" : "Saved to favorites" });
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <Bookmark className={cn("w-9 h-9 drop-shadow-md", isSaved ? "text-yellow-400 fill-yellow-400" : "text-white fill-white/95")} />
                  <span className="text-white text-[12px] font-semibold drop-shadow">
                    {formatNumber(Math.floor((short.likes_count || 0) * 0.35)) || "Save"}
                  </span>
                </button>

                {/* Share */}
                <button onClick={() => handleShare(short.id)} className="flex flex-col items-center gap-1">
                  <Share className="w-9 h-9 text-white fill-white/95 drop-shadow-md" />
                  <span className="text-white text-[12px] font-semibold drop-shadow">Share</span>
                </button>

                {/* Sound Disc */}
                <motion.div
                  animate={{ rotate: playing && index === currentIndex ? 360 : 0 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/70 shadow-lg mt-1"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                      <Music className="w-5 h-5 text-white" />
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Bottom info - TikTok style */}
              <div className="absolute left-4 right-20 bottom-6 space-y-2">
                <Link to={uploaderId ? `/channel/${uploaderId}` : "#"}>
                  <p className="text-white font-bold text-base drop-shadow">
                    {channelName}
                  </p>
                </Link>
                <p className="text-white/95 text-sm leading-snug drop-shadow">
                  {isExpanded || (short.title?.length || 0) <= 80 ? (
                    short.title
                  ) : (
                    <>
                      {short.title?.slice(0, 80)}...{" "}
                      <button
                        onClick={() =>
                          setExpandedCaptions((prev) => new Set(prev).add(short.id))
                        }
                        className="text-white/80 font-semibold"
                      >
                        more
                      </button>
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2 max-w-[260px] pt-0.5">
                  <Music className="w-3.5 h-3.5 text-white shrink-0" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-white text-xs truncate">
                      Original Sound - {channelName}
                    </p>
                  </div>
                </div>
              </div>


              {/* Volume toggle */}
              {!isExternal && (
                <button
                  onClick={() => setMuted(!muted)}
                  className="absolute top-20 right-4 w-9 h-9 bg-black/30 rounded-full flex items-center justify-center"
                >
                  {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                </button>
              )}

              {/* Play/Pause indicator */}
              <AnimatePresence>
                {!isExternal && !playing && index === currentIndex && (
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

interface ShortVideoProps {
  src: string | null | undefined;
  poster: string | null | undefined;
  muted: boolean;
  onClick: () => void;
  onDoubleTap?: () => void;
  refCallback: (el: HTMLVideoElement | null) => void;
}

function ShortVideo({ src, poster, muted, onClick, onDoubleTap, refCallback }: ShortVideoProps) {
  const localRef = useRef<HTMLVideoElement>(null);
  const [buffering, setBuffering] = useState(true);
  const [tapBurst, setTapBurst] = useState<null | "play" | "pause">(null);
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useAdaptivePlayback(localRef, src);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (now - lastTapRef.current < 280) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      setHeartBurst({ x, y });
      setTimeout(() => setHeartBurst(null), 800);
      onDoubleTap?.();
      return;
    }
    lastTapRef.current = now;
    singleTapTimerRef.current = setTimeout(() => {
      const v = localRef.current;
      setTapBurst(v && !v.paused ? "pause" : "play");
      setTimeout(() => setTapBurst(null), 500);
      onClick();
      singleTapTimerRef.current = null;
    }, 260);
  };

  return (
    <div className="absolute inset-0" onClick={handleTap}>
      <video
        ref={(el) => {
          localRef.current = el;
          refCallback(el);
        }}
        poster={poster || undefined}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted={muted}
        playsInline
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
      />

      {buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-10 h-10 text-white/80 animate-spin" />
        </div>
      )}

      <AnimatePresence>
        {tapBurst && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              {tapBurst === "play" ? (
                <Play className="w-10 h-10 text-white ml-1" fill="currentColor" />
              ) : (
                <Pause className="w-10 h-10 text-white" fill="currentColor" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {heartBurst && (
          <motion.div
            key={`${heartBurst.x}-${heartBurst.y}`}
            initial={{ opacity: 0, scale: 0.4, y: 0 }}
            animate={{ opacity: 1, scale: 1.2, y: -20 }}
            exit={{ opacity: 0, scale: 1.6, y: -60 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute pointer-events-none"
            style={{ left: heartBurst.x - 40, top: heartBurst.y - 40 }}
          >
            <Heart className="w-20 h-20 text-white fill-white drop-shadow-[0_0_12px_rgba(236,72,153,0.9)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

