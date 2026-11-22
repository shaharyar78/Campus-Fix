'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronUp, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';
import { StatusTimeline } from '@/components/report/StatusTimeline';
import { REPORT_STATUSES } from '@/lib/constants';
import { useReports } from '@/hooks/useReports';
import { createClient } from '@/lib/supabase/client';
import { getStatusConfig, getCategoryConfig, formatDate } from '@/lib/utils';
import { ReportStatus, ReportUpdate } from '@/types';

export default function AdminReportDetailPage() {
  const params = useParams();
  const reportId = (params?.id as string) || '';

  const { reports, isLoading, updateReportStatus } = useReports();
  const supabase = createClient();
  const report = reports.find(
    (r) =>
      r.id.toLowerCase() === reportId.toLowerCase() ||
      r.tracking_id.toLowerCase() === reportId.toLowerCase()
  );

  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | null>(null);
  const activeStatus = selectedStatus ?? report?.status ?? 'submitted';
  const [updateNote, setUpdateNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updates, setUpdates] = useState<ReportUpdate[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const fetchUpdates = useCallback(
    async (targetReportId: string) => {
      try {
        const { data, error } = await supabase
          .from('report_updates')
          .select('*, author:profiles(full_name, role)')
          .eq('report_id', targetReportId)
          .order('created_at', { ascending: true });
        if (!error) {
          setUpdates((data || []) as ReportUpdate[]);
        }
      } catch {
        // Keep existing timeline state if refresh fails
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (!report?.id) return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('report_updates')
          .select('*, author:profiles(full_name, role)')
          .eq('report_id', report.id)
          .order('created_at', { ascending: true });
        if (active && !error) {
          setUpdates((data || []) as ReportUpdate[]);
        }
      } catch {
        // Ignore transient fetch errors
      }
    })();
    return () => {
      active = false;
    };
  }, [report?.id, supabase]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Spinner size="lg" />
        <p className="mt-3 text-sm text-neutral-500">Loading ticket for admin triage...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="font-display text-xl font-semibold text-neutral-950">Report Not Found</h2>
        <p className="mt-2 text-sm text-neutral-600">
          The requested report was not found in this college scope.
        </p>
        <div className="mt-6">
          <Link href="/admin">
            <Button variant="primary">Return to Triage</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(report.status);
  const categoryConfig = getCategoryConfig(report.category);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await updateReportStatus(report.id, activeStatus, updateNote.trim() || undefined);
      if (res?.error) {
        setFeedback({ type: 'error', message: res.error });
      } else {
        setFeedback({ type: 'success', message: 'Status and timeline updated successfully.' });
        setUpdateNote('');
        await fetchUpdates(report.id);
        setTimeout(() => setFeedback(null), 4000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Reports Triage</span>
        </Link>

        <span className="font-mono text-xs font-medium text-neutral-500">
          {report.tracking_id}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="border-b border-neutral-200 pb-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-neutral-500">{categoryConfig.label}</span>
                <span aria-hidden="true" className="text-neutral-300">·</span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusConfig.badgeClass}`}
                >
                  {statusConfig.label}
                </span>
                <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs font-medium tabular-nums text-neutral-700">
                  <ChevronUp className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                  {report.upvote_count} upvotes
                </span>
              </div>
              <CardTitle className="text-2xl font-semibold">{report.title}</CardTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                <span>Submitted by {report.submitter?.full_name || 'Student'}</span>
                <span aria-hidden="true" className="text-neutral-300">·</span>
                <span>{formatDate(report.created_at)}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs sm:grid-cols-5">
                <div>
                  <span className="font-medium uppercase tracking-wider text-neutral-400">
                    Building
                  </span>
                  <p className="mt-0.5 font-medium text-neutral-900">
                    {report.building?.name || report.building_label || 'Campus facility'}
                  </p>
                </div>
                <div>
                  <span className="font-medium uppercase tracking-wider text-neutral-400">Floor</span>
                  <p className="mt-0.5 font-medium text-neutral-900">{report.floor || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium uppercase tracking-wider text-neutral-400">
                    Section
                  </span>
                  <p className="mt-0.5 font-medium text-neutral-900">{report.section || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium uppercase tracking-wider text-neutral-400">Room</span>
                  <p className="mt-0.5 font-medium text-neutral-900">{report.room || 'General'}</p>
                </div>
                <div>
                  <span className="font-medium uppercase tracking-wider text-neutral-400">
                    Situation
                  </span>
                  <p className="mt-0.5 font-medium capitalize text-neutral-900">
                    {report.situation || 'normal'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Student Report Description
                </h4>
                <div className="whitespace-pre-wrap rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-700">
                  {report.description}
                </div>
              </div>

              {report.photo_paths && report.photo_paths.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Attached Evidence Photos
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {report.photo_paths.map((p, idx) => (
                      <div
                        key={idx}
                        className="relative h-28 w-28 overflow-hidden rounded-lg border border-neutral-200"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p}
                          alt={`Photo ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-neutral-200 pt-6">
                <StatusTimeline
                  currentStatus={report.status}
                  createdAt={report.created_at}
                  updates={updates}
                  resolvedAt={report.resolved_at}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-neutral-200 pb-4">
              <CardTitle className="text-base font-semibold">Triage & Status Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {feedback && (
                <div
                  className={`rounded-lg border p-3 text-xs ${
                    feedback.type === 'error'
                      ? 'border-rose-200 bg-rose-50 text-rose-800'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  }`}
                  role={feedback.type === 'error' ? 'alert' : 'status'}
                >
                  {feedback.message}
                </div>
              )}

              <form onSubmit={handleUpdate} className="space-y-4">
                <Select
                  label="Update Status"
                  value={activeStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as ReportStatus)}
                  required
                >
                  {REPORT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>

                <Textarea
                  label="Progress Note / Remarks"
                  placeholder="e.g. Electrician repaired wiring in lab."
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  rows={3}
                  helperText="Appears on the student timeline log."
                />

                <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
                  Save Status & Note
                </Button>
              </form>

              <div className="border-t border-neutral-200 pt-4">
                <Link href={`/chat?report=${report.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
                  >
                    Open Direct Chat
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
