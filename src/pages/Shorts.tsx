import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVideo } from '@/contexts/VideoContext';
import { ShortsPlayer } from '@/components/shorts/ShortsPlayer';

const Shorts = () => {
  const [searchParams] = useSearchParams();
  const startVideoId = searchParams.get('start');
  const { videos } = useVideo();
  const [currentIndex, setCurrentIndex] = useState(0);

  const shorts = useMemo(() => {
    const allShorts = [...videos]
      .filter(v => v.is_published)
      .filter(v => {
        const dur = v.duration || 0;
        const category = (v.category || '').toLowerCase();
        return category === 'shorts' || (dur > 0 && dur <= 60);
      })
      .slice(0, 50);
    
    // If we have a start video ID, reorder to put it first
    if (startVideoId) {
      const startIndex = allShorts.findIndex(v => v.id === startVideoId);
      if (startIndex > 0) {
        const [startVideo] = allShorts.splice(startIndex, 1);
        allShorts.unshift(startVideo);
      }
    }
    
    return allShorts;
  }, [videos, startVideoId]);

  return (
    <ShortsPlayer 
      shorts={shorts} 
      currentIndex={currentIndex} 
      setCurrentIndex={setCurrentIndex} 
    />
  );
};

export default Shorts;
