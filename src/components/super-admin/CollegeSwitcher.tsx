'use client';

import React from 'react';
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
    <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50/60 p-2 text-xs">
      <span className="font-semibold text-purple-900 shrink-0">
        Super-Admin Tenant Switcher:
      </span>
      <select
        value={selectedCollegeId || ''}
        onChange={(e) => onSelectCollege(e.target.value)}
        className="rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {colleges.map((col) => (
          <option key={col.id} value={col.id}>
            {col.name} ({col.slug})
          </option>
        ))}
      </select>
    </div>
  );
};
