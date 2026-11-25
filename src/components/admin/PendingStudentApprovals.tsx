'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getClientAuthHeaders } from '@/lib/supabase/client';

interface PendingStudent {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  college?: { name: string } | null;
}

export function PendingStudentApprovals() {
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/approvals', {
        credentials: 'same-origin',
        headers: getClientAuthHeaders(),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error?.message || 'Could not load student approvals.');
      setStudents((result.data || []) as PendingStudent[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load student approvals.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const processApproval = async (studentId: string, action: 'approve' | 'reject') => {
    setProcessingId(studentId);
    setError(null);
    try {
      const response = await fetch('/api/approvals', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...getClientAuthHeaders() },
        body: JSON.stringify({ profile_id: studentId, action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error?.message || 'Could not update this student account.');
      setStudents((current) => current.filter((student) => student.id !== studentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this student account.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-base font-semibold text-neutral-950">Pending Student Approvals</h2>
          <p className="mt-0.5 text-xs text-neutral-500">Approve or reject student accounts registered to this campus.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          isLoading={isLoading}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={() => void refresh()}
        >
          Refresh
        </Button>
      </div>

      {error && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">{error}</p>}
      {!error && !isLoading && students.length === 0 && (
        <p className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-500">
          No pending student requests. New registrations will appear here.
        </p>
      )}
      {students.length > 0 && (
        <div className="mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          {students.map((student) => (
            <div key={student.id} className="flex flex-col justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-neutral-950">{student.full_name || 'Unnamed Student'}</p>
                <p className="text-xs text-neutral-500">{student.email} · {new Date(student.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" disabled={processingId !== null} isLoading={processingId === student.id} onClick={() => void processApproval(student.id, 'approve')}>
                  Approve
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={processingId !== null} onClick={() => void processApproval(student.id, 'reject')}>
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
