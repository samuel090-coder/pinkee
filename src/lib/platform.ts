import { Capacitor } from '@capacitor/core';

export const isNativeApp = () => Capacitor.isNativePlatform();
export const isWebApp = () => !isNativeApp();
export const nativePlatform = () => Capacitor.getPlatform();

export function hasBrowserApi(name: string): boolean {
  return typeof window !== 'undefined' && name in window;
}