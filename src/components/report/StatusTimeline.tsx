import React from 'react';
import { XCircle } from 'lucide-react';
import { ReportStatus, ReportUpdate } from '@/types';
import { getStatusConfig, formatDate } from '@/lib/utils';

interface StatusTimelineProps {
  currentStatus: ReportStatus;
  createdAt: string;
  resolvedAt?: string | null;
  updates?: ReportUpdate[];
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  currentStatus,
  createdAt,
  resolvedAt,
  updates = [],
}) => {
  const steps: { status: ReportStatus; label: string }[] = [
    { status: 'submitted', label: '01 Submitted' },
    { status: 'under_review', label: '02 Under Review' },
    { status: 'assigned', label: '03 Assigned' },
    { status: 'in_progress', label: '04 In Progress' },
    { status: 'resolved', label: '05 Resolved' },
  ];

  const statusHierarchy: Record<ReportStatus, number> = {
    submitted: 1,
    under_review: 2,
    assigned: 3,
    in_progress: 4,
    resolved: 5,
    rejected: 0,
    closed: 6,
  };

  const currentLevel = statusHierarchy[currentStatus] || 1;
  const isRejected = currentStatus === 'rejected';

  return (
    <div className="space-y-6">
      <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        Lifecycle Progress
      </h4>

      {isRejected ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
          <div>
            <span className="font-semibold">Report Rejected</span>
            <p className="mt-0.5 text-xs text-rose-700">
              This report could not be processed or was rejected by campus administration.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-1.5 rounded-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(10, ((currentLevel - 1) / (steps.length - 1)) * 100))}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
            {steps.map((step, idx) => {
              const stepLevel = idx + 1;
              const isPastOrCurrent = currentLevel >= stepLevel;
              const isCurrent = currentLevel === stepLevel;

              return (
                <div key={step.status} className="sm:text-center">
                  <span
                    className={`font-medium ${
                      isCurrent
                        ? 'text-blue-600'
                        : isPastOrCurrent
                          ? 'text-neutral-900'
                          : 'text-neutral-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline Event Log */}
      <div className="space-y-4 border-t border-neutral-200 pt-5">
        <h5 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Activity & Updates
        </h5>

        <div className="relative space-y-3 pl-5 before:absolute before:bottom-2 before:left-1.5 before:top-2 before:w-px before:bg-neutral-200">
          <div className="relative">
            <div className="absolute -left-5 top-3.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-600" />
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-neutral-900">Issue Submitted</span>
                <span className="text-neutral-500 tabular-nums">{formatDate(createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-neutral-600">
                Ticket created with tracking reference. Awaiting admin review.
              </p>
            </div>
          </div>

          {updates.map((update) => {
            const config = update.status ? getStatusConfig(update.status) : null;
            return (
              <div key={update.id} className="relative">
                <div className="absolute -left-5 top-3.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-neutral-500" />
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">
                        {update.author?.full_name || 'Admin Note'}
                      </span>
                      {config && (
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${config.badgeClass}`}
                        >
                          {config.label}
                        </span>
                      )}
                    </div>
                    <span className="text-neutral-500 tabular-nums">{formatDate(update.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-600">{update.message}</p>
                </div>
              </div>
            );
          })}

          {resolvedAt && (
            <div className="relative">
              <div className="absolute -left-5 top-3.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-600" />
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-emerald-900">Issue Marked Resolved</span>
                  <span className="text-emerald-700 tabular-nums">{formatDate(resolvedAt)}</span>
                </div>
                <p className="mt-1 text-xs text-emerald-800">
                  Repairs verified and completed. Ticket closed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
