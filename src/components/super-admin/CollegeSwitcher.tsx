'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { College } from '@/types';

interface CollegeSwitcherProps {
  colleges: College[];
  selectedCollegeId: string | null;
  onSelectCollege: (collegeId: string) => void;
}

export const CollegeSwitcher: React.FC<CollegeSwitcherProps> = ({
  colleges,
  selectedCollegeId,
  onSelectCollege,
}) => {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs">
      <span className="shrink-0 font-medium text-neutral-500">Tenant scope</span>
      <div className="relative">
        <select
          value={selectedCollegeId || ''}
          onChange={(e) => onSelectCollege(e.target.value)}
          aria-label="Select tenant scope"
          className="h-7 appearance-none rounded-md border border-neutral-200 bg-neutral-50 pl-2.5 pr-7 text-xs font-medium text-neutral-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
        >
          {colleges.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name} ({col.slug})
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
