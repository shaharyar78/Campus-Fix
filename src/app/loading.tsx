import { Spinner } from '@/components/ui/Spinner';

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <Spinner size="lg" />
      <h2 className="mt-4 text-base font-medium text-slate-700">Loading CampusFix...</h2>
      <p className="mt-1 text-xs text-slate-500">Retrieving campus data and records</p>
    </div>
  );
}
