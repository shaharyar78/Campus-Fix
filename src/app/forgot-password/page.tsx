'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid college email address linked to your account.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: newPassword }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Could not reset password.');
        return;
      }

      setMessage('Password updated successfully! You can now sign in with your new password.');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('Could not reach the password reset service. Please try again later.');
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
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-950">
            Reset password
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
            Enter your account email and choose a new password.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}
        {message && (
          <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800" role="status">
            <p className="font-medium">{message}</p>
            <Link href="/login" className="inline-block text-xs font-semibold text-emerald-950 underline">
              Go to sign in &rarr;
            </Link>
          </div>
        )}

        <Input
          label="Account email"
          type="email"
          placeholder="you@college.edu"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          disabled={isLoading}
        />

        <Input
          label="New password"
          type="password"
          placeholder="••••••••"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          helperText="Minimum 6 characters."
          required
          disabled={isLoading}
        />

        <Input
          label="Confirm new password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
          disabled={isLoading}
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Update password
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
    </div>
  );
}
