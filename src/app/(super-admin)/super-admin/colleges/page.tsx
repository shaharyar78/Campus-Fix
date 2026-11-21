'use client';

import Link from 'next/link';
import { CollegeTable } from '@/components/super-admin/CollegeTable';
import { useCollege } from '@/hooks/useCollege';

export default function CollegesPage() {
  const { colleges, isLoading } = useCollege();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/super-admin" className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-blue-700">
        ← Back to overview
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Campus</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Colleges</h1>
        <p className="mt-2 text-sm text-slate-600">Each campus has separate reports, buildings, and account access.</p>
      </div>
      <CollegeTable colleges={colleges} isLoading={isLoading} />
    </div>
  );
}
