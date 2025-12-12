import { createClient } from '@supabase/supabase-js';

// Default Project URL provided by the user
const DEFAULT_SUPABASE_URL = 'https://ycdjfjszrbedglntqfjy.supabase.co';

// Safely access environment variables to prevent "Cannot read properties of undefined"
const getEnv = () => {
  try {
    // Check if import.meta.env exists
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

// Use the specific Supabase project URL provided by the user as default
// If env.VITE_SUPABASE_URL is undefined, it falls back to the DEFAULT_SUPABASE_URL
const supabaseUrl = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

// Only initialize if keys are present (Anon Key is required)
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn('Supabase credentials not found (Anon Key missing). App will use Mock Data / LocalStorage.');
} else {
  console.log(`Connected to Supabase: ${supabaseUrl}`);
}