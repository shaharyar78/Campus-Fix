'use client';

import React from 'react';
import Link from 'next/link';
import { Report } from '@/types';
import { getStatusConfig, getCategoryConfig, formatRelativeTime } from '@/lib/utils';
import { useUpvote } from '@/hooks/useUpvote';
import { useUser } from '@/hooks/useUser';

interface ReportCardProps {
  report: Report;
  trackingLinkPrefix?: string;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  trackingLinkPrefix = '/track',
}) => {
  const statusConfig = getStatusConfig(report.status);
  const categoryConfig = getCategoryConfig(report.category);
  const { profile } = useUser();
  const { upvotes, hasUpvoted, isMutating, toggleUpvote } = useUpvote(
    report.id,
    report.upvote_count,
    report.has_upvoted,
    profile?.id
  );

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition">
      <div>
        {/* Top Badges & Tracking ID */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {categoryConfig.label}
            </span>
            <span className="font-mono text-xs text-slate-400 font-medium">
              {report.tracking_id}
            </span>
          </div>

          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.badgeClass}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Title */}
        <Link
          href={`${trackingLinkPrefix}/${report.tracking_id}`}
          className="mt-3 block group"
        >
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition line-clamp-2">
            {report.title}
          </h3>
        </Link>

        {/* Description snippet */}
        <p className="mt-1 text-sm text-slate-600 line-clamp-2">
          {report.description}
        </p>

        {/* Location Info */}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">
            {report.building?.name || report.building_label || 'Campus Facility'}
            {report.floor ? ` &bull; ${report.floor}` : ''}
            {report.section ? ` &bull; Section ${report.section}` : ''}
            {report.room ? ` &bull; ${report.room}` : ''}
          </span>
        </div>
      </div>

      {/* Footer: Date & Upvote Button */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
        <div className="flex flex-col gap-1 text-slate-400">
          <span>Reported {formatRelativeTime(report.created_at)}</span>
          <span className={`font-semibold uppercase ${report.situation === 'critical' ? 'text-rose-600' : report.situation === 'high' ? 'text-orange-600' : report.situation === 'medium' ? 'text-amber-600' : 'text-slate-500'}`}>
            {report.situation || 'normal'} situation
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleUpvote()}
            disabled={isMutating}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold transition ${
              hasUpvoted
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Upvote this issue to notify maintenance faster"
          >
            <svg
              className={`w-3.5 h-3.5 ${hasUpvoted ? 'text-blue-600 fill-current' : 'text-slate-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 15l7-7 7 7"
              />
            </svg>
            <span>{upvotes}</span>
          </button>

          <Link
            href={`${trackingLinkPrefix}/${report.tracking_id}`}
            className="text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
          >
            Details &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
