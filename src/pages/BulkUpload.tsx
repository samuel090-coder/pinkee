import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  Sparkles,
  Zap,
  Film,
  X,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Rocket,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUploadQueue } from '@/contexts/UploadQueueContext';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  'Entertainment',
  'Music',
  'Gaming',
  'Education',
  'Science & Technology',
  'Sports',
  'Comedy',
  'Film & Animation',
  'News & Politics',
  'Howto & Style',
  'Pets & Animals',
  'Travel & Events',
  'Autos & Vehicles',
  'People & Blogs',
];

const BulkUpload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    items,
    addFiles,
    updateItem,
    removeItem,
    publishItem,
    publishAll,
    regenerateSuggestion,
    clearCompleted,
  } = useUploadQueue();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      addFiles(Array.from(files));
    },
    [addFiles],
  );

  if (!user) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
          <Film className="w-14 h-14 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sign in to bulk upload</h1>
          <p className="text-muted-foreground mb-6">
            You need an account to publish videos.
          </p>
          <Button onClick={() => navigate('/auth?returnTo=/upload/bulk')}>
            Sign in
          </Button>
        </div>
      </MainLayout>
    );
  }

  const readyCount = items.filter(
    (i) => i.status === 'queued' && i.title.trim(),
  ).length;

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
              <UploadCloud className="w-7 h-7 text-primary" />
              Bulk Upload Studio
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Drop dozens of clips at once. AI picks thumbnails, writes titles &
              descriptions, and auto-classifies Shorts vs long-form.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/upload')}
              className="hidden sm:inline-flex"
            >
              Single upload
            </Button>
            <Button
              onClick={publishAll}
              disabled={readyCount === 0}
              className="gap-2"
            >
              <Rocket className="w-4 h-4" />
              Publish all ({readyCount})
            </Button>
          </div>
        </div>

        {/* Dropzone */}
        <motion.div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all',
            'flex flex-col items-center justify-center gap-3 text-center',
            isDragging
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-border hover:border-primary/60 hover:bg-muted/40',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {isDragging ? 'Drop your videos' : 'Drop videos or tap to browse'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              MP4, MOV, WebM · up to 50MB each · unlimited files
            </p>
            <p className="text-xs text-primary/80 mt-1">
              Pro tip: add a strong title, category & at least 2 hashtags — videos without them rarely go viral.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            <Badge variant="secondary" className="gap-1">
              <Wand2 className="w-3 h-3" /> Auto thumbnails
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" /> AI metadata
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Zap className="w-3 h-3" /> Short/Long auto-detect
            </Badge>
          </div>
        </motion.div>

        {/* Queue */}
        {items.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Queue ({items.length})
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCompleted}
                className="text-xs"
              >
                Clear completed
              </Button>
            </div>

            <div className="grid gap-4">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'rounded-2xl border bg-card/80 backdrop-blur p-4 sm:p-5',
                    item.status === 'done' &&
                      'border-primary/40 bg-primary/5',
                    item.status === 'error' &&
                      'border-destructive/40 bg-destructive/5',
                  )}
                >
                  <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[140px_1fr] gap-4">
                    {/* Thumbnail preview */}
                    <div className="relative w-24 sm:w-full aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      {item.thumbnailBlob ? (
                        <img
                          src={URL.createObjectURL(item.thumbnailBlob)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Film className="w-6 h-6 text-muted-foreground" />
                      )}
                      <div className="absolute top-1 left-1 flex gap-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 gap-1 backdrop-blur"
                        >
                          {item.isShort ? (
                            <>
                              <Zap className="w-2.5 h-2.5" /> Short
                            </>
                          ) : (
                            <>
                              <Film className="w-2.5 h-2.5" /> Long
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>

                    {/* Metadata form */}
                    <div className="space-y-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs text-muted-foreground truncate">
                          {item.file.name} ·{' '}
                          {(item.file.size / (1024 * 1024)).toFixed(1)}MB
                          {item.probe
                            ? ` · ${item.probe.width}×${item.probe.height} · ${item.probe.duration}s`
                            : ''}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {item.status === 'suggesting' ||
                          item.status === 'analyzing' ||
                          item.status === 'thumbnailing' ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : item.status === 'done' ? (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          ) : item.status === 'error' ? (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          ) : null}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-muted-foreground hover:text-foreground p-1"
                            aria-label="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={item.title}
                            onChange={(e) =>
                              updateItem(item.id, { title: e.target.value })
                            }
                            placeholder="Give it a great title"
                            className="mt-1"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Description</Label>
                          <Textarea
                            value={item.description}
                            onChange={(e) =>
                              updateItem(item.id, {
                                description: e.target.value,
                              })
                            }
                            placeholder="What's this about?"
                            rows={2}
                            className="mt-1 resize-none"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={item.category}
                            onValueChange={(v) =>
                              updateItem(item.id, { category: v })
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Visibility</Label>
                          <Select
                            value={item.visibility}
                            onValueChange={(v) =>
                              updateItem(item.id, {
                                visibility: v as any,
                              })
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">Public</SelectItem>
                              <SelectItem value="unlisted">Unlisted</SelectItem>
                              <SelectItem value="private">Private</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Tags</Label>
                          <Input
                            value={item.tags.join(', ')}
                            onChange={(e) =>
                              updateItem(item.id, {
                                tags: e.target.value
                                  .split(',')
                                  .map((t) => t.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="tag1, tag2, tag3"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {(item.status === 'uploading' ||
                        item.status === 'saving' ||
                        item.status === 'analyzing' ||
                        item.status === 'thumbnailing' ||
                        item.status === 'suggesting') && (
                        <div className="space-y-1">
                          <Progress value={item.progress} className="h-1.5" />
                          <div className="text-xs text-muted-foreground">
                            {item.status === 'uploading' && 'Uploading video…'}
                            {item.status === 'saving' && 'Saving to library…'}
                            {item.status === 'analyzing' &&
                              'Analyzing video…'}
                            {item.status === 'thumbnailing' &&
                              'Picking best thumbnail…'}
                            {item.status === 'suggesting' &&
                              'AI writing metadata…'}
                          </div>
                        </div>
                      )}

                      {item.status === 'error' && (
                        <div className="text-xs text-destructive">
                          {item.error}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => publishItem(item.id)}
                          disabled={
                            item.status === 'uploading' ||
                            item.status === 'saving' ||
                            item.status === 'done' ||
                            !item.title.trim()
                          }
                          className="gap-1.5"
                        >
                          {item.status === 'done' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Published
                            </>
                          ) : (
                            <>
                              <Rocket className="w-3.5 h-3.5" /> Publish
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => regenerateSuggestion(item.id)}
                          disabled={
                            item.status === 'uploading' ||
                            item.status === 'saving' ||
                            item.status === 'suggesting' ||
                            item.status === 'analyzing' ||
                            item.status === 'done'
                          }
                          className="gap-1.5"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          Re-run AI
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default BulkUpload;
