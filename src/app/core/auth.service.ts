import { Injectable, signal, inject, NgZone } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { ThemeService } from './theme.service';
import { AccentService, Accent } from './accent.service';
import { LanguageService } from './language.service';
import { appOrigin } from './app-origin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService).client;
  private themeService = inject(ThemeService);
  private accentService = inject(AccentService);
  private languageService = inject(LanguageService);
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
          this.applyUserPreferences(data.session.user.user_metadata);
        }
        this._initialized.set(true);
      });
    });

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.zone.run(() => {
        this.session.set(session);
        this.user.set(session?.user ?? null);
        if (event === 'SIGNED_IN' && session?.user?.user_metadata) {
          this.applyUserPreferences(session.user.user_metadata);
        }
      });
    });
  }

  private applyUserPreferences(meta: Record<string, any>) {
    if (meta['theme']) {
      const wantDark = meta['theme'] === 'dark';
      if (this.themeService.dark() !== wantDark) this.themeService.toggle();
    }
    if (meta['accent']) {
      this.accentService.set(meta['accent'] as Accent);
    }
    this.languageService.setIfSupported(meta['language']);
  }

  async savePreferences(prefs: { theme?: string; accent?: string; language?: string }) {
    await this.supabase.auth.updateUser({ data: prefs });
  }

  /**
   * With email confirmation enabled Supabase creates the user but no session, so navigating
   * straight into the app would bounce off the auth guard and look like the sign-up failed.
   */
  async signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw error;
    return { needsConfirmation: !data.session };
  }

  async signIn(email: string, password: string) {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
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
