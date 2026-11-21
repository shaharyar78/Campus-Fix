'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CollegeSelect } from './CollegeSelect';
import { validateRegisterInput } from '@/lib/validators';
import { useCollege } from '@/hooks/useCollege';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types';

export const RegisterForm: React.FC = () => {
  const router = useRouter();
  const { colleges } = useCollege();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    college_id: '',
    role: 'student' as Extract<UserRole, 'student' | 'admin'>,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const collegeId = colleges.some((college) => college.id === formData.college_id)
    ? formData.college_id
    : colleges[0]?.id || '';
  const selectedCollege = colleges.find((college) => college.id === collegeId);
  const emailDomains = selectedCollege?.email_domain?.split(',').map((domain) => domain.trim().replace(/^@/, '').toLowerCase()).filter(Boolean) || [];
  const emailDomainError = formData.email.includes('@') && emailDomains.length > 0 && !emailDomains.includes(formData.email.split('@').pop()?.toLowerCase() || '')
    ? `Use your ${selectedCollege?.name || 'college'} email address ending in ${emailDomains.map((domain) => `@${domain}`).join(' or ')}.`
    : '';

  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder.supabase.co')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setStatusMessage(null);

    const validation = validateRegisterInput({ ...formData, college_id: collegeId });
    if (emailDomainError) validation.errors.email = emailDomainError;
    validation.isValid = Object.keys(validation.errors).length === 0;
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setIsLoading(true);

    if (!isSupabaseConfigured) { setGeneralError('Registration is unavailable until the Supabase project is configured.'); setIsLoading(false); return; }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: formData.full_name.trim(),
            role: formData.role,
            college_id: collegeId,
          },
        },
      });

      if (error) {
        setGeneralError(error.message);
        return;
      }

      if (data?.session) {
        router.push('/account/pending');
      } else if (data?.user) {
        setStatusMessage(
          `Your ${formData.role === 'admin' ? 'administrator' : 'student'} account request was submitted. Check your email to verify the account; approval is required before using CampusFix.`
        );
      }
    } catch {
      setGeneralError('Could not connect to the registration service. Check your connection and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>

      {generalError && (
        <div
          className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 flex items-center gap-2"
          role="alert"
        >
          <svg className="w-5 h-5 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{generalError}</span>
        </div>
      )}

      {statusMessage && (
        <p className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-3 text-sm text-emerald-800" role="status">
          {statusMessage}
        </p>
      )}

      <CollegeSelect
        colleges={colleges}
        value={collegeId}
        onChange={(collegeId) => setFormData({ ...formData, college_id: collegeId })}
        error={errors.college_id}
        disabled={isLoading || colleges.length === 0}
      />

      <Input
        label="Full Name"
        type="text"
        placeholder="e.g. Rahul Sharma"
        value={formData.full_name}
        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
        error={errors.full_name}
        required
        disabled={isLoading}
      />

      <Input
        label="College Email Address"
        type="email"
        placeholder="rahul@campus.edu"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email}
        helperText={emailDomains.length ? `Use your college email ending in ${emailDomains.map((domain) => `@${domain}`).join(' or ')}.` : 'Use the email address your campus administrator can verify.'}
        required
        disabled={isLoading}
      />
      {emailDomainError && <p className="-mt-3 text-xs text-rose-600" role="alert">{emailDomainError}</p>}

      <Input
        label="Password (min 6 characters)"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        error={errors.password}
        required
        disabled={isLoading}
        rightIcon={(
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}
      />

      <div className="space-y-1.5">
        <label htmlFor="requested-role" className="block text-sm font-medium text-slate-700">
          Account type
        </label>
        <select
          id="requested-role"
          value={formData.role}
          onChange={(event) =>
            setFormData({
              ...formData,
              role: event.target.value as Extract<UserRole, 'student' | 'admin'>,
            })
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          <option value="student">Student</option>
          <option value="admin">Campus administrator (approval required)</option>
        </select>
        <p className="text-xs text-slate-500">
          Students need campus admin approval. Administrator requests need super-admin approval.
        </p>
      </div>

      <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading} disabled={colleges.length === 0}>
        Create Campus Account
      </Button>

      <div className="text-center text-xs text-slate-600 mt-4">
        Already registered?{' '}
        <Link href="/login" className="font-semibold text-blue-600 hover:underline">
          Sign in here
        </Link>
      </div>
    </form>
  );
};
