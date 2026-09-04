import { Clipboard } from '@capacitor/clipboard';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { isNativeApp } from './platform';

interface SharePayload {
  title?: string;
  text?: string;
  url: string;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (isNativeApp()) {
      await Clipboard.write({ string: text });
      return true;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn('Clipboard unavailable:', error);
  }

  return false;
}

export async function shareLink(payload: SharePayload): Promise<'shared' | 'copied' | 'cancelled'> {
  try {
    if (isNativeApp()) {
      await Share.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
        dialogTitle: payload.title,
      });
      return 'shared';
    }

    if (navigator.share) {
      await navigator.share(payload);
      return 'shared';
    }
  } catch {
    return 'cancelled';
  }

  return (await copyToClipboard(payload.url)) ? 'copied' : 'cancelled';
}

export async function getNativePreference(key: string): Promise<string | null> {
  if (!isNativeApp()) return null;
  const { value } = await Preferences.get({ key });
  return value;
}

export async function setNativePreference(key: string, value: string): Promise<void> {
  if (isNativeApp()) await Preferences.set({ key, value });
}