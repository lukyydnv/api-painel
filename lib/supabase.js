import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export const ADMIN_KEY = process.env.ADMIN_KEY || 'hakaiadmin44';
export const ALLOWED_ORIGIN = 'https://hakaiapi.vercel.app';
