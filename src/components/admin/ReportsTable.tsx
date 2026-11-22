'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronUp, FileText } from 'lucide-react';
import { Report, ReportStatus } from '@/types';
import { StatusDropdown } from './StatusDropdown';
import { getCategoryConfig, formatRelativeTime } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

interface ReportsTableProps {
  reports: Report[];
  isLoading?: boolean;
  onStatusChange: (reportId: string, status: ReportStatus, note?: string) => Promise<unknown>;
  onStatusError?: (message: string) => void;
}

export const ReportsTable: React.FC<ReportsTableProps> = ({
  reports,
  isLoading = false,
  onStatusChange,
  onStatusError,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5" aria-label="Loading reports">
        <Skeleton className="h-7 w-48" />
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="grid grid-cols-4 gap-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-400">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <h4 className="font-display text-base font-semibold text-neutral-950">
          No reports matched your filters
        </h4>
        <p className="mt-1 text-xs text-neutral-500">
          Try resetting the status, category, or building filters above.
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
                Tracking ID
              </th>
              <th scope="col" className="px-4 py-3">
                Issue / Category
              </th>
              <th scope="col" className="px-4 py-3">
                Location
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                Upvotes
              </th>
              <th scope="col" className="px-4 py-3">
                Situation
              </th>
              <th scope="col" className="px-4 py-3">
                Reported
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {reports.map((report) => {
              const categoryConfig = getCategoryConfig(report.category);
              const situationTone =
                report.situation === 'critical'
                  ? 'text-rose-600'
                  : report.situation === 'high'
                    ? 'text-orange-600'
                    : report.situation === 'medium'
                      ? 'text-amber-600'
                      : 'text-neutral-500';

              return (
                <tr key={report.id} className="transition-colors hover:bg-neutral-50/70">
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-medium text-neutral-800">
                    {report.tracking_id}
                  </td>

                  <td className="max-w-xs px-4 py-3.5">
                    <Link
                      href={`/admin/reports/${report.id}`}
                      className="line-clamp-1 font-medium text-neutral-950 transition-colors hover:text-blue-600"
                    >
                      {report.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-500">
                      <span>{categoryConfig.label}</span>
                      {report.submitter && (
                        <>
                          <span aria-hidden="true" className="text-neutral-300">·</span>
                          <span className="truncate">{report.submitter.full_name || 'Student'}</span>
                        </>
                      )}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-neutral-700">
                    <div className="font-medium text-neutral-900">
                      {report.building?.name || report.building_label || 'Campus Building'}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {report.floor ? `${report.floor}` : ''}
                      {report.section ? ` · Sec ${report.section}` : ''}
                      {report.room ? ` · ${report.room}` : ''}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-xs font-medium tabular-nums ${
                        report.upvote_count > 10 ? 'text-blue-600' : 'text-neutral-700'
                      }`}
                    >
                      <ChevronUp className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                      {report.upvote_count}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className={`text-xs font-medium capitalize ${situationTone}`}>
                      {report.situation || 'normal'}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-neutral-500">
                    {formatRelativeTime(report.created_at)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3.5">
                    <StatusDropdown
                      currentStatus={report.status}
                      onError={onStatusError}
                      onStatusChange={async (newStatus, note) => {
                        await onStatusChange(report.id, newStatus, note);
                      }}
                    />
                  </td>

                  <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs">
                    <Link
                      href={`/admin/reports/${report.id}`}
                      className="inline-flex items-center gap-1 font-medium text-neutral-700 transition-colors hover:text-blue-600"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
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
