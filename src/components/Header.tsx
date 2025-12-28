import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVideo } from '@/contexts/VideoContext';
import { NotificationBell } from './NotificationBell';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { adminSettings } = useVideo();
  
  const siteName = adminSettings?.site_name || 'PlayStream';
  const [firstWord, ...rest] = siteName.split(/(?=[A-Z])|(?<=\s)/);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center pink-glow"
            >
              <Play className="w-5 h-5 text-primary-foreground" fill="currentColor" />
            </motion.div>
            <span className="font-display font-bold text-xl">
              <span className="text-gradient-pink">{firstWord}</span>
              <span className="text-foreground">{rest.join('')}</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/subscribe" 
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Subscribe
            </Link>
            <NotificationBell />
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <motion.nav
          initial={false}
          animate={{ height: isMenuOpen ? 'auto' : 0, opacity: isMenuOpen ? 1 : 0 }}
          className={cn(
            "md:hidden overflow-hidden",
            isMenuOpen ? "pb-4" : ""
          )}
        >
          <div className="flex flex-col gap-2">
            <Link 
              to="/" 
              onClick={() => setIsMenuOpen(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/subscribe" 
              onClick={() => setIsMenuOpen(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
            >
              Subscribe
            </Link>
            <div className="px-4 py-2">
              <NotificationBell />
            </div>
          </div>
        </motion.nav>
      </div>
    </header>
  );
}
