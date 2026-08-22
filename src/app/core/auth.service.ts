import { Injectable, signal, inject, NgZone } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { ThemeService } from './theme.service';
import { AccentService, Accent } from './accent.service';
import { LanguageService } from './language.service';
import { appOrigin } from './app-origin';
import { ProfileApiService } from '../features/profile/services/profile-api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService).client;
  private themeService = inject(ThemeService);
  private accentService = inject(AccentService);
  private languageService = inject(LanguageService);
  private profileApi = inject(ProfileApiService);
  private zone = inject(NgZone);

  session = signal<Session | null>(null);
  user = signal<User | null>(null);
  private _initialized = signal(false);
  readonly initialized = this._initialized.asReadonly();

  constructor() {
    this.supabase.auth.getSession().then(({ data }) => {
      this.zone.run(() => {
        this.session.set(data.session);
        this.user.set(data.session?.user ?? null);
        if (data.session?.user?.user_metadata) {
          this.applyUserPreferences(data.session.user.id, data.session.user.user_metadata);
        }
        this._initialized.set(true);
      });
    });

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.zone.run(() => {
        this.session.set(session);
        this.user.set(session?.user ?? null);
        if (event === 'SIGNED_IN' && session?.user?.user_metadata) {
          this.applyUserPreferences(session.user.id, session.user.user_metadata);
        }
      });
    });
  }

  private applyUserPreferences(userId: string, meta: Record<string, any>) {
    if (meta['theme']) {
      const wantDark = meta['theme'] === 'dark';
      if (this.themeService.dark() !== wantDark) this.themeService.toggle();
    }
    if (meta['accent']) {
      this.accentService.set(meta['accent'] as Accent);
    }
    this.languageService.setIfSupported(meta['language']);

    // The username chosen at signup can only be claimed once a real session exists
    // (writing to `profiles` needs auth.uid()), which for an unconfirmed signup is
    // exactly now — the first sign-in after confirming. Cleared right after so this
    // doesn't retry forever if it's ever left set for some other reason.
    if (meta['username']) {
      this.profileApi.setUsername(userId, meta['username'])
        .catch(() => {})
        .finally(() => { void this.supabase.auth.updateUser({ data: { username: null } }); });
    }
  }

  async savePreferences(prefs: { theme?: string; accent?: string; language?: string }) {
    await this.supabase.auth.updateUser({ data: prefs });
  }

  /**
   * With email confirmation enabled Supabase creates the user but no session, so navigating
   * straight into the app would bounce off the auth guard and look like the sign-up failed.
   * The username can't be written to `profiles` yet for the same reason (no session = no
   * auth.uid() yet) — it rides along in user_metadata and gets claimed on first sign-in,
   * see applyUserPreferences().
   */
  async signUp(email: string, password: string, username: string): Promise<{ needsConfirmation: boolean }> {
    const { data, error } = await this.supabase.auth.signUp({
      email, password,
      options: { data: { username } },
    });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  }

  /** Accepts an email as-is; anything else is treated as a username and resolved server-side,
   *  since Supabase Auth itself only ever signs in by email (or phone). */
  async signIn(identifier: string, password: string) {
    if (identifier.includes('@')) {
      const { error } = await this.supabase.auth.signInWithPassword({ email: identifier, password });
      if (error) throw error;
      return;
    }

    const res = await fetch(`${appOrigin()}/api/login-with-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: identifier, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? `http_${res.status}`);

    const { error } = await this.supabase.auth.setSession({
      access_token: body.session.access_token,
      refresh_token: body.session.refresh_token,
    });
    if (error) throw error;
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }

  /**
   * Irreversible. Runs server-side because removing an auth user needs the service_role key;
   * the access token is what proves whose account it is.
   */
  async deleteAccount(): Promise<void> {
    const token = this.session()?.access_token;
    if (!token) throw new Error('no_session');

    const res = await fetch(`${appOrigin()}/api/delete-account`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `http_${res.status}`);
    }
    await this.supabase.auth.signOut();
  }

  /** Revokes the refresh tokens everywhere, not just on this device. */
  async signOutEverywhere() {
    const { error } = await this.supabase.auth.signOut({ scope: 'global' });
    if (error) throw error;
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      // Goes into an email opened on any device — it can never point at the WebView's origin.
      redirectTo: `${appOrigin()}/reset-password`,
    });
    if (error) throw error;
  }

  async updatePassword(password: string) {
    const { error } = await this.supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  async updateEmail(email: string) {
    const { error } = await this.supabase.auth.updateUser({ email });
    if (error) throw error;
  }
}
