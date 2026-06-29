import { Link, useLocation } from 'react-router-dom';
import { Lock, Sparkles, Play } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AuthWallModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

/**
 * Premium auth gate shown when guest browsing is disabled and an
 * unauthenticated visitor tries to access protected content (watch a video,
 * open Shorts, etc). Sends them to /auth and remembers where to return.
 */
export function AuthWallModal({ open, onClose, reason }: AuthWallModalProps) {
  const location = useLocation();
  const returnTo = encodeURIComponent(location.pathname + location.search);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md border-primary/30 bg-card/95 backdrop-blur-2xl p-0 overflow-hidden">
        <div className="relative">
          {/* aurora background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/30 rounded-full blur-[100px]" />
            <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-accent/30 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass border border-primary/40 mb-5 pink-glow">
              <Lock className="w-7 h-7 text-primary" />
            </div>

            <h2 className="font-display font-bold text-2xl mb-2 text-foreground">
              Sign in to <span className="text-gradient-pink">keep watching</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              {reason ||
                'Create a free account to stream videos, like, comment, save to playlists, and earn rewards.'}
            </p>

            <div className="space-y-2 mb-6 text-left">
              {[
                { icon: Play, text: 'Unlimited video streaming' },
                { icon: Sparkles, text: 'Personalized recommendations & rewards' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-secondary/40 border border-border/40">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground/90">{text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Link to={`/auth?returnTo=${returnTo}`} onClick={onClose}>
                <Button className="w-full rounded-full bg-primary text-primary-foreground font-semibold pink-glow h-11">
                  Sign in or create account
                </Button>
              </Link>
              <button
                onClick={onClose}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
