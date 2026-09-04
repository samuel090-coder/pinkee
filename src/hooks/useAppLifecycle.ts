import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { isNativeApp } from '@/lib/platform';

export function useAppLifecycle() {
  useEffect(() => {
    if (!isNativeApp()) return;

    let mounted = true;
    const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (mounted && isActive) {
        window.dispatchEvent(new CustomEvent('pinkee:app-resume'));
      }
    });

    return () => {
      mounted = false;
      void listener.then((handle) => handle.remove());
    };
  }, []);
}