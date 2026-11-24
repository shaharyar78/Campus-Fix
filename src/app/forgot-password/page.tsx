'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TURNSTILE_SITE_KEY, TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { createClient } from '@/lib/supabase/client';

const COOLDOWN_SECONDS = 60;

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'link_expired' ? 'Reset link expired or invalid' : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetTrigger, setCaptchaResetTrigger] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cooldownSeconds > 0 || isLoading) return;

    setMessage(null);
    setFieldError(null);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFieldError('Enter the email address linked to your account.');
      document.getElementById('forgot-password-email')?.focus();
      return;
    }

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError('Complete the security check before requesting a reset link.');
      return;
    }

    setIsLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/auth/update-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
        ...(captchaToken ? { captchaToken } : {}),
      });

      if (resetError) {
        console.error('Password reset email error:', resetError);
        const status = (resetError as { status?: number }).status;
        if (
          status === 429 ||
          /rate limit|too many/i.test(resetError.message || '')
        ) {
          setError('Too many requests, please try again later.');
          setCooldownSeconds(COOLDOWN_SECONDS);
        } else {
          setError('Could not send the reset email right now. Please try again in a few minutes.');
        }
        return;
      }

      setMessage('If an account exists for this email, a reset link has been sent.');
      setCooldownSeconds(COOLDOWN_SECONDS);
    } catch (err) {
      console.error('Password reset unexpected error:', err);
      setError('Could not send the reset email right now. Please try again in a few minutes.');
    } finally {
      setIsLoading(false);
      setCaptchaToken(null);
      setCaptchaResetTrigger((n) => n + 1);
    }
  }

  return (
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
          <KeyRound className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-950">
          Reset password
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
          Enter the email linked to your account. For username sign-in, use your account email address.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800" role="status">
          {message}
        </p>
      )}

      <Input
        id="forgot-password-email"
        label="Account email"
        type="email"
        placeholder="you@college.edu"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          if (fieldError) setFieldError(null);
        }}
        error={fieldError || undefined}
        autoComplete="email"
        required
        disabled={isLoading}
      />

      <TurnstileWidget
        onVerify={(token) => setCaptchaToken(token)}
        onExpire={() => setCaptchaToken(null)}
        resetTrigger={captchaResetTrigger}
      />

      <Button
        type="submit"
        className="w-full"
        isLoading={isLoading}
        disabled={isLoading || cooldownSeconds > 0}
      >
        {cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : 'Send reset link'}
      </Button>

      <div className="pt-1 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to sign in</span>
        </Link>
      </div>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <Suspense fallback={<div className="h-96 w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8" />}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
