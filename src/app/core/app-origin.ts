import { Capacitor } from '@capacitor/core';
import { environment } from '../../environments/environment';

/**
 * Origin to build links that other people will open.
 *
 * Capacitor serves the Android app from `https://localhost`, so `window.location.origin` is a
 * real http(s) origin — it just is not one anybody else can reach. Sniffing the protocol is
 * therefore not enough to tell the native shell apart from the web app; ask Capacitor instead.
 */
export function appOrigin(): string {
  return Capacitor.isNativePlatform() ? environment.publicUrl : window.location.origin;
}
