import { useAppLifecycle } from '@/hooks/useAppLifecycle';

export function AppLifecycleBridge() {
  useAppLifecycle();
  return null;
}