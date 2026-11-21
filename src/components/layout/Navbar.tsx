'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

export const Navbar = () => {
  const pathname = usePathname();
  const { user, profile, role, signOut } = useUser();

  const links = role === 'super_admin'
    ? [
        { href: '/super-admin', label: 'Overview' },
        { href: '/chat', label: 'Campus Chat' },
      ]
    : role === 'admin'
      ? [
          { href: '/admin', label: 'Reports' },
          { href: '/admin/buildings', label: 'Buildings' },
        ]
      : [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/report/new', label: 'Report an issue' },
          { href: '/track', label: 'Track' },
        ];

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div className="glass-panel mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl px-4 py-3 sm:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="CampusFix home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-blue-900/20">CF</span>
          <span className="text-lg font-bold tracking-tight text-slate-900">Campus<span className="text-blue-600">Fix</span></span>
        </Link>

        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto border-t border-slate-200/60 pt-2 md:order-none md:w-auto md:border-0 md:pt-0" aria-label="Main navigation">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-white/80 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white/55 hover:text-slate-900'}`}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {user || profile ? (
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden max-w-36 truncate text-sm font-medium text-slate-600 sm:block">{profile?.full_name || user?.email?.split('@')[0] || 'Account'}</span>
            <button type="button" onClick={signOut} className="rounded-xl border border-slate-200/80 bg-white/45 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white/80">Sign out</button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white/60">Sign in</Link>
            <Link href="/register" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-blue-700">Get started</Link>
          </div>
        )}
      </div>
    </header>
  );
};
