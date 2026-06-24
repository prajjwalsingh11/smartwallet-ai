import { createClient } from '@supabase/supabase-js';

// 1. We pull the environment variables we just saved
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 2. We export a single, reusable connection instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);