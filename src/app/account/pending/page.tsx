import Link from 'next/link';

export default function PendingApprovalPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700" aria-hidden="true">
          ...
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-950">Approval pending</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your college account request is awaiting review. Student accounts are reviewed by a campus administrator; administrator accounts are reviewed by the super-admin.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          You can sign in again after your request is approved.
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
