export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  views: number;
  reactions: number;
  isSubscriptionOnly: boolean;
  ctaLink?: string;
  ctaText?: string;
  createdAt: string;
  publishedAt?: string;
  isPublished: boolean;
  watchTime: number;
  thumbnailAlt?: string;
  thumbnailB?: string;
  adFrequency: number;
}

export interface AdminSettings {
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  adminPassword: string;
  adCode: string;
  defaultAdFrequency: number;
}

export interface Analytics {
  totalViews: number;
  totalWatchTime: number;
  totalReactions: number;
  videosCount: number;
  subscribersCount: number;
}
