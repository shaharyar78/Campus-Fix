'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { StatusTimeline } from '@/components/report/StatusTimeline';
import { useReports } from '@/hooks/useReports';
import { useUpvote } from '@/hooks/useUpvote';
import { getStatusConfig, getCategoryConfig, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { ReportUpdate } from '@/types';

export default function ReportDetailPage() {
  const params = useParams();
  const idOrTracking = (params?.id as string) || '';

  const { reports, isLoading } = useReports();
  const { user } = useUser();
  const supabase = createClient();
  const [updates, setUpdates] = React.useState<ReportUpdate[]>([]);

  // Find report by ID or by tracking_id
  const report = reports.find(
    (r) =>
      r.id.toLowerCase() === idOrTracking.toLowerCase() ||
      r.tracking_id.toLowerCase() === idOrTracking.toLowerCase()
  );

  const { upvotes, hasUpvoted, isMutating, toggleUpvote } = useUpvote(
    report?.id || '',
    report?.upvote_count || 0,
    report?.has_upvoted
    , user?.id
  );

  React.useEffect(() => {
    if (!report?.id) return;
    let active = true;
    void supabase.from('report_updates').select('*, author:profiles(full_name, role)').eq('report_id', report.id).order('created_at', { ascending: true }).then(({ data }) => {
      if (active) setUpdates((data || []) as ReportUpdate[]);
    });
    return () => { active = false; };
  }, [report?.id, supabase]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <Spinner size="lg" />
        <p className="mt-3 text-sm text-slate-500">Retrieving report details...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-4">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Report Not Found</h2>
        <p className="mt-2 text-sm text-slate-600">
          No maintenance report was found with identifier <span className="font-mono font-semibold">{idOrTracking}</span>.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/track">
            <Button variant="primary">Search Again</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(report.status);
  const categoryConfig = getCategoryConfig(report.category);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/track"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tracking Search
        </Link>

        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-md">
          {report.tracking_id}
        </span>
      </div>

      {/* Main Ticket Card */}
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {categoryConfig.label}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.badgeClass}`}>
                  {statusConfig.label}
                </span>
              </div>
              <CardTitle className="text-2xl font-bold">{report.title}</CardTitle>
              <p className="text-xs text-slate-400 mt-1">
                Submitted on {formatDate(report.created_at)}
              </p>
            </div>

            {/* Upvote Button in Header */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={hasUpvoted ? 'primary' : 'outline'}
                size="md"
                onClick={() => toggleUpvote()}
                disabled={isMutating}
                className="gap-2"
              >
                <svg
                  className={`w-4 h-4 ${hasUpvoted ? 'fill-current' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                </svg>
                <span>Upvote ({upvotes})</span>
              </Button>

              <Link href={`/chat?report=${report.id}`}>
                <Button variant="secondary" size="md">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat Desk
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-8">
          {/* Location details callout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-200">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Building</span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {report.building?.name || report.building_label || 'Campus Building'}
                {report.building?.code ? ` (${report.building.code})` : ''}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Section</span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">{report.section || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Floor Level</span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {report.floor || 'Not specified'}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Situation</span>
              <p className="text-sm font-semibold capitalize text-slate-800 mt-0.5">{report.situation || 'normal'}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Room / Area</span>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {report.room || 'General Area'}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Issue Description
            </h4>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {report.description}
            </div>
          </div>

          {/* Photo gallery if present */}
          {report.photo_paths && report.photo_paths.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Attached Photos
              </h4>
              <div className="flex flex-wrap gap-3">
                {report.photo_paths.map((p, idx) => (
                  <div key={idx} className="relative h-28 w-28 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt={`Report attachment ${idx + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lifecycle & Status Timeline */}
          <div className="pt-4 border-t border-slate-200">
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
  );
}
