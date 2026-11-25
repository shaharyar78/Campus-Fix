'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronDown, MessageSquare, X } from 'lucide-react';
import { StatsCards } from '@/components/admin/StatsCards';
import { ReportFilters } from '@/components/admin/ReportFilters';
import { ReportsTable } from '@/components/admin/ReportsTable';
import { Button } from '@/components/ui/Button';
import { useReports } from '@/hooks/useReports';
import { useBuildings } from '@/hooks/useBuildings';
import { useUser } from '@/hooks/useUser';
import { useCollege } from '@/hooks/useCollege';
import { ReportCategory, ReportStatus } from '@/types';

export default function AdminReportsPage() {
  const { profile } = useUser();
  const { currentCollege } = useCollege(profile?.college_id);
  const { buildings } = useBuildings(profile?.college_id);

  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all');
  const [buildingFilter, setBuildingFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'upvotes'>('newest');
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
  const {
    reports,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    error: reportsError,
    loadMore,
    refreshReports,
    updateReportStatus,
  } = useReports(profile?.college_id);

  const filteredReports = reports.filter((report) => {
    if (statusFilter !== 'all' && report.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && report.category !== categoryFilter) return false;
    if (buildingFilter !== 'all' && report.building_id !== buildingFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = report.title.toLowerCase().includes(q);
      const matchId = report.tracking_id.toLowerCase().includes(q);
      const matchRoom = report.room?.toLowerCase().includes(q);
      const matchBuilding = report.building?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchId && !matchRoom && !matchBuilding) return false;
    }

    return true;
  });

  const sortedReports = [...filteredReports].sort((a, b) =>
    sortOrder === 'upvotes'
      ? b.upvote_count - a.upvote_count
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleResetFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setBuildingFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
            Admin Facility Desk · {currentCollege?.name || 'Your campus'}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Campus Reports Triage
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Review, prioritize, and update maintenance requests across your campus.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Link href="/admin/buildings">
            <Button variant="outline" size="md" leftIcon={<Building2 className="h-4 w-4" />}>
              Manage Buildings
            </Button>
          </Link>
          <Link href="/chat">
            <Button variant="secondary" size="md" leftIcon={<MessageSquare className="h-4 w-4" />}>
              Campus Chat
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <StatsCards reports={reports} />

      {/* Filters and Search Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 lg:flex-row lg:items-center">
        <ReportFilters
          status={statusFilter}
          category={categoryFilter}
          buildingId={buildingFilter}
          search={searchQuery}
          buildings={buildings}
          onStatusChange={setStatusFilter}
          onCategoryChange={setCategoryFilter}
          onBuildingChange={setBuildingFilter}
          onSearchChange={setSearchQuery}
          onReset={handleResetFilters}
        />

        <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500">
          <label htmlFor="admin-sort-order" className="whitespace-nowrap">
            Sort by
          </label>
          <div className="relative">
            <select
              id="admin-sort-order"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as 'newest' | 'upvotes')}
              className="h-9 appearance-none rounded-lg border border-neutral-200 bg-white pl-3 pr-8 text-xs font-medium text-neutral-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            >
              <option value="newest">Newest</option>
              <option value="upvotes">Highest Upvotes</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {statusUpdateError && (
        <div
          className="flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          <span>{statusUpdateError}</span>
          <button
            type="button"
            onClick={() => setStatusUpdateError(null)}
            className="text-rose-700 hover:text-rose-900"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Reports Data Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
          <span className="tabular-nums">
            Showing {filteredReports.length} of {Math.max(reports.length, total)} tickets
          </span>
          <span>Update status inline or inspect ticket for progress notes</span>
        </div>

        {reportsError && !isLoading && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            role="alert"
          >
            <span>{reportsError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void refreshReports()}>
              Retry
            </Button>
          </div>
        )}

        <ReportsTable
          reports={sortedReports}
          isLoading={isLoading}
          onStatusError={setStatusUpdateError}
          onStatusChange={async (reportId, status, note) => {
            setStatusUpdateError(null);
            const result = await updateReportStatus(reportId, status, note);
            if (result.error) throw new Error(result.error);
          }}
        />

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={isLoadingMore}
              onClick={() => void loadMore()}
            >
              Load more tickets
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
