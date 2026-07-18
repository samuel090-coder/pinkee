import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { probeVideoFile, VideoProbe } from '@/lib/video-classifier';
import { extractBestThumbnail } from '@/lib/thumbnail-extractor';

export type UploadStatus =
  | 'queued'
  | 'analyzing'
  | 'thumbnailing'
  | 'suggesting'
  | 'uploading'
  | 'saving'
  | 'done'
  | 'error'
  | 'cancelled';

export interface QueuedUpload {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  probe?: VideoProbe;
  isShort: boolean;
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: 'public' | 'unlisted' | 'private';
  thumbnailBlob?: Blob;
  thumbnailUrl?: string;
  videoUrl?: string;
  videoId?: string;
  suggestedAt?: number;
}

interface UploadQueueContextValue {
  items: QueuedUpload[];
  addFiles: (files: File[]) => void;
  updateItem: (id: string, patch: Partial<QueuedUpload>) => void;
  removeItem: (id: string) => void;
  cancelItem: (id: string) => void;
  publishItem: (id: string) => Promise<void>;
  publishAll: () => Promise<void>;
  regenerateSuggestion: (id: string) => Promise<void>;
  clearCompleted: () => void;
  isDockOpen: boolean;
  setDockOpen: (open: boolean) => void;
}

const UploadQueueContext = createContext<UploadQueueContextValue | undefined>(
  undefined,
);

function makeId() {
  return `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<QueuedUpload[]>([]);
  const [isDockOpen, setDockOpen] = useState(false);
  const itemsRef = useRef<QueuedUpload[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const patch = useCallback((id: string, updates: Partial<QueuedUpload>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...updates } : it)),
    );
  }, []);

  const analyzeItem = useCallback(
    async (id: string) => {
      const item = itemsRef.current.find((i) => i.id === id);
      if (!item) return;

      try {
        patch(id, { status: 'analyzing', progress: 5 });
        const probe = await probeVideoFile(item.file);
        patch(id, { probe, isShort: probe.isShort, progress: 15 });

        patch(id, { status: 'thumbnailing', progress: 25 });
        const best = await extractBestThumbnail(item.file, {
          frames: 4,
          maxWidth: 1280,
          quality: 0.82,
        });
        if (best) patch(id, { thumbnailBlob: best.blob, progress: 40 });

        patch(id, { status: 'suggesting', progress: 50 });
        let thumbB64: string | undefined;
        if (best) {
          try {
            thumbB64 = await blobToBase64(best.blob);
          } catch {
            thumbB64 = undefined;
          }
        }
        const { data, error } = await supabase.functions.invoke(
          'suggest-metadata',
          {
            body: {
              filename: item.file.name,
              duration: probe.duration,
              width: probe.width,
              height: probe.height,
              is_short: probe.isShort,
              thumbnail_base64: thumbB64,
            },
          },
        );

        if (!error && data?.success && data.suggestion) {
          patch(id, {
            title: data.suggestion.title,
            description: data.suggestion.description,
            category: data.suggestion.category,
            tags: data.suggestion.tags || [],
            status: 'queued',
            progress: 60,
            suggestedAt: Date.now(),
          });
        } else {
          patch(id, { status: 'queued', progress: 60 });
        }
      } catch (err) {
        console.error('analyze failed', err);
        patch(id, {
          status: 'queued',
          progress: 60,
          error: 'Auto-analysis failed — you can still publish manually.',
        });
      }
    },
    [patch],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const MAX = 50 * 1024 * 1024; // 50MB platform cap
      const rejected: string[] = [];
      const additions: QueuedUpload[] = files
        .filter((f) => {
          if (!f.type.startsWith('video/')) return false;
          if (f.size > MAX) {
            rejected.push(`${f.name} (${(f.size / (1024 * 1024)).toFixed(0)}MB)`);
            return false;
          }
          return true;
        })
        .map((file) => ({
          id: makeId(),
          file,
          status: 'queued' as UploadStatus,
          progress: 0,
          isShort: false,
          title: file.name.replace(/\.[^.]+$/, ''),
          description: '',
          category: 'Entertainment',
          tags: [],
          visibility: 'public' as const,
        }));

      if (rejected.length > 0) {
        toast({
          title: `${rejected.length} file(s) too large`,
          description: `50MB max per video. Skipped: ${rejected.slice(0, 3).join(', ')}${rejected.length > 3 ? '…' : ''}`,
          variant: 'destructive',
        });
      }

      if (additions.length === 0) {
        if (rejected.length === 0) {
          toast({
            title: 'No videos found',
            description: 'Only video files can be added to the queue.',
            variant: 'destructive',
          });
        }
        return;
      }

      setItems((prev) => [...prev, ...additions]);
      setDockOpen(true);
      // kick off analysis in parallel (max 2 concurrent)
      (async () => {
        const chunks: QueuedUpload[][] = [];
        for (let i = 0; i < additions.length; i += 2) {
          chunks.push(additions.slice(i, i + 2));
        }
        for (const chunk of chunks) {
          await Promise.all(chunk.map((a) => analyzeItem(a.id)));
        }
      })();
    },
    [analyzeItem],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const cancelItem = useCallback((id: string) => {
    patch(id, { status: 'cancelled' });
  }, [patch]);

  const clearCompleted = useCallback(() => {
    setItems((prev) =>
      prev.filter(
        (i) =>
          i.status !== 'done' &&
          i.status !== 'cancelled' &&
          i.status !== 'error',
      ),
    );
  }, []);

  const publishItem = useCallback(
    async (id: string) => {
      if (!user) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to publish videos.',
          variant: 'destructive',
        });
        return;
      }
      const item = itemsRef.current.find((i) => i.id === id);
      if (!item) return;
      if (item.status === 'uploading' || item.status === 'saving') return;

      // Soft virality validation
      if (!item.title.trim() || item.title.trim().length < 5) {
        toast({
          title: 'Title too short',
          description: 'Give this video a proper title (min 5 chars) so it can go viral.',
          variant: 'destructive',
        });
        return;
      }
      if (!item.isShort && !item.category) {
        toast({
          title: 'Pick a category',
          description: 'A category helps the algorithm recommend your video.',
          variant: 'destructive',
        });
        return;
      }
      if ((item.tags || []).length < 2) {
        toast({
          title: 'Add hashtags',
          description: 'Videos without hashtags rarely reach new viewers. Add at least 2 tags.',
          variant: 'destructive',
        });
        return;
      }

      try {
        patch(id, { status: 'uploading', progress: 65, error: undefined });

        const ext = item.file.name.split('.').pop() || 'mp4';
        const videoPath = `${user.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from('videos')
          .upload(videoPath, item.file, {
            cacheControl: '3600',
            upsert: false,
          });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage
          .from('videos')
          .getPublicUrl(videoPath);
        const videoUrl = pub.publicUrl;
        patch(id, { progress: 85, videoUrl });

        let thumbnailUrl: string | undefined;
        if (item.thumbnailBlob) {
          const thumbFile = new File(
            [item.thumbnailBlob],
            `thumb-${Date.now()}.jpg`,
            { type: 'image/jpeg' },
          );
          const thumbPath = `${user.id}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}.jpg`;
          const { error: tErr } = await supabase.storage
            .from('thumbnails')
            .upload(thumbPath, thumbFile, {
              cacheControl: '3600',
              upsert: false,
            });
          if (!tErr) {
            thumbnailUrl = supabase.storage
              .from('thumbnails')
              .getPublicUrl(thumbPath).data.publicUrl;
          }
        }
        patch(id, { status: 'saving', progress: 92, thumbnailUrl });

        const { data: newVideo, error: insErr } = await supabase
          .from('videos')
          .insert({
            title: item.title.trim() || 'Untitled',
            description: item.description.trim() || null,
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl || null,
            duration: item.probe?.duration || 0,
            uploader_id: user.id,
            category: item.isShort ? 'Shorts' : item.category,
            tags: item.tags,
            status: item.visibility === 'public' ? 'published' : item.visibility,
            is_published: item.visibility === 'public',
            published_at:
              item.visibility === 'public' ? new Date().toISOString() : null,
          })
          .select('id')
          .single();

        if (insErr) throw insErr;

        patch(id, {
          status: 'done',
          progress: 100,
          videoId: newVideo?.id,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        console.error('publish failed', err);
        patch(id, { status: 'error', error: msg });
        toast({
          title: 'Upload failed',
          description: msg,
          variant: 'destructive',
        });
      }
    },
    [user, patch],
  );

  const publishAll = useCallback(async () => {
    const pending = itemsRef.current.filter(
      (i) =>
        i.status !== 'done' &&
        i.status !== 'uploading' &&
        i.status !== 'saving' &&
        i.status !== 'cancelled',
    );
    for (const item of pending) {
      // eslint-disable-next-line no-await-in-loop
      await publishItem(item.id);
    }
  }, [publishItem]);

  const regenerateSuggestion = useCallback(
    async (id: string) => {
      await analyzeItem(id);
    },
    [analyzeItem],
  );

  // Warn on navigation while uploads in progress
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const inProgress = itemsRef.current.some(
        (i) =>
          i.status === 'uploading' ||
          i.status === 'saving' ||
          i.status === 'analyzing' ||
          i.status === 'thumbnailing' ||
          i.status === 'suggesting',
      );
      if (inProgress) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return (
    <UploadQueueContext.Provider
      value={{
        items,
        addFiles,
        updateItem: patch,
        removeItem,
        cancelItem,
        publishItem,
        publishAll,
        regenerateSuggestion,
        clearCompleted,
        isDockOpen,
        setDockOpen,
      }}
    >
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) {
    throw new Error('useUploadQueue must be used within UploadQueueProvider');
  }
  return ctx;
}
