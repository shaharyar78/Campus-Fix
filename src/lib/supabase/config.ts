export function cleanSecret(val?: string | null): string {
  if (!val) return '';
  return val.split(/\s+/)[0].trim();
}

export function isSupabaseConfigured(): boolean {
  const url = cleanSecret(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return Boolean(
    url &&
      anonKey &&
      !url.includes('placeholder.supabase.co') &&
      anonKey !== 'placeholder-anon-key'
  );
}

export function getSupabaseUrl(): string {
  return cleanSecret(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  return cleanSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseServiceRoleKey(): string {
  return cleanSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
