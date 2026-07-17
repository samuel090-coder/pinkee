import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  History,
  Download,
  Trash2,
  Camera,
  Loader2,
  Check,
  Save,
  Star,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo } from '@/contexts/VideoContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CurrencySelect } from '@/components/settings/CurrencySelect';

interface CreatorRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  created_at: string;
  admin_notes?: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile, signOut, refreshProfile, isCreator, isAdmin } = useAuth();
  const { uploadFile } = useVideo();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Profile form
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [channelName, setChannelName] = useState(profile?.channel_name || '');
  const [channelDescription, setChannelDescription] = useState(profile?.channel_description || '');

  // Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [restrictedMode, setRestrictedMode] = useState(false);
  const [showWatchHistory, setShowWatchHistory] = useState(true);
  const [hideWeeklyDigest, setHideWeeklyDigest] = useState(false);


  // Creator request
  const [creatorRequest, setCreatorRequest] = useState<CreatorRequest | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    const fetchCreatorRequest = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('creator_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCreatorRequest(data as CreatorRequest | null);
    };

    fetchCreatorRequest();
  }, [user]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const url = await uploadFile(file, 'avatars');
      if (url) {
        await updateProfile({ avatar_url: url });
        await refreshProfile();
        toast({ title: 'Avatar updated!' });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: 'Error', description: 'Failed to upload avatar', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    setUploadingBanner(true);
    try {
      const url = await uploadFile(file, 'avatars'); // Using avatars bucket for banners too
      if (url) {
        await updateProfile({ banner_url: url });
        await refreshProfile();
        toast({ title: 'Banner updated!' });
      }
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast({ title: 'Error', description: 'Failed to upload banner', variant: 'destructive' });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName,
        username,
        bio,
        channel_name: channelName,
        channel_description: channelDescription,
      });
      toast({ title: 'Profile saved!' });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({ title: 'Error', description: 'Failed to save profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        setEmailNotifications((data as any).email_notifications ?? true);
        setPushNotifications((data as any).push_notifications ?? true);
        setAutoplay((data as any).autoplay ?? true);
        setRestrictedMode((data as any).restricted_mode ?? false);
        setShowWatchHistory((data as any).show_watch_history ?? true);
        setHideWeeklyDigest((data as any).hide_weekly_digest ?? false);
      }
    })();
  }, [user?.id]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase.from('user_settings') as any).update({
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        autoplay,
        restricted_mode: restrictedMode,
        show_watch_history: showWatchHistory,
        hide_weekly_digest: hideWeeklyDigest,
      }).eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Settings saved!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };


  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleCreatorRequest = async () => {
    if (!requestReason.trim()) {
      toast({ title: 'Please provide a reason', variant: 'destructive' });
      return;
    }

    setSubmittingRequest(true);
    try {
      const { data, error } = await supabase.from('creator_requests').insert({
        user_id: user.id,
        reason: requestReason.trim(),
        portfolio_url: portfolioUrl.trim() || null,
      }).select().single();

      if (error) throw error;
      setCreatorRequest(data as CreatorRequest);
      setRequestReason('');
      setPortfolioUrl('');
      toast({ title: 'Request submitted!', description: 'We will review your application soon.' });
    } catch (e: any) {
      console.error('Error submitting request:', e);
      toast({ title: 'Error', description: e?.message || 'Failed to submit request', variant: 'destructive' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="bg-secondary flex-wrap">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="channel">Channel</TabsTrigger>
            <TabsTrigger value="creator">Creator</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="playback">Playback</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {displayName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
                      ) : (
                        <Camera className="w-4 h-4 text-primary-foreground" />
                      )}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Profile Photo</h3>
                    <p className="text-sm text-muted-foreground">
                      Click the camera icon to upload a new photo
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="mt-1 bg-input border-border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="mt-1 bg-input border-border"
                      placeholder="@username"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="mt-1 bg-input border-border min-h-[100px]"
                    placeholder="Tell viewers about yourself"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    value={user.email || ''}
                    disabled
                    className="mt-1 bg-muted border-border"
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border mt-6">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" onClick={handleSignOut}>
                  Sign Out
                </Button>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Channel Settings */}
          <TabsContent value="channel">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Channel Customization</CardTitle>
                <CardDescription>Customize how your channel appears to viewers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Banner */}
                <div>
                  <Label>Channel Banner</Label>
                  <div
                    onClick={() => bannerInputRef.current?.click()}
                    className="mt-2 h-32 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 rounded-xl flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity relative overflow-hidden"
                  >
                    {profile?.banner_url && (
                      <img
                        src={profile.banner_url}
                        alt="Banner"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="relative z-10 text-center">
                      {uploadingBanner ? (
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload banner</p>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={e => e.target.files?.[0] && handleBannerUpload(e.target.files[0])}
                    className="hidden"
                  />
                </div>

                <div>
                  <Label htmlFor="channelName">Channel Name</Label>
                  <Input
                    id="channelName"
                    value={channelName}
                    onChange={e => setChannelName(e.target.value)}
                    className="mt-1 bg-input border-border"
                    placeholder="Your channel name"
                  />
                </div>

                <div>
                  <Label htmlFor="channelDescription">Channel Description</Label>
                  <Textarea
                    id="channelDescription"
                    value={channelDescription}
                    onChange={e => setChannelDescription(e.target.value)}
                    className="mt-1 bg-input border-border min-h-[120px]"
                    placeholder="Describe your channel"
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Channel Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Creator Access */}
          <TabsContent value="creator">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Creator Access
                </CardTitle>
                <CardDescription>
                  Become a creator to upload videos and sell music
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isCreator ? (
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <Check className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="font-medium text-foreground">You're a Creator!</p>
                      <p className="text-sm text-muted-foreground">
                        You can upload videos and sell music on the marketplace.
                      </p>
                    </div>
                  </div>
                ) : creatorRequest?.status === 'pending' ? (
                  <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-500" />
                    <div>
                      <p className="font-medium text-foreground">Request Pending</p>
                      <p className="text-sm text-muted-foreground">
                        Your creator access request is being reviewed.
                      </p>
                    </div>
                  </div>
                ) : creatorRequest?.status === 'rejected' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="font-medium text-foreground">Request Declined</p>
                      {creatorRequest.admin_notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Reason: {creatorRequest.admin_notes}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You can submit a new request below.
                    </p>
                  </div>
                ) : null}

                {!isCreator && creatorRequest?.status !== 'pending' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reason">Why do you want to become a creator? *</Label>
                      <Textarea
                        id="reason"
                        value={requestReason}
                        onChange={(e) => setRequestReason(e.target.value)}
                        className="bg-input border-border min-h-[120px]"
                        placeholder="Tell us about yourself and what kind of content you plan to create..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolio">Portfolio URL (optional)</Label>
                      <Input
                        id="portfolio"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        className="bg-input border-border"
                        placeholder="https://your-portfolio.com"
                      />
                    </div>
                    <Button
                      onClick={handleCreatorRequest}
                      disabled={submittingRequest || !requestReason.trim()}
                    >
                      {submittingRequest ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Star className="w-4 h-4 mr-2" />
                      )}
                      Submit Request
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about your channel via email
                    </p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>

                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Playback */}
          <TabsContent value="playback">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Playback Settings</CardTitle>
                <CardDescription>Customize your viewing experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <CurrencySelect />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Autoplay</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically play the next video
                    </p>
                  </div>
                  <Switch checked={autoplay} onCheckedChange={setAutoplay} />
                </div>

                <div>
                  <Label>Default Quality</Label>
                  <Select defaultValue="auto">
                    <SelectTrigger className="mt-1 bg-input border-border w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="1080p">1080p</SelectItem>
                      <SelectItem value="720p">720p</SelectItem>
                      <SelectItem value="480p">480p</SelectItem>
                      <SelectItem value="360p">360p</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy */}
          <TabsContent value="privacy">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control your privacy and data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Restricted Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Hide potentially mature content
                    </p>
                  </div>
                  <Switch checked={restrictedMode} onCheckedChange={setRestrictedMode} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Watch History</p>
                    <p className="text-sm text-muted-foreground">
                      Save and show your watch history
                    </p>
                  </div>
                  <Switch checked={showWatchHistory} onCheckedChange={setShowWatchHistory} />
                </div>

                <div className="pt-4 border-t border-border">
                  <Button variant="outline">
                    <History className="w-4 h-4 mr-2" />
                    Clear Watch History
                  </Button>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
