'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validateCollegeInput } from '@/lib/validators';

interface CollegeFormProps {
  onSubmit: (data: {
    name: string;
    slug: string;
    email_domain?: string;
    address?: string;
  }) => Promise<{ error?: string | null; data?: unknown } | undefined>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialValue?: { name: string; slug: string; email_domain?: string | null; address?: string | null };
  submitLabel?: string;
}

export const CollegeForm: React.FC<CollegeFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialValue,
  submitLabel = 'Save College',
}) => {
  const [formData, setFormData] = useState({
    name: initialValue?.name || '',
    slug: initialValue?.slug || '',
    email_domain: initialValue?.email_domain || '',
    address: initialValue?.address || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const toSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

  const handleNameChange = (name: string) => {
    const autoSlug = toSlug(name);
    setFormData((prev) => ({
      ...prev,
      name,
      slug:
        !initialValue && (prev.slug === '' || prev.slug === toSlug(prev.name))
          ? autoSlug
          : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const validation = validateCollegeInput(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      const order: Array<[string, string]> = [
        ['name', 'college-form-name'],
        ['slug', 'college-form-slug'],
        ['email_domain', 'college-form-domains'],
      ];
      for (const [key, elementId] of order) {
        if (validation.errors[key]) {
          document.getElementById(elementId)?.focus();
          break;
        }
      }
      return;
    }

    setErrors({});
    const res = await onSubmit(formData);
    if (res?.error) {
      setGeneralError(res.error);
    } else if (!initialValue) {
      setFormData({ name: '', slug: '', email_domain: '', address: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {generalError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700" role="alert">
          {generalError}
        </div>
      )}

      <Input
        id="college-form-name"
        label="University / College Name"
        placeholder="e.g. Dr. A.P.J. Abdul Kalam Technical University"
        value={formData.name}
        onChange={(e) => handleNameChange(e.target.value)}
        error={errors.name}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="college-form-slug"
          label="College Code / Slug"
          placeholder="e.g. aktu"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
          error={errors.slug}
          helperText="Used for tracking IDs and tenant isolation (e.g. AKTU)."
          required
        />

        <Input
          id="college-form-domains"
          label="Email Domains (Restricted Access)"
          placeholder="e.g. aktu.ac.in"
          value={formData.email_domain}
          onChange={(e) =>
            setFormData({
              ...formData,
              email_domain: e.target.value.toLowerCase(),
            })
          }
          error={errors.email_domain}
          helperText="Required. Separate domains with commas; do not include spaces or @."
          required
        />
      </div>

      <Input
        id="college-form-address"
        label="Physical Campus Address (Optional)"
        placeholder="e.g. Sector 11, Jankipuram Vistar, Lucknow, UP"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        error={errors.address}
      />

      <div className="flex items-center justify-end gap-2.5 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
