'use client';

import React, { useState } from 'react';
import { ReportStatus } from '@/types';
import { REPORT_STATUSES } from '@/lib/constants';
import { getStatusConfig } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

interface StatusDropdownProps {
  currentStatus: ReportStatus;
  onStatusChange: (newStatus: ReportStatus, note?: string) => Promise<void>;
  disabled?: boolean;
}

export const StatusDropdown: React.FC<StatusDropdownProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showResolution, setShowResolution] = useState(false);
  const [note, setNote] = useState('');
  const [pendingStatus, setPendingStatus] = useState<ReportStatus | null>(null);
  const currentConfig = getStatusConfig(currentStatus);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as ReportStatus;
    if (nextStatus === currentStatus) return;
    if (nextStatus === 'resolved') { setPendingStatus(nextStatus); setShowResolution(true); return; }

    setIsUpdating(true);
    try {
      await onStatusChange(nextStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmResolution = async () => {
    if (!pendingStatus) return;
    setIsUpdating(true);
    try { await onStatusChange(pendingStatus, note.trim()); setShowResolution(false); setNote(''); }
    finally { setIsUpdating(false); setPendingStatus(null); }
  };

  return (
    <div className="relative inline-block">
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={disabled || isUpdating}
        className={`appearance-none rounded-lg border px-3 py-1 pr-8 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed ${currentConfig.badgeClass}`}
      >
        {REPORT_STATUSES.map((s) => (
          <option key={s.value} value={s.value} className="bg-white text-slate-800">
            {s.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-70">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <Modal isOpen={showResolution} onClose={() => { setShowResolution(false); setPendingStatus(null); }} title="Add a resolution note" description="Tell the reporter what was fixed. This note is optional."><div className="space-y-4"><Textarea label="Resolution note (optional)" value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Describe the completed repair..."/><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setShowResolution(false); setPendingStatus(null); }}>Cancel</Button><Button variant="primary" isLoading={isUpdating} onClick={() => void confirmResolution()}>Confirm</Button></div></div></Modal>
    </div>
  );
};
