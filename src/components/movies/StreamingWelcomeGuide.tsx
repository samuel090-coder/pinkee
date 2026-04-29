import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Volume2, ShieldAlert, RefreshCw, MousePointerClick, ExternalLink } from 'lucide-react';

const STORAGE_KEY = 'pinkee:streaming-welcome-seen-v1';

interface StreamingWelcomeGuideProps {
  /** Optional: force open regardless of localStorage (e.g. from a "Help" button). */
  forceOpen?: boolean;
  onClose?: () => void;
}

/**
 * One-time welcome modal that explains:
 *  - This is a free aggregator of public streaming providers (no paid licensing).
 *  - Why ads / popups happen, and that they should NOT panic.
 *  - Step-by-step: how to enable sound and successfully watch a video.
 *
 * Persists the dismissal in localStorage so it only shows once per device,
 * unless `forceOpen` is true (used by a "How to watch" help button).
 */
export function StreamingWelcomeGuide({ forceOpen = false, onClose }: StreamingWelcomeGuideProps) {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleClose = () => {
    if (dontShowAgain && !forceOpen) {
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? handleClose() : setOpen(true))}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-base">Welcome — read this first 👀</DialogTitle>
          </div>
          <DialogDescription className="text-xs leading-relaxed">
            Pinkee streams Movies & TV shows for <span className="font-semibold text-foreground">100% free</span> by
            pulling from public third-party providers (instead of charging you like Netflix or Prime). That means a few
            quirks — but they're easy to handle. <span className="font-semibold text-foreground">Don't panic.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          {/* Why ads */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-[11px] leading-relaxed">
                <p className="font-semibold text-foreground mb-1">Why you may see pop-ups or ad redirects</p>
                <p className="text-muted-foreground">
                  The free streaming providers fund themselves with ads. The first tap inside the player sometimes opens
                  an ad in a new tab. <span className="text-foreground font-medium">This is normal and harmless</span> —
                  just close that tab and come back.
                </p>
              </div>
            </div>
          </div>

          {/* Step by step */}
          <div>
            <p className="text-xs font-semibold mb-2 text-foreground">How to successfully watch a video</p>
            <ol className="space-y-2.5">
              <Step
                n={1}
                icon={<MousePointerClick className="w-3.5 h-3.5" />}
                title="Wait for the player to load"
                body="You'll see “Connecting to [server]…”. If it stalls, we automatically jump to the next server."
              />
              <Step
                n={2}
                icon={<Volume2 className="w-3.5 h-3.5" />}
                title="Tap the speaker icon to unmute"
                body={
                  <>
                    First tap on the player <span className="text-foreground">may open an ad tab</span> — that's
                    expected. Just <span className="text-foreground font-medium">close the ad tab</span>, come back,
                    and tap the speaker icon again. Sound will work.
                  </>
                }
              />
              <Step
                n={3}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                title="If video stays black, switch server"
                body="Below the player there's a server list (VidSrc, 2Embed, etc.). Tap a different one — it usually fixes it instantly."
              />
              <Step
                n={4}
                icon={<ExternalLink className="w-3.5 h-3.5" />}
                title="Pro tip: use Brave or install uBlock Origin"
                body="An ad blocker makes the experience nearly ad-free. Brave browser blocks pop-ups by default."
              />
            </ol>
          </div>

          {/* Reassurance */}
          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">You're safe.</span> Pinkee never asks for payment to watch.
            Ignore any popup that asks you to install software, log into a strange site, or pay — close it and reload.
          </div>

          <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer pt-1">
            <Checkbox
              checked={dontShowAgain}
              onCheckedChange={(v) => setDontShowAgain(v === true)}
            />
            Don't show this again on this device
          </label>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            Got it — let me watch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <li className="flex gap-2.5">
      <div className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
          <span className="text-primary">{icon}</span>
          {title}
        </p>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{body}</p>
      </div>
    </li>
  );
}
