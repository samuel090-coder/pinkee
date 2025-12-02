import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Video, AdminSettings, Analytics } from '@/types/video';

interface VideoContextType {
  videos: Video[];
  setVideos: React.Dispatch<React.SetStateAction<Video[]>>;
  adminSettings: AdminSettings;
  setAdminSettings: React.Dispatch<React.SetStateAction<AdminSettings>>;
  analytics: Analytics;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  addVideo: (video: Omit<Video, 'id' | 'views' | 'reactions' | 'watchTime' | 'createdAt'>) => void;
  updateVideo: (id: string, updates: Partial<Video>) => void;
  deleteVideo: (id: string) => void;
  incrementViews: (id: string) => void;
  incrementReactions: (id: string) => void;
  addWatchTime: (id: string, seconds: number) => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

const defaultAdminSettings: AdminSettings = {
  bankName: 'Opay',
  bankAccountName: 'Samuel Sunday',
  bankAccountNumber: '9066423764',
  adminPassword: '0704',
  adCode: 'https://serious-sample.com/d/m.FRz/d/G_NMvkZLGAUf/JeKmg9cu/ZGUhlGklPDT/Yp3-MjTpYy1NO/ThETtWNDjYc/xvN_jAUZ5TMkga',
  defaultAdFrequency: 5,
};

const sampleVideos: Video[] = [
  {
    id: '1',
    title: 'Amazing Nature Documentary',
    description: 'Explore the wonders of our natural world in this breathtaking documentary.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=450&fit=crop',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    duration: 596,
    views: 12453,
    reactions: 892,
    isSubscriptionOnly: false,
    createdAt: new Date().toISOString(),
    isPublished: true,
    watchTime: 45000,
    adFrequency: 5,
  },
  {
    id: '2',
    title: 'Premium Cooking Masterclass',
    description: 'Learn exclusive cooking techniques from world-renowned chefs.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=450&fit=crop',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    duration: 1800,
    views: 8921,
    reactions: 654,
    isSubscriptionOnly: true,
    ctaLink: '/subscribe',
    ctaText: 'Subscribe to Watch',
    createdAt: new Date().toISOString(),
    isPublished: true,
    watchTime: 32000,
    adFrequency: 3,
  },
  {
    id: '3',
    title: 'Workout From Home',
    description: 'Get fit with this high-energy home workout routine.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=450&fit=crop',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    duration: 1200,
    views: 25678,
    reactions: 1893,
    isSubscriptionOnly: false,
    createdAt: new Date().toISOString(),
    isPublished: true,
    watchTime: 89000,
    adFrequency: 5,
  },
  {
    id: '4',
    title: 'Music Production Secrets',
    description: 'Discover the secrets behind hit music production.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=450&fit=crop',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    duration: 2400,
    views: 15234,
    reactions: 1102,
    isSubscriptionOnly: true,
    ctaLink: '/subscribe',
    ctaText: 'Unlock Premium Content',
    createdAt: new Date().toISOString(),
    isPublished: true,
    watchTime: 56000,
    adFrequency: 4,
  },
  {
    id: '5',
    title: 'Travel Vlog: Japan',
    description: 'Experience the beauty and culture of Japan through this travel vlog.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=450&fit=crop',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    duration: 900,
    views: 34567,
    reactions: 2456,
    isSubscriptionOnly: false,
    createdAt: new Date().toISOString(),
    isPublished: true,
    watchTime: 120000,
    adFrequency: 5,
  },
  {
    id: '6',
    title: 'Advanced Photography Tips',
    description: 'Take your photography skills to the next level with expert tips.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=450&fit=crop',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    duration: 1500,
    views: 9876,
    reactions: 723,
    isSubscriptionOnly: false,
    createdAt: new Date().toISOString(),
    isPublished: true,
    watchTime: 43000,
    adFrequency: 5,
  },
];

export function VideoProvider({ children }: { children: ReactNode }) {
  const [videos, setVideos] = useState<Video[]>(() => {
    const saved = localStorage.getItem('playstream_videos');
    return saved ? JSON.parse(saved) : sampleVideos;
  });

  const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => {
    const saved = localStorage.getItem('playstream_admin_settings');
    return saved ? JSON.parse(saved) : defaultAdminSettings;
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    localStorage.setItem('playstream_videos', JSON.stringify(videos));
  }, [videos]);

  useEffect(() => {
    localStorage.setItem('playstream_admin_settings', JSON.stringify(adminSettings));
  }, [adminSettings]);

  const analytics: Analytics = {
    totalViews: videos.reduce((sum, v) => sum + v.views, 0),
    totalWatchTime: videos.reduce((sum, v) => sum + v.watchTime, 0),
    totalReactions: videos.reduce((sum, v) => sum + v.reactions, 0),
    videosCount: videos.length,
    subscribersCount: 0,
  };

  const addVideo = (video: Omit<Video, 'id' | 'views' | 'reactions' | 'watchTime' | 'createdAt'>) => {
    const newVideo: Video = {
      ...video,
      id: Date.now().toString(),
      views: 0,
      reactions: 0,
      watchTime: 0,
      createdAt: new Date().toISOString(),
    };
    setVideos(prev => [newVideo, ...prev]);
  };

  const updateVideo = (id: string, updates: Partial<Video>) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const deleteVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const incrementViews = (id: string) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, views: v.views + 1 } : v));
  };

  const incrementReactions = (id: string) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, reactions: v.reactions + 1 } : v));
  };

  const addWatchTime = (id: string, seconds: number) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, watchTime: v.watchTime + seconds } : v));
  };

  return (
    <VideoContext.Provider value={{
      videos,
      setVideos,
      adminSettings,
      setAdminSettings,
      analytics,
      isAdminAuthenticated,
      setIsAdminAuthenticated,
      addVideo,
      updateVideo,
      deleteVideo,
      incrementViews,
      incrementReactions,
      addWatchTime,
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
