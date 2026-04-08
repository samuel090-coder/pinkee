import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  ListVideo,
  History,
  Flame,
  Music2,
  Gamepad2,
  Newspaper,
  Trophy,
  Lightbulb,
  Film,
  Radio,
  Settings,
  HelpCircle,
  Flag,
  Menu,
  X,
  Upload,
  Users,
  Shield,
  DollarSign,
  Wallet,
  Clapperboard,
  Tv,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isExpanded: boolean;
}

const NavItem = ({ to, icon, label, isExpanded }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink to={to}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-200',
          isActive 
            ? 'bg-primary/20 text-primary' 
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        )}
      >
        <span className="flex-shrink-0 w-6 h-6">{icon}</span>
        <AnimatePresence>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-sm font-medium whitespace-nowrap overflow-hidden"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </NavLink>
  );
};

const SectionTitle = ({ title, isExpanded }: { title: string; isExpanded: boolean }) => (
  <AnimatePresence>
    {isExpanded && (
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
      >
        {title}
      </motion.h3>
    )}
  </AnimatePresence>
);

export const Sidebar = ({ isExpanded, onToggle }: SidebarProps) => {
  const { user, isModerator } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 240 : 72 }}
        className={cn(
          'fixed left-0 top-16 bottom-0 z-50 bg-sidebar border-r border-sidebar-border',
          'flex flex-col transition-all duration-300',
          'lg:translate-x-0',
          isExpanded ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Toggle button - mobile only */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="absolute -right-12 top-4 lg:hidden"
        >
          {isExpanded ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>

        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {/* Main Navigation */}
            <NavItem to="/" icon={<Home className="w-full h-full" />} label="Home" isExpanded={isExpanded} />
            <NavItem to="/movies" icon={<Clapperboard className="w-full h-full" />} label="Movies" isExpanded={isExpanded} />
            <NavItem to="/tv-shows" icon={<Tv className="w-full h-full" />} label="TV Shows" isExpanded={isExpanded} />
            <NavItem to="/explore" icon={<Compass className="w-full h-full" />} label="Explore" isExpanded={isExpanded} />
            <NavItem to="/shorts" icon={<PlaySquare className="w-full h-full" />} label="Shorts" isExpanded={isExpanded} />
            <NavItem to="/subscriptions" icon={<Users className="w-full h-full" />} label="Subscriptions" isExpanded={isExpanded} />
            <NavItem to="/subscriptions" icon={<Users className="w-full h-full" />} label="Subscriptions" isExpanded={isExpanded} />

            {isExpanded && <Separator className="my-4 bg-border" />}

            {/* User Section */}
            {user && (
              <>
                <SectionTitle title="You" isExpanded={isExpanded} />
                <NavItem to="/channel/me" icon={<PlaySquare className="w-full h-full" />} label="Your Channel" isExpanded={isExpanded} />
                <NavItem to="/history" icon={<History className="w-full h-full" />} label="History" isExpanded={isExpanded} />
                <NavItem to="/playlists" icon={<ListVideo className="w-full h-full" />} label="Playlists" isExpanded={isExpanded} />
                <NavItem to="/watch-later" icon={<Clock className="w-full h-full" />} label="Watch Later" isExpanded={isExpanded} />
                <NavItem to="/liked" icon={<ThumbsUp className="w-full h-full" />} label="Liked Videos" isExpanded={isExpanded} />
                <NavItem to="/wallet" icon={<Wallet className="w-full h-full" />} label="Wallet" isExpanded={isExpanded} />

                {isExpanded && <Separator className="my-4 bg-border" />}
                <SectionTitle title="Creator" isExpanded={isExpanded} />
                <NavItem to="/upload" icon={<Upload className="w-full h-full" />} label="Upload" isExpanded={isExpanded} />
                <NavItem to="/studio" icon={<Film className="w-full h-full" />} label="Studio" isExpanded={isExpanded} />
                <NavItem to="/studio/monetization" icon={<Wallet className="w-full h-full" />} label="Monetization" isExpanded={isExpanded} />
                <NavItem to="/studio/music" icon={<DollarSign className="w-full h-full" />} label="Music Earnings" isExpanded={isExpanded} />

                {isModerator && (
                  <>
                    {isExpanded && <Separator className="my-4 bg-border" />}
                    <SectionTitle title="Moderation" isExpanded={isExpanded} />
                    <NavItem to="/admin" icon={<Shield className="w-full h-full" />} label="Admin Panel" isExpanded={isExpanded} />
                  </>
                )}
              </>
            )}

            {isExpanded && <Separator className="my-4 bg-border" />}

            {/* Explore Section */}
            <SectionTitle title="Explore" isExpanded={isExpanded} />
            <NavItem to="/trending" icon={<Flame className="w-full h-full" />} label="Trending" isExpanded={isExpanded} />
            <NavItem to="/channels" icon={<Users className="w-full h-full" />} label="Channels" isExpanded={isExpanded} />
            <NavItem to="/music-marketplace" icon={<Music2 className="w-full h-full" />} label="Music Store" isExpanded={isExpanded} />
            <NavItem to="/gaming" icon={<Gamepad2 className="w-full h-full" />} label="Gaming" isExpanded={isExpanded} />
            <NavItem to="/news" icon={<Newspaper className="w-full h-full" />} label="News" isExpanded={isExpanded} />
            <NavItem to="/sports" icon={<Trophy className="w-full h-full" />} label="Sports" isExpanded={isExpanded} />
            <NavItem to="/learning" icon={<Lightbulb className="w-full h-full" />} label="Learning" isExpanded={isExpanded} />
            <NavItem to="/podcasts" icon={<Radio className="w-full h-full" />} label="Podcasts" isExpanded={isExpanded} />

            {isExpanded && <Separator className="my-4 bg-border" />}

            {/* More */}
            <NavItem to="/settings" icon={<Settings className="w-full h-full" />} label="Settings" isExpanded={isExpanded} />
            <NavItem to="/report" icon={<Flag className="w-full h-full" />} label="Report" isExpanded={isExpanded} />
            <NavItem to="/help" icon={<HelpCircle className="w-full h-full" />} label="Help" isExpanded={isExpanded} />
          </nav>
        </ScrollArea>

        {/* Footer */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 border-t border-sidebar-border"
            >
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} PlayStream
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <a href="#" className="text-xs text-muted-foreground hover:text-foreground">About</a>
                <a href="#" className="text-xs text-muted-foreground hover:text-foreground">Press</a>
                <a href="#" className="text-xs text-muted-foreground hover:text-foreground">Copyright</a>
                <a href="#" className="text-xs text-muted-foreground hover:text-foreground">Contact</a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>
    </>
  );
};
