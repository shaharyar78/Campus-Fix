import Link from 'next/link';

export default function RejectedAccountPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Account request not approved</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your CampusFix account request was not approved. Contact your campus administrator if you believe this was a mistake.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Return to sign in
        </Link>
      </section>
    </main>
  );
}
