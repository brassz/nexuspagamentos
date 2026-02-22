import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseA(): SupabaseClient {
  const url = process.env.SUPABASE_A_URL;
  const key = process.env.SUPABASE_A_SERVICE_ROLE || process.env.SUPABASE_A_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_A_URL e SUPABASE_A_SERVICE_ROLE são obrigatórios');
  return createClient(url, key);
}

export function getSupabaseB(): SupabaseClient {
  const url = process.env.SUPABASE_B_URL;
  const key = process.env.SUPABASE_B_SERVICE_ROLE || process.env.SUPABASE_B_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_B_URL e SUPABASE_B_SERVICE_ROLE são obrigatórios');
  return createClient(url, key);
}
