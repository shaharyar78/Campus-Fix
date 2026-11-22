'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { College } from '@/types';

interface CollegeSelectProps {
  colleges: College[];
  value: string;
  onChange: (collegeId: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export const CollegeSelect: React.FC<CollegeSelectProps> = ({
  colleges,
  value,
  onChange,
  error,
  disabled = false,
  required = true,
}) => {
  return (
    <div className="space-y-1.5">
      <label htmlFor="college-select" className="block text-sm font-medium text-neutral-700">
        College / Campus
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>

      <div className="relative">
        <select
          id="college-select"
          aria-label="Select College"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className="w-full appearance-none rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-neutral-900 transition-colors hover:border-neutral-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 disabled:bg-neutral-50 disabled:text-neutral-400"
        >
          <option value="" disabled>
            Select a college
          </option>
          {colleges.map((college) => (
            <option key={college.id} value={college.id}>
              {college.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
      </div>

      {error && (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-neutral-500">
        Issues and buildings are scoped to your selected campus.
      </p>
    </div>
  );
};
