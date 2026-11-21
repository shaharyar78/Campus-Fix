'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter the email address linked to your account.');
      return;
    }

    setIsLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/auth/update-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo },
      );
      if (resetError) {
        setError(
          resetError.message.toLowerCase().includes('rate limit')
            ? 'Email limit reached. Wait before retrying or ask the project owner to configure SMTP.'
            : resetError.message,
        );
        return;
      }

      setMessage('If this email belongs to an account, a password reset link has been sent.');
    } catch {
      setError('Could not reach the password reset service. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-12">
      <form onSubmit={handleSubmit} noValidate className="w-full space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter the email linked to your account. For username sign-in, use the account email address here.
          </p>
        </div>
        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
        {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</p>}
        <Input
          label="Account email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          disabled={isLoading}
        />
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Send reset link
        </Button>
        <p className="text-center text-sm text-slate-600">
          <Link href="/login" className="font-semibold text-blue-700 hover:underline">Back to login</Link>
        </p>
      </form>
    </main>
  );
}
