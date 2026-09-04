import { useLocation } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { useSupport } from '@/contexts/SupportContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { SupportChat } from './SupportChat';

const HIDE_PREFIXES = ['/shorts', '/watch/', '/movie/', '/tv/'];

export const SupportLauncher = () => {
  const { user } = useAuth();
  const { isOpen, toggle, unreadCount } = useSupport();
  const location = useLocation();

  if (!user) return null;
  if (HIDE_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p))) return null;

  return (
    <>
      <button
        onClick={toggle}
        aria-label="Open support chat"
        className={cn(
          'fixed right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg pink-glow',
          'flex items-center justify-center hover:scale-105 active:scale-95 transition-transform',
           'bottom-[calc(4.5rem+var(--safe-area-bottom)] lg:bottom-6',
        )}
      >
        <Headphones className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center border-2 border-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <SupportChat open={isOpen} />
    </>
  );
};
