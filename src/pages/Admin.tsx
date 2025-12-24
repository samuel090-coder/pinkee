import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Eye, EyeOff, LogOut, LayoutDashboard, Video, Settings, 
  BarChart3, Plus, Trash2, Edit, Save, X, Calendar,
  Download, Play, Heart, Clock, TrendingUp, CreditCard, Loader2, Megaphone,
  User, Users, MapPin, Mail, MessageCircle, Send, Bell, Image
} from 'lucide-react';
import { useVideo, Video as VideoType, AdCode, PosterProfile } from '@/contexts/VideoContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  link: string | null;
  is_sent: boolean | null;
  sent_at: string | null;
  created_at: string;
}

const Admin = () => {
  const { 
    videos, 
    loading,
    adminSettings,
    adCodes,
    posterProfiles,
    isAdminAuthenticated, 
    setIsAdminAuthenticated,
    addVideo,
    updateVideo,
    deleteVideo,
    updateAdminSettings,
    addAdCode,
    updateAdCode,
    deleteAdCode,
    addPosterProfile,
    updatePosterProfile,
    deletePosterProfile,
    uploadFile,
    analytics
  } = useVideo();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingAd, setIsAddingAd] = useState(false);
  const [editingAdCode, setEditingAdCode] = useState<AdCode | null>(null);
  const [newAdCode, setNewAdCode] = useState({ name: '', code: '', is_active: true });
  
  // Poster profile states
  const [isAddingPoster, setIsAddingPoster] = useState(false);
  const [editingPoster, setEditingPoster] = useState<PosterProfile | null>(null);
  const [newPoster, setNewPoster] = useState({
    name: '',
    bio: '',
    address: '',
    hobbies: '',
    avatar_url: '',
    email: '',
    whatsapp: '',
    telegram: '',
  });

  // Notification states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isAddingNotification, setIsAddingNotification] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [newNotification, setNewNotification] = useState({
    title: '',
    body: '',
    image_url: '',
    link: '',
  });
  
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    video_url: '',
    duration: 0,
    is_subscription_only: false,
    cta_link: '',
    cta_text: '',
    is_published: true,
    ad_frequency: 5,
    published_at: '',
    poster_id: '',
  });

  const [settingsForm, setSettingsForm] = useState({
    site_name: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    admin_password: '',
    default_ad_frequency: 5,
  });

  useEffect(() => {
    if (adminSettings) {
      setSettingsForm({
        site_name: adminSettings.site_name || 'PlayStream',
        bank_name: adminSettings.bank_name || '',
        bank_account_name: adminSettings.bank_account_name || '',
        bank_account_number: adminSettings.bank_account_number || '',
        admin_password: adminSettings.admin_password || '',
        default_ad_frequency: adminSettings.default_ad_frequency || 5,
      });
    }
  }, [adminSettings]);

  // Fetch notifications and subscriber count
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setNotifications(data);
    };

    const fetchSubscriberCount = async () => {
      const { count } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });
      setSubscriberCount(count || 0);
    };

    if (isAdminAuthenticated) {
      fetchNotifications();
      fetchSubscriberCount();
    }
  }, [isAdminAuthenticated]);

  const handleSendNotification = async () => {
    if (!newNotification.title || !newNotification.body) {
      toast({ title: 'Error', description: 'Title and body are required', variant: 'destructive' });
      return;
    }

    setIsSendingNotification(true);
    try {
      // Save notification to database first
      const { data: savedNotification, error: saveError } = await supabase
        .from('notifications')
        .insert({
          title: newNotification.title,
          body: newNotification.body,
          image_url: newNotification.image_url || null,
          link: newNotification.link || null,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Send push notification via edge function
      const { error: sendError } = await supabase.functions.invoke('send-notification', {
        body: {
          title: newNotification.title,
          body: newNotification.body,
          image_url: newNotification.image_url || null,
          link: newNotification.link || null,
          notification_id: savedNotification.id,
        },
      });

      if (sendError) throw sendError;

      // Refresh notifications list
      const { data: updatedNotifications } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (updatedNotifications) setNotifications(updatedNotifications);

      setNewNotification({ title: '', body: '', image_url: '', link: '' });
      setIsAddingNotification(false);
      toast({ title: 'Success', description: `Notification sent to ${subscriberCount} subscribers` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(notifications.filter(n => n.id !== id));
    toast({ title: 'Deleted', description: 'Notification deleted' });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSettings && password === adminSettings.admin_password) {
      setIsAdminAuthenticated(true);
      toast({ title: 'Welcome!', description: 'Successfully logged in to admin panel' });
    } else {
      toast({ 
        title: 'Error', 
        description: 'Invalid password',
        variant: 'destructive'
      });
    }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    setPassword('');
  };

  const handleAddVideo = async () => {
    if (!newVideo.title) {
      toast({ 
        title: 'Error', 
        description: 'Title is required',
        variant: 'destructive'
      });
      return;
    }
    if (!newVideo.video_url) {
      toast({ 
        title: 'Error', 
        description: 'Please upload a video file',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    await addVideo({
      title: newVideo.title,
      description: newVideo.description || null,
      thumbnail_url: newVideo.thumbnail_url || null,
      video_url: newVideo.video_url,
      duration: newVideo.duration,
      is_subscription_only: newVideo.is_subscription_only,
      cta_link: newVideo.cta_link || null,
      cta_text: newVideo.cta_text || null,
      is_published: newVideo.is_published,
      ad_frequency: newVideo.ad_frequency,
      published_at: newVideo.published_at || null,
      poster_id: newVideo.poster_id || null,
    });
    
    setNewVideo({
      title: '',
      description: '',
      thumbnail_url: '',
      video_url: '',
      duration: 0,
      is_subscription_only: false,
      cta_link: '',
      cta_text: '',
      is_published: true,
      ad_frequency: 5,
      published_at: '',
      poster_id: '',
    });
    setIsAddingVideo(false);
    setIsSaving(false);
  };

  const handleUpdateVideo = async () => {
    if (editingVideo) {
      setIsSaving(true);
      await updateVideo(editingVideo.id, editingVideo);
      setEditingVideo(null);
      setIsSaving(false);
      toast({ title: 'Success', description: 'Video updated successfully' });
    }
  };

  const handleDeleteVideo = async (id: string) => {
    await deleteVideo(id);
  };

  const handleUpdateSettings = async () => {
    setIsSaving(true);
    await updateAdminSettings(settingsForm);
    setIsSaving(false);
  };

  const exportCSV = () => {
    const headers = ['Title', 'Views', 'Reactions', 'Watch Time (min)', 'Status', 'Created'];
    const rows = videos.map(v => [
      v.title,
      v.views,
      v.reactions,
      Math.round(v.watch_time / 60),
      v.is_subscription_only ? 'Premium' : 'Free',
      new Date(v.created_at).toLocaleDateString()
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'playstream-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Analytics exported to CSV' });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Login Screen
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-[150px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md shiny-card rounded-2xl p-8 relative z-10"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center pink-glow">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display font-bold text-2xl">Admin Access</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Enter your password to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full bg-primary pink-glow">
              Login
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">Admin Panel</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-8">
          <TabsList className="glass flex-wrap">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="posters" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Posters</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 relative">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
              {subscriberCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] text-primary-foreground rounded-full flex items-center justify-center">
                  {subscriberCount > 99 ? '99+' : subscriberCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Views', value: analytics.totalViews.toLocaleString(), icon: Eye, color: 'text-blue-400' },
                { label: 'Total Reactions', value: analytics.totalReactions.toLocaleString(), icon: Heart, color: 'text-primary' },
                { label: 'Watch Time', value: formatTime(analytics.totalWatchTime), icon: Clock, color: 'text-green-400' },
                { label: 'Videos', value: analytics.videosCount, icon: Video, color: 'text-purple-400' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="shiny-card rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-muted", stat.color)}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="font-display font-bold text-2xl">{stat.value}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Export Button */}
            <div className="flex justify-end">
              <Button onClick={exportCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

            {/* Video Performance Table */}
            <div className="shiny-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-display font-semibold">Video Performance</h3>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Video</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Views</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Reactions</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">Watch Time</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((video) => (
                      <tr key={video.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {video.thumbnail_url && (
                              <img 
                                src={video.thumbnail_url} 
                                alt="" 
                                className="w-16 h-10 object-cover rounded"
                              />
                            )}
                            <span className="font-medium line-clamp-1">{video.title}</span>
                          </div>
                        </td>
                        <td className="p-4">{video.views.toLocaleString()}</td>
                        <td className="p-4">{video.reactions.toLocaleString()}</td>
                        <td className="p-4 hidden md:table-cell">{formatTime(video.watch_time)}</td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            video.is_subscription_only 
                              ? "bg-primary/20 text-primary" 
                              : "bg-green-500/20 text-green-400"
                          )}>
                            {video.is_subscription_only ? 'Premium' : 'Free'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {videos.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No videos yet. Add your first video!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-display font-semibold text-xl">Manage Videos</h2>
              <Button onClick={() => setIsAddingVideo(true)} className="gap-2 bg-primary pink-glow">
                <Plus className="w-4 h-4" />
                Add Video
              </Button>
            </div>

            {/* Add Video Form */}
            <AnimatePresence>
              {isAddingVideo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="shiny-card rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold">Add New Video</h3>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingVideo(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={newVideo.title}
                        onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                        placeholder="Video title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (seconds)</Label>
                      <Input
                        type="number"
                        value={newVideo.duration}
                        onChange={(e) => setNewVideo({ ...newVideo, duration: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    
                    {/* Video Upload */}
                    <div className="space-y-2">
                      <Label>Video File *</Label>
                      <FileUpload
                        type="video"
                        currentUrl={newVideo.video_url}
                        onUploadComplete={(url) => setNewVideo({ ...newVideo, video_url: url })}
                      />
                    </div>

                    {/* Thumbnail Upload */}
                    <div className="space-y-2">
                      <Label>Thumbnail Image</Label>
                      <FileUpload
                        type="thumbnail"
                        currentUrl={newVideo.thumbnail_url}
                        onUploadComplete={(url) => setNewVideo({ ...newVideo, thumbnail_url: url })}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={newVideo.description}
                        onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                        placeholder="Video description..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CTA Link</Label>
                      <Input
                        value={newVideo.cta_link}
                        onChange={(e) => setNewVideo({ ...newVideo, cta_link: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CTA Text</Label>
                      <Input
                        value={newVideo.cta_text}
                        onChange={(e) => setNewVideo({ ...newVideo, cta_text: e.target.value })}
                        placeholder="Learn More"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Scheduled Publish Date</Label>
                      <Input
                        type="datetime-local"
                        value={newVideo.published_at}
                        onChange={(e) => setNewVideo({ ...newVideo, published_at: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ad Frequency (minutes)</Label>
                      <Input
                        type="number"
                        value={newVideo.ad_frequency}
                        onChange={(e) => setNewVideo({ ...newVideo, ad_frequency: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Poster Profile (optional)</Label>
                      <Select
                        value={newVideo.poster_id}
                        onValueChange={(value) => setNewVideo({ ...newVideo, poster_id: value === 'none' ? '' : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a poster profile" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No poster</SelectItem>
                          {posterProfiles.map((poster) => (
                            <SelectItem key={poster.id} value={poster.id}>
                              <div className="flex items-center gap-2">
                                {poster.avatar_url && (
                                  <img src={poster.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                                )}
                                {poster.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-4 md:col-span-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={newVideo.is_subscription_only}
                          onCheckedChange={(checked) => setNewVideo({ ...newVideo, is_subscription_only: checked })}
                        />
                        <Label>Premium Only</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={newVideo.is_published}
                          onCheckedChange={(checked) => setNewVideo({ ...newVideo, is_published: checked })}
                        />
                        <Label>Published</Label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddingVideo(false)}>Cancel</Button>
                    <Button onClick={handleAddVideo} className="bg-primary" disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Add Video
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Videos List */}
            <div className="space-y-4">
              {videos.map((video) => (
                <motion.div
                  key={video.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="shiny-card rounded-xl p-4"
                >
                  {editingVideo?.id === video.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            value={editingVideo.title}
                            onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <Input
                            type="number"
                            value={editingVideo.duration}
                            onChange={(e) => setEditingVideo({ ...editingVideo, duration: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        
                        {/* Video Upload */}
                        <div className="space-y-2">
                          <Label>Video File</Label>
                          <FileUpload
                            type="video"
                            currentUrl={editingVideo.video_url || ''}
                            onUploadComplete={(url) => setEditingVideo({ ...editingVideo, video_url: url })}
                          />
                        </div>

                        {/* Thumbnail Upload */}
                        <div className="space-y-2">
                          <Label>Thumbnail Image</Label>
                          <FileUpload
                            type="thumbnail"
                            currentUrl={editingVideo.thumbnail_url || ''}
                            onUploadComplete={(url) => setEditingVideo({ ...editingVideo, thumbnail_url: url })}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Description</Label>
                          <Textarea
                            value={editingVideo.description || ''}
                            onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ad Frequency (minutes)</Label>
                          <Input
                            type="number"
                            value={editingVideo.ad_frequency}
                            onChange={(e) => setEditingVideo({ ...editingVideo, ad_frequency: parseInt(e.target.value) || 5 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Poster Profile</Label>
                          <Select
                            value={editingVideo.poster_id || 'none'}
                            onValueChange={(value) => setEditingVideo({ ...editingVideo, poster_id: value === 'none' ? null : value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a poster" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No poster</SelectItem>
                              {posterProfiles.map((poster) => (
                                <SelectItem key={poster.id} value={poster.id}>
                                  <div className="flex items-center gap-2">
                                    {poster.avatar_url && (
                                      <img src={poster.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                                    )}
                                    {poster.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editingVideo.is_subscription_only}
                              onCheckedChange={(checked) => setEditingVideo({ ...editingVideo, is_subscription_only: checked })}
                            />
                            <Label>Premium Only</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={editingVideo.is_published}
                              onCheckedChange={(checked) => setEditingVideo({ ...editingVideo, is_published: checked })}
                            />
                            <Label>Published</Label>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditingVideo(null)}>Cancel</Button>
                        <Button onClick={handleUpdateVideo} className="bg-primary" disabled={isSaving}>
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-center gap-4">
                      {video.thumbnail_url ? (
                        <img 
                          src={video.thumbnail_url} 
                          alt="" 
                          className="w-20 h-14 sm:w-24 sm:h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Video className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{video.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1 hidden sm:block">{video.description}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {video.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {video.reactions}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full",
                            video.is_subscription_only 
                              ? "bg-primary/20 text-primary" 
                              : "bg-green-500/20 text-green-400"
                          )}>
                            {video.is_subscription_only ? 'Premium' : 'Free'}
                          </span>
                          {!video.is_published && (
                            <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                              Draft
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => setEditingVideo(video)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleDeleteVideo(video.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {videos.length === 0 && (
                <div className="shiny-card rounded-xl p-8 text-center">
                  <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No videos yet. Add your first video!</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Posters Tab */}
          <TabsContent value="posters" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-display font-semibold text-xl">Manage Poster Profiles</h2>
              <Button onClick={() => setIsAddingPoster(true)} className="gap-2 bg-primary pink-glow">
                <Plus className="w-4 h-4" />
                Add Poster
              </Button>
            </div>

            {/* Add Poster Form */}
            <AnimatePresence>
              {isAddingPoster && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="shiny-card rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold">Add New Poster Profile</h3>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingPoster(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={newPoster.name}
                        onChange={(e) => setNewPoster({ ...newPoster, name: e.target.value })}
                        placeholder="Poster name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Avatar Image</Label>
                      <FileUpload
                        type="thumbnail"
                        currentUrl={newPoster.avatar_url}
                        onUploadComplete={(url) => setNewPoster({ ...newPoster, avatar_url: url })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Bio</Label>
                      <Textarea
                        value={newPoster.bio}
                        onChange={(e) => setNewPoster({ ...newPoster, bio: e.target.value })}
                        placeholder="Short bio about this poster..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input
                        value={newPoster.address}
                        onChange={(e) => setNewPoster({ ...newPoster, address: e.target.value })}
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hobbies (comma-separated)</Label>
                      <Input
                        value={newPoster.hobbies}
                        onChange={(e) => setNewPoster({ ...newPoster, hobbies: e.target.value })}
                        placeholder="Music, Gaming, Travel"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newPoster.email}
                        onChange={(e) => setNewPoster({ ...newPoster, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input
                        value={newPoster.whatsapp}
                        onChange={(e) => setNewPoster({ ...newPoster, whatsapp: e.target.value })}
                        placeholder="+234..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telegram</Label>
                      <Input
                        value={newPoster.telegram}
                        onChange={(e) => setNewPoster({ ...newPoster, telegram: e.target.value })}
                        placeholder="@username"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddingPoster(false)}>Cancel</Button>
                    <Button onClick={async () => {
                      if (!newPoster.name) {
                        toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
                        return;
                      }
                      setIsSaving(true);
                      await addPosterProfile(newPoster);
                      setNewPoster({ name: '', bio: '', address: '', hobbies: '', avatar_url: '', email: '', whatsapp: '', telegram: '' });
                      setIsAddingPoster(false);
                      setIsSaving(false);
                    }} className="bg-primary" disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                      Add Poster
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Posters List */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posterProfiles.map((poster) => (
                <motion.div key={poster.id} className="shiny-card rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    {poster.avatar_url ? (
                      <img src={poster.avatar_url} alt={poster.name} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{poster.name}</h4>
                      {poster.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{poster.address}</p>}
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{poster.bio || 'No bio'}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => setEditingPoster(poster)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => deletePosterProfile(poster.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
              {posterProfiles.length === 0 && (
                <div className="md:col-span-2 lg:col-span-3 shiny-card rounded-xl p-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No poster profiles yet. Add your first poster!</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-display font-semibold text-xl">Push Notifications</h2>
                <p className="text-sm text-muted-foreground">{subscriberCount} subscriber{subscriberCount !== 1 ? 's' : ''}</p>
              </div>
              <Button onClick={() => setIsAddingNotification(true)} className="gap-2 bg-primary pink-glow">
                <Plus className="w-4 h-4" />
                Send Notification
              </Button>
            </div>

            {/* Send Notification Form */}
            <AnimatePresence>
              {isAddingNotification && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="shiny-card rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-semibold">Send New Notification</h3>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingNotification(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        value={newNotification.title}
                        onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                        placeholder="New announcement!"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Link (optional)</Label>
                      <Input
                        value={newNotification.link}
                        onChange={(e) => setNewNotification({ ...newNotification, link: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Message *</Label>
                      <Textarea
                        value={newNotification.body}
                        onChange={(e) => setNewNotification({ ...newNotification, body: e.target.value })}
                        placeholder="Check out our latest content, special offer, or important update..."
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Notification Image (optional)</Label>
                      <FileUpload
                        type="thumbnail"
                        bucket="notification-images"
                        currentUrl={newNotification.image_url}
                        onUploadComplete={(url) => setNewNotification({ ...newNotification, image_url: url })}
                      />
                      <p className="text-xs text-muted-foreground">Upload an image to display in the notification</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddingNotification(false)}>Cancel</Button>
                    <Button onClick={handleSendNotification} className="bg-primary gap-2" disabled={isSendingNotification}>
                      {isSendingNotification ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Send to {subscriberCount} subscriber{subscriberCount !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notification History */}
            <div className="shiny-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-display font-semibold">Notification History</h3>
              </div>
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-4 flex items-start gap-4">
                    {notification.image_url ? (
                      <img src={notification.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Bell className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full",
                          notification.is_sent ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                        )}>
                          {notification.is_sent ? 'Sent' : 'Pending'}
                        </span>
                        {notification.sent_at && (
                          <span>{new Date(notification.sent_at).toLocaleString()}</span>
                        )}
                        {notification.link && (
                          <a href={notification.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            View link
                          </a>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive flex-shrink-0"
                      onClick={() => handleDeleteNotification(notification.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No notifications sent yet</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Site Settings */}
              <div className="shiny-card rounded-xl p-6 space-y-4">
                <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                  Site Settings
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Site Name</Label>
                    <Input
                      value={settingsForm.site_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, site_name: e.target.value })}
                      placeholder="PlayStream"
                    />
                    <p className="text-xs text-muted-foreground">Use camelCase for two-tone logo (e.g., PlayStream)</p>
                  </div>
                </div>
              </div>

              {/* Payment Settings */}
              <div className="shiny-card rounded-xl p-6 space-y-4">
                <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Payment Settings
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={settingsForm.bank_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      value={settingsForm.bank_account_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bank_account_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={settingsForm.bank_account_number}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bank_account_number: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Security Settings */}
              <div className="shiny-card rounded-xl p-6 space-y-4">
                <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Security
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Admin Password</Label>
                    <Input
                      type="password"
                      value={settingsForm.admin_password}
                      onChange={(e) => setSettingsForm({ ...settingsForm, admin_password: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Ad Settings */}
              <div className="shiny-card rounded-xl p-6 space-y-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-primary" />
                    Ad Codes ({adCodes.filter(a => a.is_active).length} active)
                  </h3>
                  <Button onClick={() => setIsAddingAd(true)} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Ad
                  </Button>
                </div>

                {/* Add Ad Form */}
                <AnimatePresence>
                  {isAddingAd && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-border rounded-lg p-4 space-y-3 bg-muted/30"
                    >
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Ad Name</Label>
                          <Input
                            value={newAdCode.name}
                            onChange={(e) => setNewAdCode({ ...newAdCode, name: e.target.value })}
                            placeholder="e.g., Banner Ad 1"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-7">
                          <Switch
                            checked={newAdCode.is_active}
                            onCheckedChange={(checked) => setNewAdCode({ ...newAdCode, is_active: checked })}
                          />
                          <Label>Active</Label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Ad Code (HTML/Script)</Label>
                        <Textarea
                          value={newAdCode.code}
                          onChange={(e) => setNewAdCode({ ...newAdCode, code: e.target.value })}
                          placeholder="<script>...</script> or HTML ad code"
                          rows={4}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setIsAddingAd(false);
                          setNewAdCode({ name: '', code: '', is_active: true });
                        }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={async () => {
                          if (!newAdCode.code) {
                            toast({ title: 'Error', description: 'Ad code is required', variant: 'destructive' });
                            return;
                          }
                          await addAdCode(newAdCode);
                          setNewAdCode({ name: '', code: '', is_active: true });
                          setIsAddingAd(false);
                        }}>
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Ad Codes List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {adCodes.map((ad) => (
                    <motion.div
                      key={ad.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                    >
                      {editingAdCode?.id === ad.id ? (
                        <div className="flex-1 space-y-2">
                          <div className="grid md:grid-cols-2 gap-2">
                            <Input
                              value={editingAdCode.name}
                              onChange={(e) => setEditingAdCode({ ...editingAdCode, name: e.target.value })}
                              placeholder="Ad name"
                            />
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={editingAdCode.is_active}
                                onCheckedChange={(checked) => setEditingAdCode({ ...editingAdCode, is_active: checked })}
                              />
                              <Label>Active</Label>
                            </div>
                          </div>
                          <Textarea
                            value={editingAdCode.code}
                            onChange={(e) => setEditingAdCode({ ...editingAdCode, code: e.target.value })}
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingAdCode(null)}>Cancel</Button>
                            <Button size="sm" onClick={async () => {
                              await updateAdCode(editingAdCode.id, editingAdCode);
                              setEditingAdCode(null);
                            }}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{ad.name}</span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-xs",
                                ad.is_active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                              )}>
                                {ad.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-1">{ad.code.substring(0, 50)}...</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingAdCode(ad)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive"
                              onClick={() => deleteAdCode(ad.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                  {adCodes.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No ad codes yet. Add your first ad!</p>
                  )}
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label>Default Ad Frequency (minutes)</Label>
                    <Input
                      type="number"
                      value={settingsForm.default_ad_frequency}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_ad_frequency: parseInt(e.target.value) || 5 })}
                      className="max-w-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleUpdateSettings} className="bg-primary pink-glow" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
