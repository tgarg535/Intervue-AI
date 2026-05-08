import { createClient } from '@supabase/supabase-js';

declare const process: {
  env: {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  };
};

// These environment variables should be in your frontend/.env.local file 
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Check your .env.local file.");
}

/**
 * The standard client for browser-side database and storage operations.
 * Used for PDF uploads and fetching final report JSON.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);