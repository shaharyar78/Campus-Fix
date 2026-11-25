'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validateBuildingInput } from '@/lib/validators';

interface BuildingFormProps {
  onSubmit: (data: {
    name: string;
    code?: string;
    floor_count: number;
    sections: string[];
  }) => Promise<{ error?: string | null } | undefined>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialValue?: { name: string; code?: string | null; floor_count?: number; sections?: string[] | null };
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
    sections: initialValue?.sections || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newSection, setNewSection] = useState('');
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const suggestedSection = (() => {
    const lastSection = formData.sections.at(-1);
    const match = lastSection?.match(/^([a-z]+)(\d+)$/i);
    if (!match) return formData.sections.length === 0 ? 'A1' : '';
    return `${match[1]}${Number(match[2]) + 1}`.toUpperCase();
  })();

  const addSection = () => {
    const section = newSection.trim().toUpperCase();
    if (!section) {
      setSectionError('Enter a section name first.');
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(section)) {
      setSectionError('Use up to 40 letters, numbers, hyphens, or underscores.');
      return;
    }
    if (formData.sections.some((item) => item.toUpperCase() === section)) {
      setSectionError('This section is already on the list.');
      return;
    }
    setFormData((current) => ({ ...current, sections: [...current.sections, section] }));
    setNewSection('');
    setSectionError(null);
  };

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
    if (formData.sections.some((section) => !/^[A-Z0-9][A-Z0-9_-]{0,39}$/i.test(section.trim()))) {
      nextErrors.sections = 'Every section needs a valid name.';
    }
    if (new Set(formData.sections.map((section) => section.trim().toUpperCase())).size !== formData.sections.length) {
      nextErrors.sections = 'Section names must be unique.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const order: Array<[string, string]> = [
        ['name', 'building-form-name'],
        ['code', 'building-form-code'],
        ['floor_count', 'building-form-floors'],
        ['sections', 'building-form-section'],
      ];
      for (const [key, elementId] of order) {
        if (nextErrors[key]) {
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
      setFormData({ name: '', code: '', floor_count: 5, sections: [] });
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
        id="building-form-name"
        label="Building Name"
        placeholder="e.g. Science & Technology Block C"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        required
      />

      <Input
        id="building-form-code"
        label="Building Short Code"
        placeholder="e.g. STB-C"
        value={formData.code}
        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
        error={errors.code}
        helperText="Used on tickets and room identifiers."
      />

      <Input
        id="building-form-floors"
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

      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-medium text-neutral-800">Sections</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Add the section labels students can select when reporting an issue. These are saved with this building.
          </p>
        </div>
        {formData.sections.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Configured sections">
            {formData.sections.map((section) => (
              <li key={section} className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 pl-3 pr-1.5 py-1 text-xs font-medium text-neutral-700">
                <span>{section}</span>
                <button
                  type="button"
                  aria-label={`Remove section ${section}`}
                  disabled={isLoading}
                  onClick={() => {
                    setFormData((current) => ({
                      ...current,
                      sections: current.sections.filter((item) => item !== section),
                    }));
                    setErrors((current) => ({ ...current, sections: '' }));
                  }}
                  className="rounded-full p-1 text-neutral-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <Input
            id="building-form-section"
            label="Add a section"
            placeholder={suggestedSection || 'e.g. A1'}
            value={newSection}
            onChange={(event) => {
              setNewSection(event.target.value.toUpperCase());
              setSectionError(null);
            }}
            error={sectionError || errors.sections}
            disabled={isLoading}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addSection();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={isLoading} onClick={addSection} leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}>
            Add Section
          </Button>
        </div>
      </div>

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
