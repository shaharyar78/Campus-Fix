'use client';

import React from 'react';
import Link from 'next/link';
import { Report, ReportStatus } from '@/types';
import { StatusDropdown } from './StatusDropdown';
import { getCategoryConfig, formatRelativeTime } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

interface ReportsTableProps {
  reports: Report[];
  isLoading?: boolean;
  onStatusChange: (reportId: string, status: ReportStatus, note?: string) => Promise<unknown>;
}

export const ReportsTable: React.FC<ReportsTableProps> = ({
  reports,
  isLoading = false,
  onStatusChange,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5" aria-label="Loading reports"><Skeleton className="h-8 w-48"/>{Array.from({ length: 5 }, (_, index) => <div key={index} className="grid grid-cols-4 gap-4"><Skeleton className="h-12"/><Skeleton className="h-12"/><Skeleton className="h-12"/><Skeleton className="h-12"/></div>)}</div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 bg-white p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h4 className="text-base font-semibold text-slate-900">No reports matched your filters</h4>
        <p className="text-xs text-slate-500 mt-1">
          Try resetting the status, category, or building filters above.
        </p>
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
                Tracking ID
              </th>
              <th scope="col" className="px-5 py-3.5">
                Issue / Category
              </th>
              <th scope="col" className="px-5 py-3.5">
                Location
              </th>
              <th scope="col" className="px-5 py-3.5 text-center">
                Upvotes
              </th>
              <th scope="col" className="px-5 py-3.5">Situation</th>
              <th scope="col" className="px-5 py-3.5">
                Reported
              </th>
              <th scope="col" className="px-5 py-3.5">
                Status Triage
              </th>
              <th scope="col" className="px-5 py-3.5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.map((report) => {
              const categoryConfig = getCategoryConfig(report.category);
              return (
                <tr key={report.id} className="hover:bg-slate-50/70 transition">
                  {/* Tracking ID */}
                  <td className="px-5 py-4 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                    {report.tracking_id}
                  </td>

                  {/* Title & Category */}
                  <td className="px-5 py-4 max-w-xs">
                    <Link
                      href={`/admin/reports/${report.id}`}
                      className="font-semibold text-slate-900 hover:text-blue-600 line-clamp-1 transition"
                    >
                      {report.title}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-medium text-slate-500">
                        {categoryConfig.label}
                      </span>
                      {report.submitter && (
                        <span className="text-[11px] text-slate-400">
                          &bull; by {report.submitter.full_name || 'Student'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-700">
                    <div className="font-medium text-slate-800">
                      {report.building?.name || report.building_label || 'Campus Building'}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {report.floor ? `${report.floor}` : ''}
                      {report.section ? ` &bull; Section ${report.section}` : ''}
                      {report.room ? ` &bull; ${report.room}` : ''}
                    </div>
                  </td>

                  {/* Upvotes */}
                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        report.upvote_count > 10
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      🔥 {report.upvote_count}
                    </span>
                  </td>

                  <td className="px-5 py-4 whitespace-nowrap"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${report.situation === 'critical' ? 'bg-rose-100 text-rose-800' : report.situation === 'high' ? 'bg-orange-100 text-orange-800' : report.situation === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{report.situation || 'normal'}</span></td>

                  {/* Reported date */}
                  <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                    {formatRelativeTime(report.created_at)}
                  </td>

                  {/* Status Dropdown */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <StatusDropdown
                      currentStatus={report.status}
                      onStatusChange={async (newStatus, note) => {
                        await onStatusChange(report.id, newStatus, note);
                      }}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right whitespace-nowrap text-xs">
                    <Link
                      href={`/admin/reports/${report.id}`}
                      className="inline-flex items-center font-medium text-blue-600 hover:text-blue-800 px-2 py-1"
                    >
                      Inspect &rarr;
                    </Link>
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
