import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
}

export const MainLayout = ({ children, hideSidebar = false }: MainLayoutProps) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const location = useLocation();

  // Collapse sidebar on route change (mobile)
  useEffect(() => {
    setSidebarExpanded(false);
  }, [location.pathname]);

  // Check screen size for default sidebar state
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 1280) {
        setSidebarExpanded(true);
      } else {
        setSidebarExpanded(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopNav onMenuToggle={() => setSidebarExpanded(!sidebarExpanded)} />
      
      {!hideSidebar && (
        <Sidebar 
          isExpanded={sidebarExpanded} 
          onToggle={() => setSidebarExpanded(!sidebarExpanded)} 
        />
      )}

      <main
        className={cn(
          'pt-[calc(4rem+var(--safe-area-top))] min-h-screen transition-all duration-300 pb-[calc(4rem+var(--safe-area-bottom))] lg:pb-0',
          !hideSidebar && 'lg:pl-[72px]',
          !hideSidebar && sidebarExpanded && 'xl:pl-[240px]'
        )}
      >
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
};
