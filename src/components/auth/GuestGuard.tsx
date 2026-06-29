import { ReactNode, useState, useEffect } from 'react';
import { useVideo } from '@/contexts/VideoContext';
import { useAuth } from '@/contexts/AuthContext';
import { AuthWallModal } from './AuthWallModal';
import { useNavigate } from 'react-router-dom';

/**
 * Wrap protected routes (Watch, Shorts, Movies internals, etc).
 * - If guest_browsing_enabled is true OR the user is signed in: passes through.
 * - Otherwise: renders the auth wall modal. Dismissing it bounces to '/'.
 */
export function GuestGuard({ children }: { children: ReactNode }) {
  const { adminSettings } = useVideo();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showWall, setShowWall] = useState(false);

  const guestAllowed = adminSettings?.guest_browsing_enabled !== false;
  const blocked = !loading && !user && !guestAllowed;

  useEffect(() => {
    if (blocked) setShowWall(true);
  }, [blocked]);

  if (blocked) {
    return (
      <AuthWallModal
        open={showWall}
        onClose={() => {
          setShowWall(false);
          navigate('/', { replace: true });
        }}
      />
    );
  }

  return <>{children}</>;
}
