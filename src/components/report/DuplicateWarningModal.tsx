'use client';

import React from 'react';
import { AlertTriangle, ChevronUp } from 'lucide-react';
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
      description="A similar maintenance issue was already reported in this area. Upvoting an existing report prioritizes repair without creating a duplicate."
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <span className="font-semibold">Preventing Duplicate Tickets</span>
            <p className="mt-0.5 text-amber-800">
              Upvoting existing tickets brings them to the top of the maintenance queue faster than opening separate tickets.
            </p>
          </div>
        </div>

        <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {matches.map((report) => {
            const statusConfig = getStatusConfig(report.status);
            return (
              <div
                key={report.id}
                className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] font-medium text-neutral-400">
                      {report.tracking_id}
                    </span>
                    <h4 className="mt-0.5 font-display text-sm font-semibold text-neutral-950">
                      {report.title}
                    </h4>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusConfig.badgeClass}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{report.description}</p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-2.5 text-xs text-neutral-500">
                  <div className="flex items-center gap-2">
                    <span>
                      {report.building?.name || report.building_label || 'Campus Building'}
                      {report.floor ? ` · ${report.floor}` : ''}
                      {report.section ? ` · Sec ${report.section}` : ''}
                      {report.room ? ` · ${report.room}` : ''}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeTime(report.created_at)}</span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => onUpvoteExisting(report.id)}
                    leftIcon={<ChevronUp className="h-3.5 w-3.5" />}
                    className="tabular-nums"
                  >
                    Upvote ({report.upvote_count})
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
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
            Submit as Separate Issue
          </Button>
        </div>
      </div>
    </Modal>
  );
};
