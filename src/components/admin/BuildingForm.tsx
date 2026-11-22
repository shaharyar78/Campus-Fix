'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validateBuildingInput } from '@/lib/validators';

interface BuildingFormProps {
  onSubmit: (data: {
    name: string;
    code?: string;
    floor_count: number;
  }) => Promise<{ error?: string | null } | undefined>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialValue?: { name: string; code?: string | null; floor_count?: number };
  submitLabel?: string;
}

export const BuildingForm: React.FC<BuildingFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  initialValue,
  submitLabel = 'Save Building',
}) => {
  const [formData, setFormData] = useState({
    name: initialValue?.name || '',
    code: initialValue?.code || '',
    floor_count: initialValue?.floor_count ?? 5,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const validation = validateBuildingInput(formData);
    const nextErrors = { ...validation.errors };
    if (
      !Number.isInteger(formData.floor_count) ||
      formData.floor_count < 0 ||
      formData.floor_count > 25
    ) {
      nextErrors.floor_count = 'Floor count must be a whole number between 0 and 25.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const res = await onSubmit(formData);
    if (res?.error) {
      setGeneralError(res.error);
    } else if (!initialValue) {
      setFormData({ name: '', code: '', floor_count: 5 });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {generalError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700" role="alert">
          {generalError}
        </div>
      )}

      <Input
        label="Building Name"
        placeholder="e.g. Science & Technology Block C"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        required
      />

      <Input
        label="Building Short Code"
        placeholder="e.g. STB-C"
        value={formData.code}
        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
        error={errors.code}
        helperText="Used on tickets and room identifiers."
      />

      <Input
        label="Total Floors"
        type="number"
        min={0}
        max={25}
        value={formData.floor_count}
        onChange={(e) =>
          setFormData({
            ...formData,
            floor_count: Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber,
          })
        }
        error={errors.floor_count}
        required
        disabled={isLoading}
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
