import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

interface PiPVideo {
  id: string;
  title: string;
  videoUrl: string;
  currentTime: number;
}

interface PiPContextType {
  pipVideo: PiPVideo | null;
  isMinimized: boolean;
  enterPiP: (video: PiPVideo) => void;
  exitPiP: () => void;
  updateTime: (time: number) => void;
}

const PiPContext = createContext<PiPContextType | undefined>(undefined);

export function PiPProvider({ children }: { children: React.ReactNode }) {
  const [pipVideo, setPipVideo] = useState<PiPVideo | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const enterPiP = useCallback((video: PiPVideo) => {
    setPipVideo(video);
    setIsMinimized(true);
  }, []);

  const exitPiP = useCallback(() => {
    setPipVideo(null);
    setIsMinimized(false);
  }, []);

  const updateTime = useCallback((time: number) => {
    setPipVideo(prev => prev ? { ...prev, currentTime: time } : null);
  }, []);

  return (
    <PiPContext.Provider value={{ pipVideo, isMinimized, enterPiP, exitPiP, updateTime }}>
      {children}
    </PiPContext.Provider>
  );
}

export function usePiP() {
  const context = useContext(PiPContext);
  if (!context) throw new Error('usePiP must be used within PiPProvider');
  return context;
}
