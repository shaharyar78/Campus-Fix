'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validateLoginInput } from '@/lib/validators';
import { createClient, syncMockClientSession } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

const PREVIEW_ACCOUNTS = [
  {
    role: 'Student',
    identifier: 'aarav.sharma@gmail.com',
    passcode: 'student123',
  },
  {
    role: 'Campus Admin',
    identifier: 'facilities.kcc@gmail.com',
    passcode: 'admin123',
  },
  {
    role: 'Super Admin',
    identifier: 'superadmin',
    passcode: 'superadmin123',
  },
] as const;

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isMockPreview = !isSupabaseConfigured();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setGeneralError(null);
    const validation = validateLoginInput(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      const identifier = formData.email.trim();
      let userId: string | null = null;

      const response = await fetch('/api/auth/resolve-username', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ username: identifier, password: formData.password }),
      });
      const resolved = await response.json();
      if (!response.ok) {
        setGeneralError(resolved.error || 'Username or password is incorrect.');
        return;
      }

      if (isMockPreview && resolved.session) {
        syncMockClientSession(resolved.session);
        userId = resolved.session.user?.id ?? null;
      } else {
        if (resolved.session?.access_token && resolved.session?.refresh_token) {
          await supabase.auth.setSession({
            access_token: resolved.session.access_token,
            refresh_token: resolved.session.refresh_token,
          });
        }
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          setGeneralError('Username or password is incorrect.');
          return;
        }
        userId = data.user.id;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cf-auth-changed'));
        }
      }

      if (!userId) {
        setGeneralError('Sign-in did not return an account. Please retry.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, approval_status')
        .eq('id', userId)
        .single();
      if (profileError || !profile) {
        setGeneralError('Your account profile could not be loaded. Contact your campus administrator.');
        return;
      }

      if (profile.approval_status === 'pending') {
        router.push('/account/pending');
      } else if (profile.approval_status === 'rejected') {
        router.push('/account/rejected');
      } else {
        router.push(
          profile.role === 'super_admin' ? '/super-admin' : profile.role === 'admin' ? '/admin' : '/dashboard'
        );
      }
      router.refresh();
    } catch {
      setGeneralError('Could not connect to the sign-in service. Check your connection and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {generalError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
          {generalError}
        </p>
      )}
      <Input
        label="Username or college email"
        type="text"
        placeholder="username or you@college.edu"
        value={formData.email}
        onChange={(event) => setFormData({ ...formData, email: event.target.value })}
        error={errors.email}
        required
        disabled={isLoading}
        autoComplete="username"
      />
      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        value={formData.password}
        onChange={(event) => setFormData({ ...formData, password: event.target.value })}
        error={errors.password}
        required
        disabled={isLoading}
        autoComplete="current-password"
        rightIcon={
          <button
            type="button"
            disabled={isLoading}
            onClick={() => setShowPassword((visible) => !visible)}
            className="text-neutral-500 transition-colors hover:text-neutral-900"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        }
      />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs font-medium text-blue-600 hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
        Sign in
      </Button>

      {isMockPreview && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              Preview workspace accounts
            </p>
            <span className="text-[11px] text-neutral-400">Local demo</span>
          </div>
          <div className="mt-2.5 grid gap-1.5">
            {PREVIEW_ACCOUNTS.map((account) => (
              <button
                key={account.role}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setGeneralError(null);
                  setErrors({});
                  setFormData({ email: account.identifier, password: account.passcode });
                }}
                className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-xs transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
              >
                <div className="min-w-0">
                  <span className="block font-medium text-neutral-900">{account.role}</span>
                  <span className="block truncate font-mono text-[11px] text-neutral-500">
                    {account.identifier}
                  </span>
                </div>
                <span className="shrink-0 font-medium text-blue-600">Fill</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="pt-2 text-center text-xs text-neutral-500">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-neutral-950 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
};
