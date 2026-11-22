import React from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Wrench } from 'lucide-react';
import { Report } from '@/types';

interface StatsCardsProps {
  reports: Report[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ reports }) => {
  const total = reports.length;
  const pending = reports.filter((r) => r.status === 'submitted' || r.status === 'under_review').length;
  const inProgress = reports.filter((r) => r.status === 'assigned' || r.status === 'in_progress').length;
  const resolved = reports.filter((r) => r.status === 'resolved').length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between text-neutral-500">
          <span className="text-xs font-medium uppercase tracking-wider">Total Reports</span>
          <BarChart3 className="h-4 w-4 text-neutral-400" aria-hidden="true" />
        </div>
        <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-neutral-950 tabular-nums sm:text-3xl">
          {total}
        </div>
        <span className="mt-1 block text-xs text-neutral-500">Across campus buildings</span>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between text-neutral-500">
          <span className="text-xs font-medium uppercase tracking-wider">Needs Review</span>
          <AlertTriangle className="h-4 w-4 text-rose-600" aria-hidden="true" />
        </div>
        <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-rose-600 tabular-nums sm:text-3xl">
          {pending}
        </div>
        <span className="mt-1 block text-xs text-neutral-500">Awaiting triage</span>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between text-neutral-500">
          <span className="text-xs font-medium uppercase tracking-wider">In Progress</span>
          <Wrench className="h-4 w-4 text-amber-600" aria-hidden="true" />
        </div>
        <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-amber-600 tabular-nums sm:text-3xl">
          {inProgress}
        </div>
        <span className="mt-1 block text-xs text-neutral-500">Active repairs</span>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between text-neutral-500">
          <span className="text-xs font-medium uppercase tracking-wider">Resolution Rate</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        </div>
        <div className="mt-3 font-display text-2xl font-semibold tracking-tight text-emerald-600 tabular-nums sm:text-3xl">
          {resolutionRate}%
        </div>
        <span className="mt-1 block text-xs text-neutral-500 tabular-nums">
          {resolved} tickets resolved
        </span>
      </div>
    </div>
  );
};
