import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  MoreVertical,
  Heart,
  Pin,
  Flag,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  video_id: string;
  parent_id: string | null;
  likes_count: number;
  is_pinned: boolean;
  is_hearted: boolean;
  is_edited: boolean;
  created_at: string;
  user?: {
    display_name: string;
    avatar_url: string;
    username: string;
  };
  replies?: Comment[];
}

interface CommentSectionProps {
  videoId: string;
}

export const CommentSection = ({ videoId }: CommentSectionProps) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'top' | 'newest'>('top');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchComments();
  }, [videoId, sortBy]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            display_name,
            avatar_url,
            username
          )
        `)
        .eq('video_id', videoId)
        .is('parent_id', null)
        .order(sortBy === 'top' ? 'likes_count' : 'created_at', { ascending: false });

      if (error) throw error;

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment: any) => {
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              *,
              profiles:user_id (
                display_name,
                avatar_url,
                username
              )
            `)
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true });

          return {
            ...comment,
            user: comment.profiles,
            replies: (replies || []).map((r: any) => ({ ...r, user: r.profiles })),
          };
        })
      );

      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert({
        video_id: videoId,
        user_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment('');
      await fetchComments();

      // Update video comments count directly
      const { data: video } = await supabase
        .from('videos')
        .select('comments_count')
        .eq('id', videoId)
        .single();
      
      if (video) {
        await supabase
          .from('videos')
          .update({ comments_count: (video.comments_count || 0) + 1 })
          .eq('id', videoId);
      }

      toast({ title: 'Comment added!' });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user || !replyContent.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert({
        video_id: videoId,
        user_id: user.id,
        content: replyContent.trim(),
        parent_id: parentId,
      });

      if (error) throw error;

      setReplyingTo(null);
      setReplyContent('');
      setExpandedReplies(prev => new Set([...prev, parentId]));
      await fetchComments();
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editContent.trim(), is_edited: true })
        .eq('id', commentId);

      if (error) throw error;

      setEditingId(null);
      setEditContent('');
      await fetchComments();
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      await fetchComments();
      toast({ title: 'Comment deleted' });
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleLikeComment = async (commentId: string, currentLikes: number) => {
    if (!user) {
      toast({ title: 'Sign in required' });
      return;
    }

    try {
      // Check existing like
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('id, is_like')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        if (existingLike.is_like) {
          await supabase.from('comment_likes').delete().eq('id', existingLike.id);
          await supabase.from('comments').update({ likes_count: currentLikes - 1 }).eq('id', commentId);
        } else {
          await supabase.from('comment_likes').update({ is_like: true }).eq('id', existingLike.id);
          await supabase.from('comments').update({ likes_count: currentLikes + 1 }).eq('id', commentId);
        }
      } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id, is_like: true });
        await supabase.from('comments').update({ likes_count: currentLikes + 1 }).eq('id', commentId);
      }

      await fetchComments();
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const CommentCard = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isReply ? 'ml-12' : ''}`}
    >
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={comment.user?.avatar_url} />
        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
          {comment.user?.display_name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">
            @{comment.user?.username || 'user'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {comment.is_edited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
          {comment.is_pinned && (
            <Pin className="w-3 h-3 text-primary" />
          )}
        </div>

        {editingId === comment.id ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="bg-input border-border min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleEditComment(comment.id)}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground mt-1">{comment.content}</p>
        )}

        <div className="flex items-center gap-1 mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => handleLikeComment(comment.id, comment.likes_count)}
          >
            <ThumbsUp className="w-4 h-4 mr-1" />
            {comment.likes_count > 0 && comment.likes_count}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ThumbsDown className="w-4 h-4" />
          </Button>
          {comment.is_hearted && (
            <Heart className="w-4 h-4 text-destructive fill-destructive" />
          )}
          {!isReply && user && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setReplyingTo(comment.id)}
            >
              Reply
            </Button>
          )}

          {user && (user.id === comment.user_id) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-card border-border">
                <DropdownMenuItem onClick={() => {
                  setEditingId(comment.id);
                  setEditContent(comment.content);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Reply Input */}
        {replyingTo === comment.id && (
          <div className="mt-3 flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {profile?.display_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Add a reply..."
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                className="bg-input border-border min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={!replyContent.trim() || submitting}
                >
                  Reply
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary h-8"
              onClick={() => toggleReplies(comment.id)}
            >
              {expandedReplies.has(comment.id) ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Hide {comment.replies.length} replies
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  {comment.replies.length} replies
                </>
              )}
            </Button>

            <AnimatePresence>
              {expandedReplies.has(comment.id) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 mt-3"
                >
                  {comment.replies.map(reply => (
                    <CommentCard key={reply.id} comment={reply} isReply />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h3 className="font-medium text-foreground">
          {comments.length} Comments
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Sort by
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-card border-border">
            <DropdownMenuItem onClick={() => setSortBy('top')}>
              Top comments
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('newest')}>
              Newest first
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Add Comment */}
      {user ? (
        <div className="flex gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {profile?.display_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="bg-input border-border min-h-[60px] focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setNewComment('')}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Comment'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-secondary rounded-xl p-4 text-center">
          <p className="text-muted-foreground">
            Sign in to leave a comment
          </p>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map(comment => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
};
