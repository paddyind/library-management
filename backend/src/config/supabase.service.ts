import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL') || this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('NEXT_PUBLIC_SUPABASE_ANON_KEY') || this.configService.get<string>('SUPABASE_KEY');
    
    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isConfigured = true;
        console.log('✅ Supabase client initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Supabase client:', error);
      }
    } else {
      console.warn('⚠️  Supabase credentials not configured. Using mock data mode.');
    }
  }

  getClient(): SupabaseClient {
    if (!this.supabase) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_KEY environment variables.');
    }
    return this.supabase;
  }

  isReady(): boolean {
    return this.isConfigured;
  }
}
