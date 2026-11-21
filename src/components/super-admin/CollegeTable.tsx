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
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5" aria-label="Loading colleges">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-12" />)}</div>
    );
  }

  if (colleges.length === 0) {
    return (
      <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 bg-white p-8">
        <h4 className="text-base font-semibold text-slate-900">No colleges registered</h4>
        <p className="text-xs text-slate-500 mt-1">Onboard your first university tenant using the form.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-3.5">
                University / College
              </th>
              <th scope="col" className="px-5 py-3.5">
                Slug / Tenant Key
              </th>
              <th scope="col" className="px-5 py-3.5">
                Allowed Domain
              </th>
              <th scope="col" className="px-5 py-3.5">
                Campus Location
              </th>
              <th scope="col" className="px-5 py-3.5">
                Onboarded Date
              </th>
              <th scope="col" className="px-5 py-3.5">
                Status
              </th>
              <th scope="col" className="px-5 py-3.5 text-right">
                Tenant Control
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {colleges.map((college) => {
              const isSelected = college.id === selectedCollegeId;
              return (
                <tr key={college.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <span>{college.name}</span>
                      {isSelected && (
                        <span className="rounded bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 font-bold">
                          Active Scope
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-blue-700">
                    {college.slug}
                  </td>
                  <td className="px-5 py-4 text-xs font-medium text-slate-700">
                    {college.email_domain ? college.email_domain.split(',').map((domain) => `@${domain.trim().replace(/^@/, '')}`).join(', ') : 'Any (Open)'}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {college.address || 'Standard Campus'}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(college.created_at)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <Badge variant={college.is_active ? 'success' : 'default'} size="sm">
                      {college.is_active ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap text-xs">
                    {onSelectCollege && (
                      <button
                        type="button"
                        onClick={() => onSelectCollege(college.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-slate-100 text-slate-500 cursor-default'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {isSelected ? 'Current Scope' : 'Switch Scope'}
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
