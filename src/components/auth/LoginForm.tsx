'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validateLoginInput } from '@/lib/validators';
import { createClient } from '@/lib/supabase/client';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const supabase = createClient();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setGeneralError(null);
    const validation = validateLoginInput(formData);
    if (!validation.isValid) { setErrors(validation.errors); return; }
    setErrors({});
    setIsLoading(true);
    try {
      let email = formData.email.trim();
      if (!email.includes('@')) {
        const response = await fetch('/api/auth/resolve-username', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: email }) });
        const resolved = await response.json();
        if (!response.ok || typeof resolved.email !== 'string') { setGeneralError(resolved.error || 'Username or password is incorrect.'); return; }
        email = resolved.email;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: formData.password });
      if (error) { setGeneralError(error.message); return; }
      if (!data.user) { setGeneralError('Sign-in did not return an account. Please retry.'); return; }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, approval_status')
        .eq('id', data.user.id)
        .single();
      if (profileError) { setGeneralError('Your account profile could not be loaded. Contact your campus administrator.'); return; }
      if (profile.approval_status === 'pending') {
        router.push('/account/pending');
      } else if (profile.approval_status === 'rejected') {
        router.push('/account/rejected');
      } else {
        router.push(profile.role === 'super_admin' ? '/super-admin' : profile.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch {
      setGeneralError('Could not connect to the sign-in service. Check your connection and retry.');
    } finally { setIsLoading(false); }
  };

  return <form onSubmit={handleSubmit} className="space-y-4" noValidate>
    {generalError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{generalError}</p>}
    <Input label="Username or college email" type="text" placeholder="username or you@college.edu" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} error={errors.email} required disabled={isLoading} autoComplete="username" />
    <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} error={errors.password} required disabled={isLoading} autoComplete="current-password" rightIcon={<button type="button" disabled={isLoading} onClick={() => setShowPassword((visible) => !visible)} className="text-xs font-semibold text-orange-700">{showPassword ? 'Hide' : 'Show'}</button>} />
    <div className="-mt-2 text-right">
      <Link href="/forgot-password" className="text-sm font-semibold text-orange-700 hover:underline">
        Forgot password?
      </Link>
    </div>
    <Button type="submit" variant="primary" className="w-full bg-orange-600 hover:bg-orange-700" isLoading={isLoading}>Login</Button>
    <p className="text-center text-sm text-slate-600">Don&apos;t have an account? <Link href="/register" className="font-semibold text-orange-700 hover:underline">Register</Link></p>
  </form>;
};
