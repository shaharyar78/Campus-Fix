'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, FileText, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { TrackingSearch } from '@/components/report/TrackingSearch';
import { ReportCard } from '@/components/report/ReportCard';
import { useReports } from '@/hooks/useReports';
import { useUser } from '@/hooks/useUser';

export default function TrackSearchPage() {
  const { user, profile, isLoading: userLoading, error: userError, refreshUser } = useUser();
  const canLoadCampusReports = Boolean(user && profile?.approval_status === 'approved');
  const { reports, isLoading, error, refreshReports } = useReports(profile?.college_id, {
    enabled: canLoadCampusReports,
  });

  const recentReports = canLoadCampusReports ? reports.slice(0, 3) : [];
  const loadError = userError || (canLoadCampusReports ? error : null);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
      {/* Search Hero */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 text-center sm:p-10">
        <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700">
          <Search className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          Track Campus Maintenance Ticket
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-neutral-500">
          Enter the tracking ID from your report receipt to inspect its current status and activity log.
        </p>

        <div className="mt-7 flex justify-center">
          <TrackingSearch />
        </div>
      </section>

      {/* Recent Campus Tickets */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-neutral-950">
            Recent Campus Tickets
          </h2>
          <span className="text-xs text-neutral-500">Select any ticket to inspect lifecycle</span>
        </div>

        {loadError && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{loadError}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (userError) void refreshUser();
                if (error && canLoadCampusReports) void refreshReports();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {userLoading || (canLoadCampusReports && isLoading) ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : !canLoadCampusReports ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-400">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-3 font-display text-sm font-semibold text-neutral-950">
              Sign in to inspect ticket details
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Recent campus tickets and full ticket timelines require an approved campus account.
            </p>
            <div className="mt-5">
              <Link href="/login">
                <Button variant="primary" size="sm">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        ) : recentReports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-400">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-3 font-display text-sm font-semibold text-neutral-950">
              No recent tickets found
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Submitted reports for your campus will appear here for quick lookup.
            </p>
            <div className="mt-5">
              <Link href="/report/new">
                <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Report an issue
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {recentReports.map((report) => (
              <ReportCard key={report.id} report={report} currentUserId={profile?.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
