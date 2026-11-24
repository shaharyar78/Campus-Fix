'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { validatePassword } from '@/lib/validators';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setHasSession(Boolean(data.session));
        setSessionChecked(true);
      })
      .catch(() => {
        if (!active) return;
        setHasSession(false);
        setSessionChecked(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(Boolean(session));
        setSessionChecked(true);
      } else {
        setHasSession(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const nextFieldErrors: { password?: string; confirmPassword?: string } = {};
    const passwordError = validatePassword(password);
    if (passwordError) {
      nextFieldErrors.password = passwordError;
    }
    if (!nextFieldErrors.password && password !== confirmPassword) {
      nextFieldErrors.confirmPassword = 'Passwords do not match.';
    }
    if (nextFieldErrors.password || nextFieldErrors.confirmPassword) {
      setFieldErrors(nextFieldErrors);
      if (nextFieldErrors.password) {
        document.getElementById('new-password')?.focus();
      } else {
        document.getElementById('confirm-new-password')?.focus();
      }
      return;
    }
    setFieldErrors({});
    if (sessionChecked && !hasSession) {
      setError('Your password recovery session is missing or expired. Request a new reset link.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Password changed, but the session is missing. Sign in with your new password.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, approval_status')
        .eq('id', user.id)
        .single();

      if (profile?.approval_status === 'pending') {
        router.replace('/account/pending');
      } else if (profile?.approval_status === 'rejected') {
        router.replace('/account/rejected');
      } else if (profile?.role === 'super_admin') {
        router.replace('/super-admin');
      } else if (profile?.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
    } catch {
      setError('Could not update the password. Request a new reset link and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-md space-y-5 rounded-2xl border border-neutral-200 bg-white p-8"
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-sm font-bold tracking-tight text-neutral-950">
            CampusFix
          </Link>
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700">
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-950">
            Choose a new password
          </h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            Use at least 8 characters and avoid reusing an old password.
          </p>
        </div>

        {sessionChecked && !hasSession && (
          <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800" role="status">
            <p>No active password recovery session was found. Request a fresh reset link to update your password.</p>
            <Link href="/forgot-password" className="inline-block text-xs font-semibold text-amber-950 underline">
              Request new reset link
            </Link>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}

        <Input
          id="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          helperText="Minimum 8 characters."
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={fieldErrors.password}
          required
          disabled={isLoading}
        />
        <Input
          id="confirm-new-password"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            if (fieldErrors.confirmPassword) {
              setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }
          }}
          error={fieldErrors.confirmPassword}
          required
          disabled={isLoading}
        />
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Update password
        </Button>
      </form>
    </div>
  );
}
