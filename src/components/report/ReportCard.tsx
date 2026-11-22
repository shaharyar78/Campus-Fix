'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronUp, MapPin } from 'lucide-react';
import { Report } from '@/types';
import { getStatusConfig, getCategoryConfig, formatRelativeTime } from '@/lib/utils';
import { useUpvote } from '@/hooks/useUpvote';

interface ReportCardProps {
  report: Report;
  currentUserId?: string;
  trackingLinkPrefix?: string;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  currentUserId,
  trackingLinkPrefix = '/track',
}) => {
  const statusConfig = getStatusConfig(report.status);
  const categoryConfig = getCategoryConfig(report.category);
  const { upvotes, hasUpvoted, isMutating, toggleUpvote } = useUpvote(
    report.id,
    report.upvote_count,
    report.has_upvoted,
    currentUserId
  );

  const situationTone =
    report.situation === 'critical'
      ? 'text-rose-600'
      : report.situation === 'high'
        ? 'text-orange-600'
        : report.situation === 'medium'
          ? 'text-amber-600'
          : 'text-neutral-500';

  return (
    <article className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 transition-colors duration-150 hover:border-neutral-300">
      <div>
        {/* Eyebrow Metadata */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-neutral-500">
            <span className="truncate font-medium text-neutral-700">{categoryConfig.label}</span>
            <span aria-hidden="true" className="text-neutral-300">·</span>
            <span className="truncate font-mono text-[11px] text-neutral-400">
              {report.tracking_id}
            </span>
          </div>

          <span
            className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusConfig.badgeClass}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Title */}
        <Link href={`${trackingLinkPrefix}/${report.tracking_id}`} className="group mt-3 block">
          <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-neutral-950 transition-colors group-hover:text-blue-600">
            {report.title}
          </h3>
        </Link>

        {/* Description */}
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-neutral-600">
          {report.description}
        </p>

        {/* Location */}
        <div className="mt-3.5 flex items-center gap-1.5 text-xs text-neutral-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
          <span className="truncate">
            {report.building?.name || report.building_label || 'Campus Facility'}
            {report.floor ? ` · ${report.floor}` : ''}
            {report.section ? ` · Sec ${report.section}` : ''}
            {report.room ? ` · ${report.room}` : ''}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3.5 text-xs">
        <div className="flex flex-col gap-0.5 text-neutral-400">
          <span>{formatRelativeTime(report.created_at)}</span>
          <span className={`font-medium capitalize ${situationTone}`}>
            {report.situation || 'normal'} priority
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleUpvote()}
            disabled={isMutating}
            className={`inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium tabular-nums transition-colors ${
              hasUpvoted
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
            title="Upvote this issue to prioritize repair"
          >
            <ChevronUp className={`h-3.5 w-3.5 ${hasUpvoted ? 'text-blue-600' : 'text-neutral-400'}`} aria-hidden="true" />
            <span>{upvotes}</span>
          </button>

          <Link
            href={`${trackingLinkPrefix}/${report.tracking_id}`}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
          >
            <span>Details</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
};
