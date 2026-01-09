import { useEffect, useState } from 'react';
import { usePushNotifications } from './usePushNotifications';

const PROMPT_DELAY = 1500; // 1.5 seconds - faster for new devices
const DEVICE_KEY = 'notification_device_id';
const DISMISSED_KEY = 'notification_dismissed';

// Generate a unique device ID if not exists
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem(DEVICE_KEY, deviceId);
  }
  return deviceId;
};

export const useNotificationPrompt = () => {
  const { isSupported, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Don't show if not supported, already subscribed, or still loading
    if (!isSupported || isSubscribed || isLoading) {
      setShowPrompt(false);
      return;
    }

    // Get device ID - this identifies new devices
    const deviceId = getDeviceId();
    
    // Check if this device has dismissed the prompt before
    const dismissedDevices = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
    if (dismissedDevices.includes(deviceId)) {
      return;
    }

    // Show prompt after a short delay for new devices
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, PROMPT_DELAY);

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, isLoading]);

  const handleSubscribe = async () => {
    setShowPrompt(false);
    await subscribe();
  };

  const handleDismiss = () => {
    // Mark this device as dismissed
    const deviceId = getDeviceId();
    const dismissedDevices = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
    if (!dismissedDevices.includes(deviceId)) {
      dismissedDevices.push(deviceId);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedDevices));
    }
    setShowPrompt(false);
  };

  return {
    showPrompt,
    handleSubscribe,
    handleDismiss,
  };
};
