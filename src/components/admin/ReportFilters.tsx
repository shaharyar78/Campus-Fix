'use client';

import React from 'react';
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
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
      {/* Search Input */}
      <div className="relative min-w-48 sm:w-64">
        <input
          type="text"
          placeholder="Filter by title, ID, room..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 pl-9 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <svg
          className="w-4 h-4 text-slate-400 absolute left-2.5 top-2 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Status filter */}
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as ReportStatus | 'all')}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Statuses</option>
        {REPORT_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {/* Category filter */}
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value as ReportCategory | 'all')}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Categories</option>
        {REPORT_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      {/* Building filter */}
      <select
        value={buildingId}
        onChange={(e) => onBuildingChange(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Buildings</option>
        {buildings.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} {b.code ? `(${b.code})` : ''}
          </option>
        ))}
      </select>

      {/* Reset button */}
      {isFiltered && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition px-2 py-1"
        >
          Clear Filters &times;
        </button>
      )}
    </div>
  );
};
