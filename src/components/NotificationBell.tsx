import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const NotificationBell = () => {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  const handleClick = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          disabled={isLoading}
          className="relative"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isSubscribed ? (
            <>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </>
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isSubscribed ? 'Notifications enabled' : 'Enable notifications'}
      </TooltipContent>
    </Tooltip>
  );
};
