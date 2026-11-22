export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Login - CampusFix',
  description: 'Sign in to CampusFix to report issues and track campus maintenance requests.',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-neutral-200 bg-white lg:grid-cols-2">
        <section className="hidden flex-col justify-between bg-neutral-950 p-10 text-white lg:flex">
          <Link href="/" className="font-display text-sm font-bold tracking-tight text-white">
            CampusFix
          </Link>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-blue-400">
              Campus maintenance
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight">
              Report it.
              <br />
              Track it.
              <br />
              Get it fixed.
            </h1>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-400">
              One workspace for students and facilities teams to resolve campus issues transparently.
            </p>
          </div>
          <p className="text-xs text-neutral-500">Scoped per institution.</p>
        </section>

        <div className="p-6 sm:p-10">
          <div className="mb-8 flex items-center justify-between lg:justify-end">
            <Link href="/" className="font-display text-sm font-bold tracking-tight text-neutral-950 lg:hidden">
              CampusFix
            </Link>
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700">
              <LogIn className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-neutral-950">
              Sign in
            </h2>
            <p className="mt-1.5 text-sm text-neutral-500">
              Enter your credentials to access your campus workspace.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
