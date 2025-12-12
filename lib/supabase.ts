import { createClient } from '@supabase/supabase-js';

// Default Project URL and Key provided by the user
const DEFAULT_SUPABASE_URL = 'https://ycdjfjszrbedglntqfjy.supabase.co';
// Note: This appears to be a custom secret or token. Usually Supabase keys are JWTs.
// We will use it as provided.
const DEFAULT_SUPABASE_ANON_KEY = 'sb_secret_n3tMLUjAr7urFms8C6oShg_6kzAqo6j';

// Safely access environment variables
const getEnv = () => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env;
    }
  } catch (err) {
    console.warn('Error accessing import.meta.env', err);
  }
  return {};
};

const env = getEnv();

const supabaseUrl = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn('Supabase credentials not found. App will use Mock Data / LocalStorage.');
} else {
  console.log(`Connected to Supabase: ${supabaseUrl}`);
}