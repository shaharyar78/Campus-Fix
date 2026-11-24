'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, ChevronUp, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { StatusTimeline } from '@/components/report/StatusTimeline';
import { useUpvote } from '@/hooks/useUpvote';
import { getStatusConfig, getCategoryConfig, formatDate } from '@/lib/utils';
import { isSafeDisplayImageUrl } from '@/lib/imageSecurity';
import { createClient, getClientAuthHeaders } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { Report, ReportUpdate } from '@/types';

export default function ReportDetailPage() {
  const params = useParams();
  const idOrTracking = (params?.id as string) || '';

  const [report, setReport] = React.useState<Report | null>(null);
  const [isLoading, setIsLoading] = React.useState(Boolean(idOrTracking));
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const { user } = useUser();
  const supabase = React.useMemo(() => createClient(), []);
  const [updates, setUpdates] = React.useState<ReportUpdate[]>([]);

  const fetchReport = React.useCallback(async () => {
    if (!idOrTracking) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(idOrTracking)}`, {
        credentials: 'same-origin',
        headers: getClientAuthHeaders(),
      });
      if (response.status === 404) {
        setReport(null);
        return;
      }
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setReport(null);
        setLoadError(json.error?.message || 'Unable to load report details.');
        return;
      }
      setReport((json.data as Report) || null);
    } catch {
      setReport(null);
      setLoadError('Unable to reach the server. Check your connection and retry.');
    } finally {
      setIsLoading(false);
    }
  }, [idOrTracking]);

  React.useEffect(() => {
    void Promise.resolve().then(fetchReport);
  }, [fetchReport]);

  const { upvotes, hasUpvoted, isMutating, toggleUpvote } = useUpvote(
    report?.id || '',
    report?.upvote_count || 0,
    report?.has_upvoted,
    user?.id
  );

  React.useEffect(() => {
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
        // Keep existing updates if fetch fails
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
        <p className="mt-3 text-sm text-neutral-500">Retrieving report details...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center" role="alert">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="font-display text-xl font-semibold text-neutral-950">Could Not Load Report</h2>
        <p className="mt-2 text-sm text-neutral-600">{loadError}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" variant="primary" onClick={() => void fetchReport()}>
            Retry
          </Button>
          <Link href="/track">
            <Button variant="outline">Back to Tracking</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="font-display text-xl font-semibold text-neutral-950">Report Not Found</h2>
        <p className="mt-2 text-sm text-neutral-600">
          No maintenance report was found with identifier{' '}
          <span className="font-mono font-semibold text-neutral-900">{idOrTracking}</span>.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
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
  const displayPhotos = (
    report.photo_urls && report.photo_urls.length > 0 ? report.photo_urls : report.photo_paths || []
  ).filter(isSafeDisplayImageUrl);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/track"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Tracking</span>
        </Link>

        <span className="font-mono text-xs font-medium text-neutral-500">
          {report.tracking_id}
        </span>
      </div>

      <Card>
        <CardHeader className="border-b border-neutral-200 pb-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-neutral-500">{categoryConfig.label}</span>
                <span aria-hidden="true" className="text-neutral-300">·</span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusConfig.badgeClass}`}
                >
                  {statusConfig.label}
                </span>
              </div>
              <CardTitle className="text-2xl font-semibold">{report.title}</CardTitle>
              <p className="mt-1.5 text-xs text-neutral-500">
                Submitted on {formatDate(report.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap shrink-0 items-center gap-2">
              <Button
                variant={hasUpvoted ? 'primary' : 'outline'}
                size="md"
                onClick={() => toggleUpvote()}
                disabled={isMutating}
                leftIcon={<ChevronUp className="h-4 w-4" />}
                className="tabular-nums"
              >
                Upvote ({upvotes})
              </Button>

              <Link href={`/chat?report=${report.id}`}>
                <Button variant="secondary" size="md" leftIcon={<MessageSquare className="h-4 w-4" />}>
                  Chat Desk
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pt-6">
          {/* Location details */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Building
              </span>
              <p className="mt-0.5 text-sm font-medium text-neutral-900">
                {report.building?.name || report.building_label || 'Campus Building'}
                {report.building?.code ? ` (${report.building.code})` : ''}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Section
              </span>
              <p className="mt-0.5 text-sm font-medium text-neutral-900">
                {report.section || 'Not specified'}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Floor Level
              </span>
              <p className="mt-0.5 text-sm font-medium text-neutral-900">
                {report.floor || 'Not specified'}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Situation
              </span>
              <p className="mt-0.5 text-sm font-medium capitalize text-neutral-900">
                {report.situation || 'normal'}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Room / Area
              </span>
              <p className="mt-0.5 text-sm font-medium text-neutral-900">
                {report.room || 'General Area'}
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
              Issue Description
            </h4>
            <div className="whitespace-pre-wrap rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-700">
              {report.description}
            </div>
          </div>

          {/* Photo gallery */}
          {displayPhotos.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Attached Photos
              </h4>
              <div className="flex flex-wrap gap-3">
                {displayPhotos.map((p, idx) => (
                  <div
                    key={idx}
                    className="relative h-28 w-28 overflow-hidden rounded-lg border border-neutral-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p}
                      alt={`Report attachment ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
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
  );
}
