import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Video } from '@/types/video';
import { VideoCard } from './VideoCard';
import { VideoPlayer } from './VideoPlayer';

interface VideoGridProps {
  videos: Video[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const navigate = useNavigate();

  const handlePlayVideo = (video: Video) => {
    if (video.isSubscriptionOnly) {
      navigate('/subscribe');
    } else {
      setSelectedVideo(video);
    }
  };

  const publishedVideos = videos.filter(v => v.isPublished);

  return (
    <>
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        role="list"
        aria-label="Video collection"
      >
        {publishedVideos.map((video, index) => (
          <VideoCard
            key={video.id}
            video={video}
            onPlay={handlePlayVideo}
            index={index}
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayer
            video={selectedVideo}
            onClose={() => setSelectedVideo(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
