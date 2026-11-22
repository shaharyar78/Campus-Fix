import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function RejectedAccountPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-lg items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-neutral-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-neutral-950">
          Account request not approved
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          Your CampusFix account request was not approved. Contact your campus administrator if you believe this was a mistake.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-neutral-950 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          Return to sign in
        </Link>
      </section>
    </div>
  );
}
