import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// On native Android/iOS, use Capacitor Preferences (SharedPreferences / NSUserDefaults)
// instead of WebView localStorage, which the OS can evict under memory pressure.
export const supabaseStorage = Capacitor.isNativePlatform()
  ? {
      getItem: async (key: string) => {
        const { value } = await Preferences.get({ key });
        return value;
      },
      setItem: async (key: string, value: string) => {
        await Preferences.set({ key, value });
      },
      removeItem: async (key: string) => {
        await Preferences.remove({ key });
      },
    }
  : undefined; // undefined = default localStorage on web
