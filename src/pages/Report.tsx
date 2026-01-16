import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { Link } from 'react-router-dom';

const reasons = [
  'Spam or misleading',
  'Harassment or bullying',
  'Hate speech',
  'Violence',
  'Nudity or sexual content',
  'Copyright',
  'Other',
];

const Report = () => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [videoId, setVideoId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [commentId, setCommentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) {
      toast({ title: 'Sign in required' });
      return;
    }

    if (!reason) {
      toast({ title: 'Missing reason', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reason,
        description: description.trim() || null,
        video_id: videoId.trim() || null,
        channel_id: channelId.trim() || null,
        comment_id: commentId.trim() || null,
      });

      if (error) throw error;
      setReason('');
      setDescription('');
      setVideoId('');
      setChannelId('');
      setCommentId('');
      toast({ title: 'Report submitted', description: 'Thanks for helping keep the community safe.' });
    } catch (e: any) {
      console.error('Error submitting report:', e);
      toast({ title: 'Error', description: e?.message || 'Failed to submit report', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="container max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">Report</h1>
          <p className="text-muted-foreground mt-2">Sign in to submit a report.</p>
          <div className="mt-6">
            <Link to="/auth"><Button>Sign In</Button></Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-3xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Report</h1>
          <p className="text-muted-foreground">Tell us what happened.</p>
        </header>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Submit a report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {reasons.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="video">Video ID (optional)</Label>
                <Input id="video" value={videoId} onChange={e => setVideoId(e.target.value)} className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">Channel ID (optional)</Label>
                <Input id="channel" value={channelId} onChange={e => setChannelId(e.target.value)} className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment">Comment ID (optional)</Label>
                <Input id="comment" value={commentId} onChange={e => setCommentId(e.target.value)} className="bg-input border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Details (optional)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="bg-input border-border min-h-[120px]"
                placeholder="Add context to help reviewers..."
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={submit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit report'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Report;
