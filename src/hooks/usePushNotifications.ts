import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      if (!cancelled) setIsSupported(supported);

      if (!supported) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        // Fetch VAPID public key from server
        const { data, error } = await supabase.functions.invoke('get-vapid-key');
        if (error) {
          console.error('Failed to fetch VAPID key:', error);
          if (!cancelled) setIsLoading(false);
          return;
        }
        
        if (data?.publicKey && !cancelled) {
          setVapidPublicKey(data.publicKey);
        }

        // Ensure service worker is registered
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js');
        }

        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
        if (!cancelled) setIsSupported(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast({ title: 'Error', description: 'Push notifications not supported', variant: 'destructive' });
      return false;
    }

    if (!vapidPublicKey) {
      toast({ title: 'Error', description: 'Push notifications not configured', variant: 'destructive' });
      return false;
    }

    try {
      setIsLoading(true);

      // Ensure service worker is registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }

      // Unsubscribe from any existing subscription first (to ensure correct VAPID key)
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('endpoint', existingSub.endpoint);
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({ title: 'Permission Denied', description: 'Please allow notifications to receive updates', variant: 'destructive' });
        return false;
      }

      // Subscribe to push with server's VAPID key
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();

      // Save to database
      const { error } = await supabase.from('push_subscriptions').upsert({
        endpoint: subscriptionJson.endpoint!,
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth,
      }, {
        onConflict: 'endpoint'
      });

      if (error) throw error;

      setIsSubscribed(true);
      toast({ title: 'Subscribed!', description: 'You will now receive notifications' });
      return true;
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration ? await registration.pushManager.getSubscription() : null;

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast({ title: 'Unsubscribed', description: 'You will no longer receive notifications' });
      return true;
    } catch (error: any) {
      console.error('Unsubscribe error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
