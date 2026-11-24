'use client';

import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { CollegeTable } from '@/components/super-admin/CollegeTable';
import { Button } from '@/components/ui/Button';
import { useCollege } from '@/hooks/useCollege';

export default function CollegesPage() {
  const { colleges, isLoading, error, refreshColleges } = useCollege();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        href="/super-admin"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-950"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Back to overview</span>
      </Link>

      <div className="border-b border-neutral-200 pb-5">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
          Tenants
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          Colleges
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Each campus maintains isolated reports, buildings, and user access.
        </p>
      </div>

      {error && !isLoading && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void refreshColleges()}>
            Retry
          </Button>
        </div>
      )}

      <CollegeTable colleges={colleges} isLoading={isLoading} />
    </div>
  );
}
