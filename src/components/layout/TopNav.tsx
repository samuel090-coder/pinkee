import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Search,
  Mic,
  Upload,
  Bell,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Play,
  X,
  Moon,
  Sun,
  Globe,
  Shield,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useVideo } from '@/contexts/VideoContext';
import { NotificationBell } from '@/components/NotificationBell';
import { useTheme } from '@/components/ThemeProvider';

interface TopNavProps {
  onMenuToggle: () => void;
}

export const TopNav = ({ onMenuToggle }: TopNavProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin, isModerator } = useAuth();
  const { adminSettings } = useVideo();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const siteName = adminSettings?.site_name || 'PlayStream';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[calc(4rem+var(--safe-area-top))] border-b border-border/70 bg-background/90 shadow-sm backdrop-blur-xl safe-area-top">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-6 h-6" />
          </Button>

          <Link to="/" className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center pink-glow"
            >
              <Play className="w-5 h-5 text-primary-foreground" fill="currentColor" />
            </motion.div>
            <span className="font-display font-bold text-xl text-foreground hidden sm:block">
              {siteName}
            </span>
          </Link>
        </div>

        {/* Center Section - Search */}
        <AnimatePresence>
          {showMobileSearch ? (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '100%' }}
              exit={{ opacity: 0, width: 0 }}
              className="absolute inset-0 flex items-center px-4 bg-background z-10"
            >
              <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMobileSearch(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
                <Input
                  type="search"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-input border-border"
                  autoFocus
                />
                <Button type="submit" variant="ghost" size="icon">
                  <Search className="w-5 h-5" />
                </Button>
              </form>
            </motion.div>
          ) : (
            <div className="hidden md:flex items-center flex-1 max-w-2xl mx-4">
              <form onSubmit={handleSearch} className="flex-1 flex items-center">
                <div className="relative flex-1">
                  <Input
                    type="search"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className={`w-full pl-4 pr-4 py-2 bg-input border-border rounded-l-full transition-all ${
                      isSearchFocused ? 'border-primary' : ''
                    }`}
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  className="rounded-l-none rounded-r-full px-6 border border-l-0 border-border"
                >
                  <Search className="w-5 h-5" />
                </Button>
              </form>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 rounded-full bg-secondary"
              >
                <Mic className="w-5 h-5" />
              </Button>
            </div>
          )}
        </AnimatePresence>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowMobileSearch(true)}
          >
            <Search className="w-5 h-5" />
          </Button>

          {user ? (
            <>
              <Link to="/upload">
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Upload className="w-5 h-5" />
                </Button>
              </Link>

              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {profile?.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-card border-border">
                  <div className="flex items-center gap-3 p-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {profile?.display_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {profile?.display_name || 'User'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{profile?.username || user.email?.split('@')[0]}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/channel/me')}>
                    <User className="w-4 h-4 mr-3" />
                    Your Channel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/studio')}>
                    <Play className="w-4 h-4 mr-3" />
                    Studio
                  </DropdownMenuItem>
                  {isModerator && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="w-4 h-4 mr-3" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      {resolvedTheme === 'dark' ? (
                        <Moon className="w-4 h-4 mr-3" />
                      ) : (
                        <Sun className="w-4 h-4 mr-3" />
                      )}
                      Appearance
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="bg-card border-border">
                      <DropdownMenuItem onClick={() => setTheme('dark')}>
                        <Moon className="w-4 h-4 mr-3" />
                        Dark
                        {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('light')}>
                        <Sun className="w-4 h-4 mr-3" />
                        Light
                        {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('system')}>
                        <Monitor className="w-4 h-4 mr-3" />
                        System
                        {theme === 'system' && <span className="ml-auto text-primary">✓</span>}
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem onClick={() => navigate('/help')}>
                    <HelpCircle className="w-4 h-4 mr-3" />
                    Help
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/auth">
              <Button className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-primary">
                <User className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
