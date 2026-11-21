import React from 'react';
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
    { status: 'submitted', label: '1. Submitted' },
    { status: 'under_review', label: '2. Under Review' },
    { status: 'assigned', label: '3. Assigned' },
    { status: 'in_progress', label: '4. In Progress' },
    { status: 'resolved', label: '5. Resolved' },
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
      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
        Lifecycle Progress
      </h4>

      {isRejected ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-semibold">Report Rejected</span>
            <p className="text-xs text-rose-700 mt-0.5">
              This report could not be processed or was rejected by campus administration.
            </p>
          </div>
        </div>
      ) : (
        /* Progress Stepper Bar */
        <div className="relative">
          <div className="overflow-hidden rounded-full bg-slate-200 h-2">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(10, ((currentLevel - 1) / (steps.length - 1)) * 100))}%`,
              }}
            />
          </div>

          <div className="mt-3 grid grid-cols-5 text-center text-xs">
            {steps.map((step, idx) => {
              const stepLevel = idx + 1;
              const isPastOrCurrent = currentLevel >= stepLevel;
              const isCurrent = currentLevel === stepLevel;

              return (
                <div key={step.status} className="flex flex-col items-center">
                  <span
                    className={`font-semibold ${
                      isCurrent
                        ? 'text-blue-600'
                        : isPastOrCurrent
                        ? 'text-slate-800'
                        : 'text-slate-400'
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
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Activity & Updates Log
        </h5>

        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {/* Submission Event */}
          <div className="relative">
            <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 ring-2 ring-blue-100" />
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">Issue Submitted</span>
                <span className="text-slate-500">{formatDate(createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Ticket created with tracking reference. Awaiting admin review.
              </p>
            </div>
          </div>

          {/* Additional updates */}
          {updates.map((update) => {
            const config = update.status ? getStatusConfig(update.status) : null;
            return (
              <div key={update.id} className="relative">
                <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-600 ring-2 ring-slate-100" />
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/60">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {update.author?.full_name || 'Admin Note'}
                      </span>
                      {config && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${config.badgeClass}`}>
                          {config.label}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500">{formatDate(update.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{update.message}</p>
                </div>
              </div>
            );
          })}

          {/* Resolved Event if marked resolved */}
          {resolvedAt && (
            <div className="relative">
              <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-600 ring-2 ring-emerald-100" />
              <div className="rounded-lg bg-emerald-50/60 p-3 border border-emerald-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-900">Issue Marked Resolved</span>
                  <span className="text-emerald-700">{formatDate(resolvedAt)}</span>
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
