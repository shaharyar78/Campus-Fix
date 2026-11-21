'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { TrackingSearch } from '@/components/report/TrackingSearch';
import { ReportCard } from '@/components/report/ReportCard';
import { useReports } from '@/hooks/useReports';
import { useUser } from '@/hooks/useUser';

export default function TrackSearchPage() {
  const { profile } = useUser();
  const { reports } = useReports(profile?.college_id);

  // Take latest 3 reports for quick lookup
  const recentReports = reports.slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      {/* Search Hero Box */}
      <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-white shadow-lg p-8 sm:p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 mb-4">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Track Campus Maintenance Ticket
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
          Enter the tracking ID from your report receipt to check its progress and updates.
        </p>

        <div className="mt-8 flex justify-center">
          <TrackingSearch />
        </div>
      </Card>

      {/* Recent Campus Tickets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent Campus Tickets</h2>
          <span className="text-xs text-slate-500">Click any ticket to inspect lifecycle</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      </div>
    </div>
  );
}
