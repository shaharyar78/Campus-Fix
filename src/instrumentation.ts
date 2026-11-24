import { assertSupabaseConfiguredForProduction } from '@/lib/supabase/config';

export function register() {
  assertSupabaseConfiguredForProduction();
}
