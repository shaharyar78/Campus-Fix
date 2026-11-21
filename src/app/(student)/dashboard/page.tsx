'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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

  // Filter reports
  const filteredReports = reports.filter((report) => {
    // Status tab filter
    if (activeTab === 'active' && ['resolved', 'rejected', 'closed'].includes(report.status)) {
      return false;
    }
    if (activeTab === 'resolved' && report.status !== 'resolved') {
      return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && report.category !== selectedCategory) {
      return false;
    }

    // Search query
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

  // Stats calculation
  const totalReports = reports.length;
  const pendingReports = reports.filter((r) => ['submitted', 'under_review'].includes(r.status)).length;
  const activeIssuesReports = reports.filter((r) => !['resolved', 'rejected', 'closed'].includes(r.status)).length;
  const resolvedReports = reports.filter((r) => r.status === 'resolved').length;
  const recentReports = reports.slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {profile?.approval_status && profile.approval_status !== 'approved' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">Account approval pending</p>
          <p className="mt-1">
            Your account is active, but access to account features requires approval.
            {profile.approval_status === 'rejected'
              ? ' This request was rejected.'
              : ' Please wait for an administrator.'}
          </p>
        </div>
      )}
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 sm:p-8 text-white shadow-lg shadow-blue-900/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
            <span>{currentCollege?.name || 'Your campus'}</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {profile?.full_name || 'Student'}!
          </h1>
          <p className="mt-2 text-sm text-blue-100 max-w-xl">
            Here is your campus overview.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link
            href="/report/new"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-900 shadow-md transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800"
          >
            <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span className="whitespace-nowrap">Report New Issue</span>
          </Link>
          <Link
            href="/track"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/50 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800"
          >
            <span className="whitespace-nowrap">Track Status</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Reports</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">{totalReports}</div>
          <span className="text-xs text-slate-500">Across all campus departments</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">My Pending Reports</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">{pendingReports}</div>
          <span className="text-xs text-slate-500">Awaiting review or action</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">{resolvedReports}</div>
          <span className="text-xs text-slate-500">Fixed & confirmed</span>
        </div>

      </div>

      {/* Controls & Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Reports ({reports.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'active'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Issues ({activeIssuesReports})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resolved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'resolved'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Resolved ({resolvedReports})
          </button>
        </div>

        {/* Search and Category filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by title, room, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 pl-9 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {REPORT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Grid / Empty / Loading State */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-slate-500">Loading campus reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">No reports found</h3>
          <p className="mt-1 text-sm text-slate-500">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your search criteria or category filter.'
              : 'No issues currently reported in this campus view. Great job!'}
          </p>
          <div className="mt-6">
            <Link href="/report/new">
              <Button variant="primary">Report New Issue</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
