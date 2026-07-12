import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  UploadCloud,
  Zap,
  Film,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUploadQueue, QueuedUpload } from '@/contexts/UploadQueueContext';
import { cn } from '@/lib/utils';

function statusLabel(item: QueuedUpload) {
  switch (item.status) {
    case 'queued':
      return 'Ready';
    case 'analyzing':
      return 'Analyzing…';
    case 'thumbnailing':
      return 'Picking thumbnail…';
    case 'suggesting':
      return 'AI writing metadata…';
    case 'uploading':
      return 'Uploading…';
    case 'saving':
      return 'Saving…';
    case 'done':
      return 'Published';
    case 'error':
      return item.error || 'Failed';
    case 'cancelled':
      return 'Cancelled';
  }
}

export function UploadDock() {
  const {
    items,
    isDockOpen,
    setDockOpen,
    removeItem,
    publishItem,
    clearCompleted,
  } = useUploadQueue();

  const activeCount = useMemo(
    () =>
      items.filter(
        (i) =>
          i.status !== 'done' &&
          i.status !== 'cancelled' &&
          i.status !== 'error',
      ).length,
    [items],
  );
  const doneCount = useMemo(
    () => items.filter((i) => i.status === 'done').length,
    [items],
  );

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 w-[min(380px,calc(100vw-2rem))]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
      >
        <button
          onClick={() => setDockOpen(!isDockOpen)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
            {activeCount > 0 ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-semibold">
              {activeCount > 0
                ? `Uploading ${activeCount} ${activeCount === 1 ? 'video' : 'videos'}`
                : `${doneCount} published`}
            </div>
            <div className="text-xs text-muted-foreground">
              {items.length} in queue
            </div>
          </div>
          {isDockOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <AnimatePresence initial={false}>
          {isDockOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="max-h-[50vh] overflow-y-auto divide-y divide-border/60">
                {items.map((item) => (
                  <div key={item.id} className="p-3 flex items-start gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        item.isShort
                          ? 'bg-primary/15 text-primary'
                          : 'bg-secondary text-foreground',
                      )}
                    >
                      {item.isShort ? (
                        <Zap className="w-4 h-4" />
                      ) : (
                        <Film className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {item.title}
                          </div>
                          <div
                            className={cn(
                              'text-xs mt-0.5',
                              item.status === 'error'
                                ? 'text-destructive'
                                : 'text-muted-foreground',
                            )}
                          >
                            {statusLabel(item)}
                            {item.probe
                              ? ` · ${item.probe.duration}s · ${item.isShort ? 'Short' : 'Long'}`
                              : ''}
                          </div>
                        </div>
                        {item.status === 'done' ? (
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : item.status === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        ) : (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-muted-foreground hover:text-foreground flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {item.status !== 'done' &&
                        item.status !== 'error' &&
                        item.status !== 'cancelled' && (
                          <Progress
                            value={item.progress}
                            className="h-1 mt-2"
                          />
                        )}
                      {item.status === 'queued' && (
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs"
                            onClick={() => publishItem(item.id)}
                          >
                            Publish now
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                >
                  <Link to="/upload/bulk">
                    <UploadCloud className="w-4 h-4 mr-1.5" />
                    Open queue
                  </Link>
                </Button>
                {doneCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearCompleted}
                    className="text-xs"
                  >
                    Clear done
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
