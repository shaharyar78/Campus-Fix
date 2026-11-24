'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CollegeSelect } from './CollegeSelect';
import { TURNSTILE_SITE_KEY, TurnstileWidget } from './TurnstileWidget';
import { validatePassword, validateRegisterInput } from '@/lib/validators';
import { useCollege } from '@/hooks/useCollege';
import { UserRole } from '@/types';

export const RegisterForm: React.FC = () => {
  const { colleges, error: collegesError, refreshColleges } = useCollege();

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetTrigger, setCaptchaResetTrigger] = useState(0);

  const collegeId = colleges.some((college) => college.id === formData.college_id)
    ? formData.college_id
    : colleges[0]?.id || '';
  const selectedCollege = colleges.find((college) => college.id === collegeId);
  const emailDomains =
    selectedCollege?.email_domain
      ?.split(',')
      .map((domain) => domain.trim().replace(/^@/, '').toLowerCase())
      .filter(Boolean) || [];
  const emailDomainError =
    formData.email.includes('@') &&
    emailDomains.length > 0 &&
    !emailDomains.includes(formData.email.split('@').pop()?.toLowerCase() || '')
      ? `Use your ${selectedCollege?.name || 'college'} email ending in ${emailDomains.map((domain) => `@${domain}`).join(' or ')}.`
      : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setStatusMessage(null);

    const validation = validateRegisterInput({ ...formData, college_id: collegeId });
    const passwordError = validatePassword(formData.password);
    if (passwordError) validation.errors.password = passwordError;
    if (emailDomainError) validation.errors.email = emailDomainError;
    validation.isValid = Object.keys(validation.errors).length === 0;
    if (!validation.isValid) {
      setErrors(validation.errors);
      const order: Array<[string, string]> = [
        ['college_id', 'college-select'],
        ['full_name', 'register-full-name'],
        ['email', 'register-email'],
        ['password', 'register-password'],
      ];
      for (const [key, elementId] of order) {
        if (validation.errors[key]) {
          document.getElementById(elementId)?.focus();
          break;
        }
      }
      return;
    }

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setGeneralError('Complete the security check before creating your account.');
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
          full_name: formData.full_name.trim(),
          college_id: collegeId,
          role: formData.role,
          ...(captchaToken ? { captchaToken } : {}),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setGeneralError(result.error || 'Registration failed. Please check your details.');
        setCaptchaToken(null);
        setCaptchaResetTrigger((n) => n + 1);
        return;
      }

      setStatusMessage(result.message || 'Check your email to confirm your account.');
      setFormData((current) => ({ ...current, password: '' }));
      setCaptchaToken(null);
      setCaptchaResetTrigger((n) => n + 1);
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
          className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
          <span>{generalError}</span>
        </div>
      )}

      {collegesError && (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
          role="alert"
        >
          <span>{collegesError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refreshColleges()}>
            Retry
          </Button>
        </div>
      )}

      {statusMessage && (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
          role="status"
        >
          {statusMessage}
        </p>
      )}

      <CollegeSelect
        colleges={colleges}
        value={collegeId}
        onChange={(nextCollegeId) => setFormData({ ...formData, college_id: nextCollegeId })}
        error={errors.college_id}
        disabled={isLoading || colleges.length === 0}
      />

      <Input
        id="register-full-name"
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
        id="register-email"
        label="College Email Address"
        type="email"
        placeholder="rahul@campus.edu"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email || emailDomainError || undefined}
        helperText={
          emailDomains.length
            ? `Allowed domain: ${emailDomains.map((domain) => `@${domain}`).join(', ')}`
            : 'Use the email address your campus administrator can verify.'
        }
        required
        disabled={isLoading}
      />

      <Input
        id="register-password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        error={errors.password}
        helperText="Minimum 8 characters."
        required
        disabled={isLoading}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="text-neutral-500 transition-colors hover:text-neutral-900"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        }
      />

      <div className="space-y-1.5">
        <label htmlFor="requested-role" className="block text-sm font-medium text-neutral-700">
          Account type
        </label>
        <div className="relative">
          <select
            id="requested-role"
            value={formData.role}
            onChange={(event) =>
              setFormData({
                ...formData,
                role: event.target.value as Extract<UserRole, 'student' | 'admin'>,
              })
            }
            className="w-full appearance-none rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-neutral-900 transition-colors hover:border-neutral-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            disabled={isLoading}
          >
            <option value="student">Student</option>
            <option value="admin">Campus administrator (approval required)</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
        </div>
        <p className="text-xs text-neutral-500">
          Students confirm via email before signing in; campus administrators also require super-admin approval.
        </p>
      </div>

      <TurnstileWidget
        onVerify={(token) => setCaptchaToken(token)}
        onExpire={() => setCaptchaToken(null)}
        resetTrigger={captchaResetTrigger}
      />

      <Button type="submit" variant="primary" className="w-full" isLoading={isLoading} disabled={colleges.length === 0}>
        Create Campus Account
      </Button>

      <p className="pt-2 text-center text-xs text-neutral-500">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-neutral-950 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
};
