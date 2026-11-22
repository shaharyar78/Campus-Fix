'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ReportStatus } from '@/types';
import { REPORT_STATUSES } from '@/lib/constants';
import { getStatusConfig } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

interface StatusDropdownProps {
  currentStatus: ReportStatus;
  onStatusChange: (newStatus: ReportStatus, note?: string) => Promise<void>;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export const StatusDropdown: React.FC<StatusDropdownProps> = ({
  currentStatus,
  onStatusChange,
  onError,
  disabled = false,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showResolution, setShowResolution] = useState(false);
  const [note, setNote] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ReportStatus | null>(null);
  const currentConfig = getStatusConfig(currentStatus);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as ReportStatus;
    if (nextStatus === currentStatus) return;
    if (nextStatus === 'resolved') {
      setModalError(null);
      setPendingStatus(nextStatus);
      setShowResolution(true);
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusChange(nextStatus);
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err.message : 'Failed to update ticket status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmResolution = async () => {
    if (!pendingStatus) return;
    setIsUpdating(true);
    setModalError(null);
    try {
      await onStatusChange(pendingStatus, note.trim() || undefined);
      setShowResolution(false);
      setNote('');
      setPendingStatus(null);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to resolve ticket.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative inline-block">
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={disabled || isUpdating}
        aria-label="Update report status"
        className={`h-8 cursor-pointer appearance-none rounded-md border pl-2.5 pr-7 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60 ${currentConfig.badgeClass}`}
      >
        {REPORT_STATUSES.map((s) => (
          <option key={s.value} value={s.value} className="bg-white text-neutral-900">
            {s.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-current opacity-70"
        aria-hidden="true"
      />

      <Modal
        isOpen={showResolution}
        onClose={() => {
          if (!isUpdating) {
            setShowResolution(false);
            setPendingStatus(null);
            setModalError(null);
          }
        }}
        title="Add resolution note"
        description="Tell the reporter what was fixed. This note is optional."
      >
        <div className="space-y-4">
          {modalError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
              {modalError}
            </p>
          )}
          <Textarea
            label="Resolution note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="Describe the completed repair..."
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={isUpdating}
              onClick={() => {
                setShowResolution(false);
                setPendingStatus(null);
                setModalError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" isLoading={isUpdating} onClick={() => void confirmResolution()}>
              Confirm resolution
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
