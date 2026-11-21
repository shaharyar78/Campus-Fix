'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { Sidebar } from './Sidebar';

const studentItems = [
  { href: '/dashboard', label: 'Overview', shortLabel: 'Home', icon: '⌂' },
  { href: '/report/new', label: 'New Report', shortLabel: 'Report', icon: '+' },
  { href: '/track', label: 'Track Issue', shortLabel: 'Track', icon: '⌕' },
  { href: '/chat', label: 'Community Chat', shortLabel: 'Chat', icon: '◌' },
];
const adminItems = [
  { href: '/admin', label: 'Dashboard', shortLabel: 'Reports', icon: '▦' },
  { href: '/admin/buildings', label: 'Manage Buildings', shortLabel: 'Buildings', icon: '▤' },
];
const superAdminItems = [
  { href: '/super-admin', label: 'Platform Overview', shortLabel: 'Overview', icon: '▦' },
  { href: '/chat', label: 'Campus Chat', shortLabel: 'Chat', icon: '◌' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile, role, signOut, isLoading } = useUser();
  const [profileOpenForPath, setProfileOpenForPath] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileOpen = profileOpenForPath === pathname;
  const isAuth = pathname === '/login' || pathname === '/register';
  const isPortal = pathname.startsWith('/dashboard') || pathname.startsWith('/report') || pathname.startsWith('/track') || pathname.startsWith('/chat') || pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
  const items = role === 'super_admin' ? superAdminItems : role === 'admin' ? adminItems : studentItems;
  const title = items.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label || 'CampusFix';

  useEffect(() => {
    if (!profileOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) setProfileOpenForPath(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpenForPath(null);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileOpen]);

  if (isAuth) return <main className="min-h-screen">{children}</main>;

  return (
    <div className="min-h-screen">
      <header className="app-header sticky top-0 z-40 px-3 pt-3 sm:px-6">
        <div className="glass-panel mx-auto flex max-w-[1500px] items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-xl p-1 font-bold tracking-tight text-slate-950" aria-label="CampusFix home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-700 to-indigo-700 text-sm font-extrabold text-white shadow-md shadow-blue-900/20">CF</span>
            <span className="text-[15px] sm:text-base">Campus<span className="text-blue-700">Fix</span></span>
          </Link>

          <div className="hidden min-w-0 flex-1 px-4 lg:block">
            <p className="truncate text-sm font-semibold text-slate-800">{isPortal ? title : 'Campus maintenance, made visible'}</p>
            {isPortal && <p className="text-xs text-slate-500">Campus workspace</p>}
          </div>

          {user ? (
            <div ref={profileMenuRef} className="relative shrink-0">
              <button
                type="button"
                aria-label="Open account menu"
                aria-expanded={profileOpen}
                aria-controls="account-menu"
                onClick={() => setProfileOpenForPath((current) => current === pathname ? null : pathname)}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-white/80 bg-white/60 px-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:px-3"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">{(profile?.full_name || user.email || 'U').slice(0, 1).toUpperCase()}</span>
                <span className="hidden max-w-40 truncate sm:block">{profile?.full_name || user.email}</span>
                <span aria-hidden="true" className="text-slate-400">⌄</span>
              </button>
              {profileOpen && (
                <div id="account-menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-white/90 bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-xl">
                  <p className="truncate px-2 pt-1 text-sm font-semibold text-slate-900">{profile?.full_name || 'CampusFix user'}</p>
                  <p className="truncate px-2 pt-1 text-xs text-slate-500">{user.email}</p>
                  <p className="px-2 pt-3 text-[11px] font-bold uppercase tracking-wider text-blue-700">{role === 'admin' ? 'Campus admin' : role === 'super_admin' ? 'Super admin' : 'Student'}</p>
                  <div className="my-3 border-t border-slate-100" />
                  <button onClick={() => void signOut()} className="min-h-11 w-full rounded-xl px-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">Sign out</button>
                </div>
              )}
            </div>
          ) : isLoading ? (
            <span className="h-10 w-24 animate-pulse rounded-xl bg-slate-200/70" aria-label="Loading account" />
          ) : (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white/70" href="/login">Sign in</Link>
              <Link className="rounded-xl bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white shadow-md shadow-slate-900/10 transition hover:bg-blue-800 sm:px-4" href="/register">Get started</Link>
            </div>
          )}
        </div>
      </header>

      {isPortal ? (
        <div className="mx-auto flex max-w-[1500px]">
          <Sidebar
            title={role === 'admin' ? 'Campus admin' : role === 'super_admin' ? 'Platform' : 'Student workspace'}
            items={items.map((item) => ({ ...item, icon: <span aria-hidden="true" className="text-lg">{item.icon}</span> }))}
            className="hidden min-h-[calc(100vh-5rem)] border-r border-white/70 bg-white/45 p-4 backdrop-blur-xl lg:flex"
          />
          <main className="min-w-0 flex-1 pb-24 lg:pb-8">{children}</main>
          <nav
            aria-label="Workspace navigation"
            className="fixed inset-x-3 bottom-3 z-40 mx-auto grid max-w-xl rounded-2xl border border-white/85 bg-white/90 p-1.5 shadow-[0_12px_40px_rgba(24,39,75,.18)] backdrop-blur-2xl lg:hidden"
            style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
          >
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-semibold transition-colors ${active ? 'bg-blue-50 text-blue-800' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  <span aria-hidden="true" className="text-lg leading-5">{item.icon}</span>
                  <span className="max-w-full truncate">{item.shortLabel}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ) : (
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      )}
    </div>
  );
}
