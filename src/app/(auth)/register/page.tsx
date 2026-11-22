export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata = {
  title: 'Register - CampusFix',
  description: 'Create an account on CampusFix to report issues and track campus repairs.',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-neutral-200 bg-white lg:grid-cols-2">
        <section className="hidden flex-col justify-between bg-neutral-950 p-10 text-white lg:flex">
          <Link href="/" className="font-display text-sm font-bold tracking-tight text-white">
            CampusFix
          </Link>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-blue-400">
              Account setup
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight">
              Small reports.
              <br />
              Real change.
            </h1>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-400">
              Register with your college email to submit maintenance requests and follow repairs.
            </p>
          </div>
          <p className="text-xs text-neutral-500">Approved by your campus team.</p>
        </section>

        <div className="p-6 sm:p-10">
          <div className="mb-6 flex items-center justify-between lg:justify-end">
            <Link href="/" className="font-display text-sm font-bold tracking-tight text-neutral-950 lg:hidden">
              CampusFix
            </Link>
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-950">
              Create account
            </h2>
            <p className="mt-1.5 text-sm text-neutral-500">
              Select your institution and verify your campus email.
            </p>
          </div>

          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
