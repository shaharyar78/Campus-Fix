'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { isRouteActive } from './Sidebar';

export const Navbar = () => {
  const pathname = usePathname();
  const { user, profile, role, signOut } = useUser();

  const links =
    role === 'super_admin'
      ? [
          { href: '/super-admin', label: 'Overview' },
          { href: '/super-admin/colleges', label: 'Colleges' },
          { href: '/chat', label: 'Campus Chat' },
        ]
      : role === 'admin'
        ? [
            { href: '/admin', label: 'Reports', matchPrefixes: ['/admin/reports'] },
            { href: '/admin/buildings', label: 'Buildings' },
            { href: '/chat', label: 'Campus Chat' },
          ]
        : [
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/report/new', label: 'Report an issue' },
            { href: '/track', label: 'Track' },
          ];

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-[15px] font-bold tracking-tight text-neutral-950 whitespace-nowrap"
          aria-label="CampusFix home"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-neutral-950 font-mono text-[11px] font-semibold text-white">
            CF
          </span>
          <span>CampusFix</span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex" aria-label="Main navigation">
          {links.map((link) => {
            const active = isRouteActive(
              pathname,
              link.href,
              'matchPrefixes' in link ? link.matchPrefixes : undefined
            );
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap text-sm font-medium transition-colors ${
                  active ? 'text-neutral-950' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {user || profile ? (
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden max-w-36 truncate text-sm font-medium text-neutral-600 sm:block">
              {profile?.full_name || user?.email?.split('@')[0] || 'Account'}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/login"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="whitespace-nowrap rounded-lg bg-neutral-950 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
