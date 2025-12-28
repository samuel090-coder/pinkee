import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Get VAPID public key from environment
const VAPID_PUBLIC_KEY = 'BLc-89AHnBiY2nL7w7EUkN-ueIxHLCdv-R0Yz0w8YGqLHcVnZRRiGC5bRHqkVJvA3-_mME7TWrfZN8FVE8lVv-M';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      if (!cancelled) setIsSupported(supported);

      if (!supported) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        // Ensure service worker is registered so we can safely query subscription state.
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

    checkSupport();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast({ title: 'Error', description: 'Push notifications not supported', variant: 'destructive' });
      return false;
    }

    try {
      setIsLoading(true);

      // Ensure service worker is registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({ title: 'Permission Denied', description: 'Please allow notifications to receive updates', variant: 'destructive' });
        return false;
      }

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
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
  }, [isSupported]);

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
