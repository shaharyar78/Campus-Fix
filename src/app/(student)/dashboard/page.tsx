'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, Clock, FileText, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ReportCard } from '@/components/report/ReportCard';
import { Spinner } from '@/components/ui/Spinner';
import { REPORT_CATEGORIES } from '@/lib/constants';
import { useReports } from '@/hooks/useReports';
import { useUser } from '@/hooks/useUser';
import { useCollege } from '@/hooks/useCollege';

export default function StudentDashboardPage() {
  const { profile } = useUser();
  const { currentCollege } = useCollege(profile?.college_id);

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'resolved'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { reports, isLoading } = useReports(profile?.college_id, { submitter_id: profile?.id });

  const filteredReports = reports.filter((report) => {
    if (activeTab === 'active' && ['resolved', 'rejected', 'closed'].includes(report.status)) {
      return false;
    }
    if (activeTab === 'resolved' && report.status !== 'resolved') {
      return false;
    }
    if (selectedCategory !== 'all' && report.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = report.title.toLowerCase().includes(q);
      const matchDesc = report.description.toLowerCase().includes(q);
      const matchId = report.tracking_id.toLowerCase().includes(q);
      const matchBuilding = report.building?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchId && !matchBuilding) return false;
    }
    return true;
  });

  const totalReports = reports.length;
  const pendingReports = reports.filter((r) => ['submitted', 'under_review'].includes(r.status)).length;
  const activeIssuesReports = reports.filter((r) => !['resolved', 'rejected', 'closed'].includes(r.status)).length;
  const resolvedReports = reports.filter((r) => r.status === 'resolved').length;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      {profile?.approval_status && profile.approval_status !== 'approved' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Account approval pending</p>
          <p className="mt-1 text-amber-800">
            Your account is active, but access to workspace features requires approval.
            {profile.approval_status === 'rejected'
              ? ' This request was rejected.'
              : ' Please wait for an administrator.'}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-6 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
            {currentCollege?.name || 'Your campus'}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Welcome back, {profile?.full_name || 'Student'}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Submit campus facility issues and track repair progress in one place.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <Link href="/track">
            <Button variant="outline" size="md">
              Track Status
            </Button>
          </Link>
          <Link href="/report/new">
            <Button variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
              Report New Issue
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Total Reports</span>
            <FileText className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          </div>
          <div className="mt-3 font-display text-3xl font-semibold tracking-tight text-neutral-950 tabular-nums">
            {totalReports}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Submitted by your account</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <div className="mt-3 font-display text-3xl font-semibold tracking-tight text-neutral-950 tabular-nums">
            {pendingReports}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Awaiting review or dispatch</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-medium uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="mt-3 font-display text-3xl font-semibold tracking-tight text-neutral-950 tabular-nums">
            {resolvedReports}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Completed repairs</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-4 md:flex-row md:items-center">
        <div className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors tabular-nums ${
              activeTab === 'all' ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors tabular-nums ${
              activeTab === 'active' ? 'bg-white text-blue-600 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Active ({activeIssuesReports})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resolved')}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors tabular-nums ${
              activeTab === 'resolved' ? 'bg-white text-emerald-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Resolved ({resolvedReports})
          </button>
        </div>

        <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search title, building, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 sm:w-64"
            />
          </div>

          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by category"
              className="h-9 w-full appearance-none rounded-lg border border-neutral-200 bg-white pl-3 pr-8 text-xs text-neutral-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15 sm:w-auto"
            >
              <option value="all">All Categories</option>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-neutral-500">Loading campus reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-400">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="mt-4 font-display text-base font-semibold text-neutral-950">No reports found</h3>
          <p className="mt-1 text-sm text-neutral-500">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your search criteria or category filter.'
              : 'You have not submitted any maintenance issues in this view yet.'}
          </p>
          <div className="mt-6">
            <Link href="/report/new">
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Report New Issue
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} currentUserId={profile?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
