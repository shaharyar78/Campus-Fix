import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600">
        <FileQuestion className="h-5 w-5" aria-hidden="true" />
      </div>
      <span className="font-mono text-xs font-medium uppercase tracking-wider text-blue-600">
        404
      </span>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        The report, page, or campus resource you are looking for does not exist or may have been moved.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link href="/">
          <Button variant="primary">Return home</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline">Go to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
