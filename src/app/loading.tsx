import { Spinner } from '@/components/ui/Spinner';

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <Spinner size="lg" />
      <h2 className="mt-4 font-display text-sm font-medium text-neutral-900">Loading workspace</h2>
      <p className="mt-1 text-xs text-neutral-500">Retrieving campus data and records</p>
    </div>
  );
}
