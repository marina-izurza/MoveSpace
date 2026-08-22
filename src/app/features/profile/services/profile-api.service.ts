import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase.service';

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private db = inject(SupabaseService).client;

  // No AuthService dependency here on purpose: AuthService needs this service too
  // (to claim a username right after signup), and injecting each other would be
  // a circular dependency. Callers pass the user id instead.

  async getUsername(userId: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('profiles').select('username').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data?.username ?? null;
  }

  /** Same lookup the login-with-username flow uses, so "available" matches "findable" exactly. */
  async isUsernameAvailable(username: string): Promise<boolean> {
    if (!USERNAME_PATTERN.test(username)) return false;
    const { data, error } = await this.db.rpc('get_user_id_by_username', { p_username: username });
    if (error) throw error;
    return data === null;
  }

  /**
   * Throws 'invalid_username' or 'username_taken' — the profiles table enforces both
   * (format check + case-insensitive unique index), so a race with another device
   * or user still ends up caught here instead of silently succeeding twice.
   */
  async setUsername(userId: string, username: string): Promise<void> {
    if (!USERNAME_PATTERN.test(username)) throw new Error('invalid_username');

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
