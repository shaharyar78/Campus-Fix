'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Report } from '@/types';
import { getStatusConfig, formatRelativeTime } from '@/lib/utils';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Report[];
  onUpvoteExisting: (reportId: string) => void;
  onSubmitAnyway: () => void;
  isSubmitting?: boolean;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  isOpen,
  onClose,
  matches,
  onUpvoteExisting,
  onSubmitAnyway,
  isSubmitting = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Similar Reports Found"
      description="A similar maintenance problem was already reported in this building/area. You can upvote it to prioritize repairs instead of submitting a duplicate."
      size="lg"
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
          <svg className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <span className="font-semibold">Preventing Duplicate Tickets</span>
            <p className="mt-0.5">
              Upvoting existing tickets brings them to the top of the admin triage priority queue faster than opening separate tickets for the same item.
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {matches.map((report) => {
            const statusConfig = getStatusConfig(report.status);
            return (
              <div
                key={report.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">
                      {report.tracking_id}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 mt-0.5">
                      {report.title}
                    </h4>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig.badgeClass}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                  {report.description}
                </p>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>
                      {report.building?.name || report.building_label || 'Campus Building'}
                      {report.floor ? ` &bull; ${report.floor}` : ''}
                      {report.section ? ` &bull; Section ${report.section}` : ''}
                      {report.room ? ` &bull; ${report.room}` : ''}
                    </span>
                    <span>&bull;</span>
                    <span>{formatRelativeTime(report.created_at)}</span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => onUpvoteExisting(report.id)}
                    className="shrink-0"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    Upvote This (+{report.upvote_count})
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Review My Form
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSubmitAnyway}
            isLoading={isSubmitting}
          >
            It&apos;s a Different Issue &rarr; Submit Anyway
          </Button>
        </div>
      </div>
    </Modal>
  );
};
