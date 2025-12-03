import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, Eye, EyeOff, LogOut, LayoutDashboard, Video, Settings, 
  BarChart3, Plus, Trash2, Edit, Save, X, Calendar,
  Download, Play, Heart, Clock, TrendingUp, CreditCard, Loader2
} from 'lucide-react';
import { useVideo, Video as VideoType } from '@/contexts/VideoContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import { cn } from '@/lib/utils';

const Admin = () => {
  const { 
    videos, 
    loading,
    adminSettings, 
    isAdminAuthenticated, 
    setIsAdminAuthenticated,
    addVideo,
    updateVideo,
    deleteVideo,
    updateAdminSettings,
    analytics
  } = useVideo();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
  });

  const [settingsForm, setSettingsForm] = useState({
    site_name: '',
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    admin_password: '',
    ad_code: '',
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
        ad_code: adminSettings.ad_code || '',
        default_ad_frequency: adminSettings.default_ad_frequency || 5,
      });
    }
  }, [adminSettings]);

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
                <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  Ad Configuration
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ad Code URL</Label>
                    <Input
                      value={settingsForm.ad_code}
                      onChange={(e) => setSettingsForm({ ...settingsForm, ad_code: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Ad Frequency (minutes)</Label>
                    <Input
                      type="number"
                      value={settingsForm.default_ad_frequency}
                      onChange={(e) => setSettingsForm({ ...settingsForm, default_ad_frequency: parseInt(e.target.value) || 5 })}
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
