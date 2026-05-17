import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PosterProfile {
  id: string;
  name: string;
  bio: string | null;
  address: string | null;
  hobbies: string | null;
  avatar_url: string | null;
  email: string | null;
  whatsapp: string | null;
  telegram: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  channel_name: string | null;
  channel_description: string | null;
  is_verified: boolean | null;
  subscriber_count: number | null;
  total_views: number | null;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number;
  views: number;
  reactions: number;
  is_subscription_only: boolean;
  is_premium: boolean;
  premium_price: number;
  cta_link: string | null;
  cta_text: string | null;
  created_at: string;
  published_at: string | null;
  is_published: boolean;
  watch_time: number;
  thumbnail_alt: string | null;
  thumbnail_b: string | null;
  ad_frequency: number;
  poster_id: string | null;
  poster?: PosterProfile | null;
  uploader_profile?: UserProfile | null;
  // New fields for YouTube-like features
  uploader_id: string | null;
  status: string | null;
  category: string | null;
  tags: string[] | null;
  likes_count: number;
  dislikes_count: number;
  comments_count: number;
}

export interface AdminSettings {
  id: string;
  site_name: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  admin_password: string;
  ad_code: string;
  default_ad_frequency: number;
  youtube_enabled?: boolean;
  youtube_channel_id?: string | null;
}

export interface AdCode {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface Analytics {
  totalViews: number;
  totalWatchTime: number;
  totalReactions: number;
  videosCount: number;
}

interface VideoContextType {
  videos: Video[];
  loading: boolean;
  adminSettings: AdminSettings | null;
  adCodes: AdCode[];
  posterProfiles: PosterProfile[];
  analytics: Analytics;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  addVideo: (video: Partial<Video>) => Promise<void>;
  updateVideo: (id: string, updates: Partial<Video>) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  incrementViews: (id: string) => Promise<void>;
  incrementReactions: (id: string) => Promise<void>;
  addWatchTime: (id: string, seconds: number) => Promise<void>;
  updateAdminSettings: (settings: Partial<AdminSettings>) => Promise<void>;
  refreshVideos: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  uploadFile: (file: File, bucket: 'videos' | 'thumbnails' | 'avatars' | 'notification-images') => Promise<string | null>;
  getRandomAdCode: () => string | null;
  addAdCode: (adCode: Partial<AdCode>) => Promise<void>;
  updateAdCode: (id: string, updates: Partial<AdCode>) => Promise<void>;
  deleteAdCode: (id: string) => Promise<void>;
  refreshAdCodes: () => Promise<void>;
  addPosterProfile: (profile: Partial<PosterProfile>) => Promise<void>;
  updatePosterProfile: (id: string, updates: Partial<PosterProfile>) => Promise<void>;
  deletePosterProfile: (id: string) => Promise<void>;
  refreshPosterProfiles: () => Promise<void>;
  getPosterProfile: (id: string) => PosterProfile | undefined;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [adCodes, setAdCodes] = useState<AdCode[]>([]);
  const [posterProfiles, setPosterProfiles] = useState<PosterProfile[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const posterProfilesRef = useRef<PosterProfile[]>([]);
  const userProfilesRef = useRef<UserProfile[]>([]);

  useEffect(() => {
    posterProfilesRef.current = posterProfiles;
  }, [posterProfiles]);

  useEffect(() => {
    userProfilesRef.current = userProfiles;
  }, [userProfiles]);

  const analytics: Analytics = {
    totalViews: videos.reduce((sum, v) => sum + v.views, 0),
    totalWatchTime: videos.reduce((sum, v) => sum + v.watch_time, 0),
    totalReactions: videos.reduce((sum, v) => sum + v.reactions, 0),
    videosCount: videos.length,
  };

  const refreshPosterProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('poster_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const next = (data || []) as PosterProfile[];
      posterProfilesRef.current = next;
      setPosterProfiles(next);
    } catch (error) {
      console.error('Error fetching poster profiles:', error);
    }
  }, []);

  const refreshUserProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const next = (data || []) as UserProfile[];
      userProfilesRef.current = next;
      setUserProfiles(next);
    } catch (error) {
      console.error('Error fetching user profiles:', error);
    }
  }, []);

  const refreshVideos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const posters = posterProfilesRef.current;
      const profiles = userProfilesRef.current;

      const videosWithOwners = (data || []).map((video: any) => ({
        ...video,
        poster: posters.find(p => p.id === video.poster_id) || null,
        uploader_profile: profiles.find(p => p.user_id === video.uploader_id) || null,
      }));

      setVideos(videosWithOwners as Video[]);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setAdminSettings(data);
    } catch (error) {
      console.error('Error fetching admin settings:', error);
    }
  }, []);

  const refreshAdCodes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ad_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdCodes(data || []);
    } catch (error) {
      console.error('Error fetching ad codes:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([refreshPosterProfiles(), refreshUserProfiles(), refreshSettings(), refreshAdCodes()]);
      await refreshVideos();
      setLoading(false);
    };
    init();
  }, []);

  // Auto-refresh profiles when videos change to ensure uploader info is available
  const refreshAllData = useCallback(async () => {
    await Promise.all([refreshPosterProfiles(), refreshUserProfiles()]);
    await refreshVideos();
  }, [refreshPosterProfiles, refreshUserProfiles, refreshVideos]);

  // Realtime: keep in-memory videos fresh for Studio + feeds
  useEffect(() => {
    const channel = supabase
      .channel('realtime:videos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'videos' },
        (payload) => {
          console.log('Video change detected:', payload.eventType);
          // Refresh all data including profiles to ensure new uploaders are loaded
          refreshAllData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAllData]);

  const uploadFile = async (file: File, bucket: 'videos' | 'thumbnails' | 'avatars' | 'notification-images'): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive'
      });
      return null;
    }
  };

  const getRandomAdCode = (): string | null => {
    const activeAds = adCodes.filter(ad => ad.is_active);
    if (activeAds.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * activeAds.length);
    return activeAds[randomIndex].code;
  };

  const addAdCode = async (adCode: Partial<AdCode>) => {
    try {
      const { error } = await supabase
        .from('ad_codes')
        .insert({
          name: adCode.name || 'Ad',
          code: adCode.code || '',
          is_active: adCode.is_active !== false,
        });

      if (error) throw error;
      await refreshAdCodes();
      toast({ title: 'Success', description: 'Ad code added successfully' });
    } catch (error) {
      console.error('Error adding ad code:', error);
      toast({
        title: 'Error',
        description: 'Failed to add ad code',
        variant: 'destructive'
      });
    }
  };

  const updateAdCode = async (id: string, updates: Partial<AdCode>) => {
    try {
      const { error } = await supabase
        .from('ad_codes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await refreshAdCodes();
      toast({ title: 'Saved', description: 'Ad code updated' });
    } catch (error) {
      console.error('Error updating ad code:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ad code',
        variant: 'destructive'
      });
    }
  };

  const deleteAdCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ad_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await refreshAdCodes();
      toast({ title: 'Deleted', description: 'Ad code removed' });
    } catch (error) {
      console.error('Error deleting ad code:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete ad code',
        variant: 'destructive'
      });
    }
  };

  const addVideo = async (video: Partial<Video>) => {
    try {
      const { data: newVideo, error } = await supabase
        .from('videos')
        .insert({
          title: video.title || 'Untitled',
          description: video.description ?? null,
          thumbnail_url: video.thumbnail_url ?? null,
          video_url: video.video_url ?? null,
          duration: video.duration || 0,
          is_subscription_only: video.is_subscription_only || false,
          cta_link: video.cta_link ?? null,
          cta_text: video.cta_text ?? null,
          is_published: video.is_published !== false,
          ad_frequency: video.ad_frequency || 5,
          published_at: video.published_at ?? null,
          poster_id: video.poster_id ?? null,
          uploader_id: video.uploader_id ?? null,
          category: video.category ?? null,
          tags: video.tags ?? null,
          status: video.status ?? 'published',
        })
        .select()
        .single();

      if (error) throw error;
      
      // Auto-send notification for new published video
      if (video.is_published !== false && newVideo) {
        try {
          // Save notification to database
          const { data: savedNotification } = await supabase
            .from('notifications')
            .insert({
              title: '🎬 New Video Alert!',
              body: `${video.title} is now live. Check it out!`,
              image_url: video.thumbnail_url || null,
              link: '/',
            })
            .select()
            .single();

          // Send push notification
          if (savedNotification) {
            await supabase.functions.invoke('send-notification', {
              body: {
                title: '🎬 New Video Alert!',
                body: `${video.title} is now live. Check it out!`,
                image_url: video.thumbnail_url || null,
                link: '/',
                notification_id: savedNotification.id,
              },
            });
          }
        } catch (notifError) {
          console.error('Failed to send auto-notification:', notifError);
          // Don't fail the video add if notification fails
        }
      }
      
      await refreshVideos();
      toast({ title: 'Success', description: 'Video added successfully' });
    } catch (error) {
      console.error('Error adding video:', error);
      toast({
        title: 'Error',
        description: 'Failed to add video',
        variant: 'destructive'
      });
    }
  };

  const updateVideo = async (id: string, updates: Partial<Video>) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await refreshVideos();
    } catch (error) {
      console.error('Error updating video:', error);
      toast({
        title: 'Error',
        description: 'Failed to update video',
        variant: 'destructive'
      });
    }
  };

  const deleteVideo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await refreshVideos();
      toast({ title: 'Deleted', description: 'Video deleted successfully' });
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete video',
        variant: 'destructive'
      });
    }
  };

  const incrementViews = async (id: string) => {
    try {
      const video = videos.find(v => v.id === id);
      if (!video) return;

      await supabase
        .from('videos')
        .update({ views: video.views + 1 })
        .eq('id', id);

      setVideos(prev => prev.map(v => v.id === id ? { ...v, views: v.views + 1 } : v));
    } catch (error) {
      console.error('Error incrementing views:', error);
    }
  };

  const incrementReactions = async (id: string) => {
    try {
      const video = videos.find(v => v.id === id);
      if (!video) return;

      await supabase
        .from('videos')
        .update({ reactions: video.reactions + 1 })
        .eq('id', id);

      setVideos(prev => prev.map(v => v.id === id ? { ...v, reactions: v.reactions + 1 } : v));
    } catch (error) {
      console.error('Error incrementing reactions:', error);
    }
  };

  const addWatchTime = async (id: string, seconds: number) => {
    try {
      const video = videos.find(v => v.id === id);
      if (!video) return;

      await supabase
        .from('videos')
        .update({ watch_time: video.watch_time + seconds })
        .eq('id', id);
    } catch (error) {
      console.error('Error adding watch time:', error);
    }
  };

  const updateAdminSettings = async (settings: Partial<AdminSettings>) => {
    try {
      if (!adminSettings?.id) return;

      const { error } = await supabase
        .from('admin_settings')
        .update(settings)
        .eq('id', adminSettings.id);

      if (error) throw error;
      await refreshSettings();
      toast({ title: 'Saved', description: 'Settings updated successfully' });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive'
      });
    }
  };

  const addPosterProfile = async (profile: Partial<PosterProfile>) => {
    try {
      const { error } = await supabase
        .from('poster_profiles')
        .insert({
          name: profile.name || 'Unnamed',
          bio: profile.bio || null,
          address: profile.address || null,
          hobbies: profile.hobbies || null,
          avatar_url: profile.avatar_url || null,
          email: profile.email || null,
          whatsapp: profile.whatsapp || null,
          telegram: profile.telegram || null,
        });

      if (error) throw error;
      await refreshPosterProfiles();
      toast({ title: 'Success', description: 'Poster profile created' });
    } catch (error) {
      console.error('Error adding poster profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to create profile',
        variant: 'destructive'
      });
    }
  };

  const updatePosterProfile = async (id: string, updates: Partial<PosterProfile>) => {
    try {
      const { error } = await supabase
        .from('poster_profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await refreshPosterProfiles();
      toast({ title: 'Saved', description: 'Profile updated' });
    } catch (error) {
      console.error('Error updating poster profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    }
  };

  const deletePosterProfile = async (id: string) => {
    try {
      const { error } = await supabase
        .from('poster_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await refreshPosterProfiles();
      toast({ title: 'Deleted', description: 'Profile removed' });
    } catch (error) {
      console.error('Error deleting poster profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete profile',
        variant: 'destructive'
      });
    }
  };

  const getPosterProfile = (id: string) => {
    return posterProfiles.find(p => p.id === id);
  };

  return (
    <VideoContext.Provider value={{
      videos,
      loading,
      adminSettings,
      adCodes,
      posterProfiles,
      analytics,
      isAdminAuthenticated,
      setIsAdminAuthenticated,
      addVideo,
      updateVideo,
      deleteVideo,
      incrementViews,
      incrementReactions,
      addWatchTime,
      updateAdminSettings,
      refreshVideos,
      refreshSettings,
      uploadFile,
      getRandomAdCode,
      addAdCode,
      updateAdCode,
      deleteAdCode,
      refreshAdCodes,
      addPosterProfile,
      updatePosterProfile,
      deletePosterProfile,
      refreshPosterProfiles,
      getPosterProfile,
    }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
}