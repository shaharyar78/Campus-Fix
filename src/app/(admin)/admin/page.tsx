'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  const [pendingAccounts, setPendingAccounts] = useState<Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    created_at: string;
  }>>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);

  async function fetchPendingAccounts() {
    setApprovalLoading(true);
    try {
      const response = await fetch('/api/approvals');
      if (response.status === 401) {
        setPendingAccounts([]);
        setApprovalNotice('Sign in with an approved campus-admin account to load requests.');
        return;
      }
      if (response.status === 403) {
        setPendingAccounts([]);
        setApprovalNotice('Only campus admins can review student requests.');
        return;
      }
      if (!response.ok) throw new Error('Could not load approval requests.');
      const json = await response.json();
      setPendingAccounts(json.data || []);
      setApprovalNotice(null);
    } catch {
      setApprovalNotice('Could not load approval requests. Try refreshing.');
    } finally {
      setApprovalLoading(false);
    }
  }

  React.useEffect(() => { void Promise.resolve().then(fetchPendingAccounts); }, []);

  async function processApproval(profileId: string, action: 'approve' | 'reject') {
    setApprovalLoading(true);
    const response = await fetch('/api/approvals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId, action }),
    });
    if (response.ok) {
      await fetchPendingAccounts();
    } else {
      setApprovalNotice('The account request could not be updated. Refresh and try again.');
      setApprovalLoading(false);
    }
  }

  const { reports, isLoading, updateReportStatus } = useReports(profile?.college_id);

  // Apply filters
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
  const sortedReports = [...filteredReports].sort((a, b) => sortOrder === 'upvotes'
    ? b.upvote_count - a.upvote_count
    : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleResetFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setBuildingFilter('all');
    setSearchQuery('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Admin Facility Desk
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-600">
              {currentCollege?.name || 'Your campus'}
            </span>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
              <h2 className="text-base font-bold text-amber-950">Pending Student Approvals</h2>
              <p className="mt-1 text-xs text-amber-800">
                Approve or reject student accounts registered to this campus.
              </p>
              </div>
              <Button type="button" variant="outline" size="sm" isLoading={approvalLoading} onClick={() => void fetchPendingAccounts()}>
                Refresh requests
              </Button>
            </div>
            {approvalNotice && <p className="mt-3 text-sm text-rose-800" role="status">{approvalNotice}</p>}
            {!approvalNotice && !approvalLoading && pendingAccounts.length === 0 && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm text-slate-600">
                No pending student requests. New requests will appear here after registration.
              </p>
            )}
            {pendingAccounts.length > 0 && (
              <div className="mt-4 space-y-2">
                {pendingAccounts.map((account) => (
                  <div key={account.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-amber-200 bg-white px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{account.full_name || 'Unnamed Student'}</p>
                      <p className="text-xs text-slate-500">{account.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={approvalLoading}
                        onClick={() => void processApproval(account.id, 'approve')}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={approvalLoading}
                        onClick={() => void processApproval(account.id, 'reject')}
                        className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Campus Reports Triage
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review, prioritize, and update the status of maintenance requests reported by campus residents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/buildings">
            <Button variant="outline" size="md">
              <svg className="w-4 h-4 mr-1 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Manage Buildings
            </Button>
          </Link>
          <Link href="/chat">
            <Button variant="secondary" size="md">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Student Chat Support
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <StatsCards reports={reports} />

      {/* Filters and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex justify-end"><label className="flex items-center gap-2 text-xs text-slate-600">Sort by<select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'newest' | 'upvotes')} className="rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="newest">Newest</option><option value="upvotes">Highest Upvotes</option></select></label></div>
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
      </div>

      {/* Reports Data Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredReports.length} of {reports.length} total tickets</span>
          <span>Tip: Change status inline or click Inspect for full details</span>
        </div>

        <ReportsTable
          reports={sortedReports}
          isLoading={isLoading}
          onStatusChange={async (reportId, status, note) => {
            const result = await updateReportStatus(reportId, status, note);
            if (result.error) throw new Error(result.error);
          }}
        />
      </div>
    </div>
  );
}
