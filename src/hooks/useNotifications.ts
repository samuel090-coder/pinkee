import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setUnreadCount(count || 0);
    };

    fetchUnread();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notif-count:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
        () => {
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { unreadCount, notifications };
};

// Helper to send in-app notifications
export const sendNotification = async (
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
  imageUrl?: string
) => {
  try {
    await supabase.from('user_notifications').insert({
      user_id: userId,
      type,
      title,
      body,
      link: link || null,
      image_url: imageUrl || null,
    });
  } catch (e) {
    console.error('Error sending notification:', e);
  }
};
