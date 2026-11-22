'use client';

import React from 'react';
import { College } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

interface CollegeTableProps {
  colleges: College[];
  isLoading?: boolean;
  selectedCollegeId?: string | null;
  onSelectCollege?: (collegeId: string) => void;
}

export const CollegeTable: React.FC<CollegeTableProps> = ({
  colleges,
  isLoading = false,
  selectedCollegeId,
  onSelectCollege,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5" aria-label="Loading colleges">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-11" />
        ))}
      </div>
    );
  }

  if (colleges.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
        <h4 className="font-display text-base font-semibold text-neutral-950">
          No colleges registered
        </h4>
        <p className="mt-1 text-xs text-neutral-500">
          Onboard your first university tenant using the form above.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-600">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            <tr>
              <th scope="col" className="px-4 py-3">
                University / College
              </th>
              <th scope="col" className="px-4 py-3">
                Slug
              </th>
              <th scope="col" className="px-4 py-3">
                Allowed Domain
              </th>
              <th scope="col" className="px-4 py-3">
                Location
              </th>
              <th scope="col" className="px-4 py-3">
                Onboarded
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Scope
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {colleges.map((college) => {
              const isSelected = college.id === selectedCollegeId;
              return (
                <tr key={college.id} className="transition-colors hover:bg-neutral-50/70">
                  <td className="px-4 py-3.5 font-medium text-neutral-950">
                    <div className="flex items-center gap-2">
                      <span>{college.name}</span>
                      {isSelected && (
                        <span className="font-mono text-[11px] font-medium text-blue-600">
                          · Active scope
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-neutral-700">
                    {college.slug}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-neutral-700">
                    {college.email_domain
                      ? college.email_domain
                          .split(',')
                          .map((domain) => `@${domain.trim().replace(/^@/, '')}`)
                          .join(', ')
                      : 'Open'}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-neutral-500">
                    {college.address || 'Standard Campus'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-neutral-500 tabular-nums">
                    {formatDate(college.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <Badge variant={college.is_active ? 'success' : 'default'} size="sm">
                      {college.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs">
                    {onSelectCollege && (
                      <button
                        type="button"
                        onClick={() => onSelectCollege(college.id)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          isSelected
                            ? 'cursor-default bg-neutral-100 text-neutral-500'
                            : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Switch scope'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
