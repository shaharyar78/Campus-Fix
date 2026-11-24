'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="font-display text-xl font-semibold text-neutral-950">Something went wrong</h2>
      <p className="mt-2 text-sm text-neutral-600">
        {process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred while loading this page. Please try again.'
          : error.message || 'An unexpected error occurred while loading this page. Please try again.'}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={() => reset()} variant="primary">
          Try again
        </Button>
        <Button onClick={() => router.push('/')} variant="outline">
          Return home
        </Button>
      </div>
    </div>
  );
}
