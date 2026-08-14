import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { supabaseStorage } from './supabase-storage';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey,
    supabaseStorage ? { auth: { storage: supabaseStorage } } : {}
  );
}
