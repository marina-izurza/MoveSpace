import { Injectable, signal, inject } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { ThemeService } from './theme.service';
import { AccentService, Accent } from './accent.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService).client;
  private themeService = inject(ThemeService);
  private accentService = inject(AccentService);

  session = signal<Session | null>(null);
  user = signal<User | null>(null);

  constructor() {
    this.supabase.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.user.set(data.session?.user ?? null);
      if (data.session?.user?.user_metadata) {
        this.applyUserPreferences(data.session.user.user_metadata);
      }
    });

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.session.set(session);
      this.user.set(session?.user ?? null);
      if (event === 'SIGNED_IN' && session?.user?.user_metadata) {
        this.applyUserPreferences(session.user.user_metadata);
      }
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
  }

  async savePreferences(prefs: { theme?: string; accent?: string }) {
    await this.supabase.auth.updateUser({ data: prefs });
  }

  async signUp(email: string, password: string) {
    const { error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async signIn(email: string, password: string) {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut() {
    await this.supabase.auth.signOut();
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
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
