'use client';

import React from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { REPORT_CATEGORIES, REPORT_STATUSES } from '@/lib/constants';
import { Building, ReportCategory, ReportStatus } from '@/types';

interface ReportFiltersProps {
  status: ReportStatus | 'all';
  category: ReportCategory | 'all';
  buildingId: string | 'all';
  search: string;
  buildings: Building[];
  onStatusChange: (status: ReportStatus | 'all') => void;
  onCategoryChange: (category: ReportCategory | 'all') => void;
  onBuildingChange: (buildingId: string | 'all') => void;
  onSearchChange: (search: string) => void;
  onReset: () => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  status,
  category,
  buildingId,
  search,
  buildings,
  onStatusChange,
  onCategoryChange,
  onBuildingChange,
  onSearchChange,
  onReset,
}) => {
  const isFiltered = status !== 'all' || category !== 'all' || buildingId !== 'all' || search !== '';

  return (
    <div className="flex flex-1 flex-col flex-wrap items-stretch gap-2.5 sm:flex-row sm:items-center">
      <div className="relative min-w-0 w-full sm:w-64">
        <label htmlFor="admin-report-search" className="sr-only">
          Search reports
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
        <input
          id="admin-report-search"
          type="text"
          placeholder="Filter by title, ID, room..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
        />
      </div>

      <div className="relative">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as ReportStatus | 'all')}
          aria-label="Filter by status"
          className="h-9 w-full appearance-none rounded-lg border border-neutral-200 bg-white pl-3 pr-8 text-xs text-neutral-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 sm:w-auto"
        >
          <option value="all">All Statuses</option>
          {REPORT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
      </div>

      <div className="relative">
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as ReportCategory | 'all')}
          aria-label="Filter by category"
          className="h-9 w-full appearance-none rounded-lg border border-neutral-200 bg-white pl-3 pr-8 text-xs text-neutral-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 sm:w-auto"
        >
          <option value="all">All Categories</option>
          {REPORT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
      </div>

      <div className="relative">
        <select
          value={buildingId}
          onChange={(e) => onBuildingChange(e.target.value)}
          aria-label="Filter by building"
          className="h-9 w-full appearance-none rounded-lg border border-neutral-200 bg-white pl-3 pr-8 text-xs text-neutral-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 sm:w-auto"
        >
          <option value="all">All Buildings</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.code ? `(${b.code})` : ''}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
      </div>

      {isFiltered && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-800"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Clear</span>
        </button>
      )}
    </div>
  );
};
