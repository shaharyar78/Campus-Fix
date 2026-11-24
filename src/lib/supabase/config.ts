export function cleanSecret(val?: string | null): string {
  if (!val) return '';
  return val.split(/\s+/)[0].trim();
}

function hasValidSupabaseVars(): boolean {
  const url = cleanSecret(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return Boolean(
    url &&
      anonKey &&
      !url.includes('placeholder.supabase.co') &&
      anonKey !== 'placeholder-anon-key'
  );
}

export function assertSupabaseConfiguredForProduction(): void {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    if (!hasValidSupabaseVars() || !cleanSecret(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      throw new Error(
        'Production startup failed: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must be configured.'
      );
    }
  }
}

export function isSupabaseConfigured(): boolean {
  const configured = hasValidSupabaseVars();

  if (
    !configured &&
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    throw new Error(
      'Supabase environment variables are missing in production; mock mode is disabled.'
    );
  }

  return configured;
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
