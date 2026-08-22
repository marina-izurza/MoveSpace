import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';
import { AuthService } from '../../../core/auth.service';

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private db = inject(SupabaseService).client;
  private auth = inject(AuthService);

  async getMyUsername(): Promise<string | null> {
    const userId = this.auth.user()?.id;
    if (!userId) return null;
    const { data, error } = await this.db
      .from('profiles').select('username').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data?.username ?? null;
  }

  /**
   * Throws 'invalid_username' or 'username_taken' — the profiles table enforces both
   * (format check + case-insensitive unique index), so a race with another device
   * or user still ends up caught here instead of silently succeeding twice.
   */
  async setUsername(username: string): Promise<void> {
    if (!USERNAME_PATTERN.test(username)) throw new Error('invalid_username');

    const userId = this.auth.user()!.id;
    const { error } = await this.db
      .from('profiles')
      .upsert({ user_id: userId, username }, { onConflict: 'user_id' });

    if (error) {
      if (error.code === '23505') throw new Error('username_taken');
      if (error.code === '23514') throw new Error('invalid_username');
      throw error;
    }
  }
}
