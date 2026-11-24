$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '..\.env.local'
if (-not (Test-Path -LiteralPath $envFile)) { throw 'Create .env.local from .env.example first.' }

foreach ($line in Get-Content -LiteralPath $envFile) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
    $key = $matches[1]
    $value = $matches[2].Trim().Trim('"').Trim("'")
    if ($key -in @('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')) {
      [Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
  }
}

if (-not $env:NEXT_PUBLIC_SUPABASE_URL) { throw 'NEXT_PUBLIC_SUPABASE_URL is missing from .env.local.' }
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) { throw 'Set SUPABASE_SERVICE_ROLE_KEY privately in .env.local before running this script.' }

$passwordSecure = Read-Host 'Enter the super-admin password (input is hidden)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
try {
  $env:BOOTSTRAP_SUPER_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}

$env:BOOTSTRAP_SUPER_ADMIN_USERNAME = 'shaharyar78'
$env:BOOTSTRAP_SUPER_ADMIN_EMAIL = 'kabeerhusain765@gmail.com'

@'
const { createClient } = require('@supabase/supabase-js');
(async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
  const username = process.env.BOOTSTRAP_SUPER_ADMIN_USERNAME;
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
  const { data: bootstrapCollege, error: collegeError } = await supabase.from('colleges').select('id').eq('slug', 'kcc').single();
  if (collegeError || !bootstrapCollege) throw collegeError || new Error('Run the college setup before provisioning the super-admin.');
  const { data: existingProfile, error: lookupError } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle();
  if (lookupError) throw lookupError;
  const existingResp = existingProfile?.id ? await supabase.auth.admin.getUserById(existingProfile.id) : null;
  if (existingResp?.error) throw existingResp.error;
  const existing = existingResp?.data?.user || null;
  const authResult = existing
    ? await supabase.auth.admin.updateUserById(existing.id, { email, password, email_confirm: true, user_metadata: { ...existing.user_metadata, username, full_name: username } })
    : await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username, full_name: username, college_id: bootstrapCollege.id } });
  if (authResult.error || !authResult.data.user) throw authResult.error || new Error('Supabase did not return the account.');
  const user = authResult.data.user;
  const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id, email, full_name: username, role: 'super_admin', college_id: null, approval_status: 'approved', approval_requested_role: 'super_admin', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (profileError) throw profileError;
  process.stdout.write('Super-admin account provisioned.\n');
})().catch((error) => { process.stderr.write(`Provisioning failed: ${error.message}\n`); process.exitCode = 1; });
'@ | node -

Remove-Item Env:BOOTSTRAP_SUPER_ADMIN_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
