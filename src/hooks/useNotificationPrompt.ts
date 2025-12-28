import { useEffect, useState } from 'react';
import { usePushNotifications } from './usePushNotifications';

const PROMPT_DELAY = 3000; // 3 seconds after page load
const STORAGE_KEY = 'notification_prompt_shown';

export const useNotificationPrompt = () => {
  const { isSupported, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Don't show if not supported, already subscribed, or still loading
    if (!isSupported || isSubscribed || isLoading) {
      setShowPrompt(false);
      return;
    }

    // Check if we've already shown the prompt
    const hasShownPrompt = localStorage.getItem(STORAGE_KEY);
    if (hasShownPrompt) {
      return;
    }

    // Show prompt after a delay
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, PROMPT_DELAY);

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, isLoading]);

  const handleSubscribe = async () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowPrompt(false);
    await subscribe();
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowPrompt(false);
  };

  return {
    showPrompt,
    handleSubscribe,
    handleDismiss,
  };
};
