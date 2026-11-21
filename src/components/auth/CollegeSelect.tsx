'use client';

import React from 'react';
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
      <label htmlFor="college-select" className="block text-sm font-medium text-slate-700">
        Select College / Campus
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
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm font-medium text-slate-900 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
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
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {error && (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-500">
        Issues and buildings are scoped to your selected campus.
      </p>
    </div>
  );
};
