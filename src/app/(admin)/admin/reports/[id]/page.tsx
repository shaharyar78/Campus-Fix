'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Spinner } from '@/components/ui/Spinner';
import { StatusTimeline } from '@/components/report/StatusTimeline';
import { REPORT_STATUSES } from '@/lib/constants';
import { useReports } from '@/hooks/useReports';
import { getStatusConfig, getCategoryConfig, formatDate } from '@/lib/utils';
import { ReportStatus } from '@/types';

export default function AdminReportDetailPage() {
  const params = useParams();
  const reportId = (params?.id as string) || '';

  const { reports, isLoading, updateReportStatus } = useReports();
  const report = reports.find((r) => r.id === reportId || r.tracking_id === reportId);

  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | null>(null);
  const activeStatus = selectedStatus ?? report?.status ?? 'submitted';
  const [updateNote, setUpdateNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <Spinner size="lg" />
        <p className="mt-3 text-sm text-slate-500">Loading ticket for admin triage...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900">Report Not Found</h2>
        <p className="mt-2 text-sm text-slate-600">The requested report was not found in this college scope.</p>
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
        setFeedback(`Error: ${res.error}`);
      } else {
        setFeedback('Status and timeline updated successfully.');
        setUpdateNote('');
        setTimeout(() => setFeedback(null), 4000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Reports Triage
        </Link>

        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-md">
          {report.tracking_id}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Ticket Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {categoryConfig.label}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusConfig.badgeClass}`}>
                  {statusConfig.label}
                </span>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 ml-auto">
                  ▲ {report.upvote_count} Upvotes
                </span>
              </div>
              <CardTitle className="text-2xl font-bold">{report.title}</CardTitle>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>Submitted by {report.submitter?.full_name || 'Student'}</span>
                <span>&bull;</span>
                <span>{formatDate(report.created_at)}</span>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Location */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs sm:grid-cols-5">
                <div>
                  <span className="font-semibold text-slate-400 uppercase">Building</span>
                  <p className="font-bold text-slate-900 mt-0.5">{report.building?.name || report.building_label || 'Campus facility'}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 uppercase">Floor</span>
                  <p className="font-bold text-slate-900 mt-0.5">{report.floor || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 uppercase">Section</span>
                  <p className="font-bold text-slate-900 mt-0.5">{report.section || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 uppercase">Room</span>
                  <p className="font-bold text-slate-900 mt-0.5">{report.room || 'General'}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 uppercase">Situation</span>
                  <p className="font-bold capitalize text-slate-900 mt-0.5">{report.situation || 'normal'}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Student Report Description
                </h4>
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {report.description}
                </div>
              </div>

              {/* Photos */}
              {report.photo_paths && report.photo_paths.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Attached Evidence Photos
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {report.photo_paths.map((p, idx) => (
                      <div key={idx} className="relative h-28 w-28 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="pt-4 border-t border-slate-200">
                <StatusTimeline
                  currentStatus={report.status}
                  createdAt={report.created_at}
                  resolvedAt={report.resolved_at}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Admin Actions Box */}
        <div className="space-y-6">
          <Card className="border-blue-200 shadow-md">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Triage & Status Action
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {feedback && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                  {feedback}
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
                  label="Progress Note / Technician Remarks"
                  placeholder="e.g. Electrician visited and repaired wiring in lab."
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  rows={3}
                  helperText="Appears on the student timeline log."
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  Save Status & Timeline Note
                </Button>
              </form>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <Link href={`/chat?report=${report.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Open Direct Chat with Student
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
