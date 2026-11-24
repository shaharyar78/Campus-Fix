'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ChevronDown,
  Home,
  LayoutGrid,
  LogOut,
  MessageSquare,
  PlusSquare,
  Search,
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { Sidebar, isRouteActive } from './Sidebar';
import { Footer } from './Footer';

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  matchPrefixes?: string[];
}

const studentItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', shortLabel: 'Overview', icon: Home },
  { href: '/report/new', label: 'New Report', shortLabel: 'Report', icon: PlusSquare },
  { href: '/track', label: 'Track Issue', shortLabel: 'Track', icon: Search },
  { href: '/chat', label: 'Campus Chat', shortLabel: 'Chat', icon: MessageSquare },
];

const adminItems: NavItem[] = [
  { href: '/admin', label: 'Reports', shortLabel: 'Reports', icon: LayoutGrid, matchPrefixes: ['/admin/reports'] },
  { href: '/admin/buildings', label: 'Buildings', shortLabel: 'Buildings', icon: Building2 },
  { href: '/chat', label: 'Campus Chat', shortLabel: 'Chat', icon: MessageSquare },
];

const superAdminItems: NavItem[] = [
  { href: '/super-admin', label: 'Overview', shortLabel: 'Overview', icon: LayoutGrid },
  { href: '/super-admin/colleges', label: 'Colleges', shortLabel: 'Colleges', icon: Building2 },
  { href: '/chat', label: 'Campus Chat', shortLabel: 'Chat', icon: MessageSquare },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile, role, signOut, isLoading } = useUser();
  const [profileOpenForPath, setProfileOpenForPath] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileOpen = profileOpenForPath === pathname;

  const isAuth =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/auth/');

  const isPortal =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/report') ||
    pathname.startsWith('/track') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/super-admin');

  const items = role === 'super_admin' ? superAdminItems : role === 'admin' ? adminItems : studentItems;
  const activeItem = items.find((item) => isRouteActive(pathname, item.href, item.matchPrefixes));
  const title = activeItem?.label || 'CampusFix';
  const roleLabel = role === 'admin' ? 'Campus admin' : role === 'super_admin' ? 'Super admin' : 'Student';

  useEffect(() => {
    if (!profileOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) {
        setProfileOpenForPath(null);
      }
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
    <div className="flex min-h-screen flex-col overflow-x-clip bg-neutral-50">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
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

            {isPortal ? (
              <span className="hidden border-l border-neutral-200 pl-6 text-sm font-medium text-neutral-500 lg:inline-block">
                {title}
              </span>
            ) : (
              <nav className="hidden items-center gap-6 sm:flex" aria-label="Public navigation">
                <Link
                  href="/track"
                  className="whitespace-nowrap text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
                >
                  Track Issue
                </Link>
                <Link
                  href="/report/new"
                  className="whitespace-nowrap text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
                >
                  Report Issue
                </Link>
              </nav>
            )}
          </div>

          {user ? (
            <div ref={profileMenuRef} className="relative shrink-0">
              <button
                type="button"
                aria-label="Open account menu"
                aria-expanded={profileOpen}
                aria-controls="account-menu"
                onClick={() => setProfileOpenForPath((current) => (current === pathname ? null : pathname))}
                className="flex h-9 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:px-3"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neutral-900 font-mono text-[11px] font-semibold text-white">
                  {(profile?.full_name || user.email || 'U').slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-36 truncate sm:block">
                  {profile?.full_name || user.email}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
              </button>

              {profileOpen && (
                <div
                  id="account-menu"
                  className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg shadow-neutral-900/5"
                >
                  <div className="px-2.5 py-2">
                    <p className="truncate text-sm font-medium text-neutral-950">
                      {profile?.full_name || 'CampusFix user'}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{user.email}</p>
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-blue-600">
                      {roleLabel}
                    </p>
                  </div>
                  <div className="my-1 border-t border-neutral-200" />
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <LogOut className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : isLoading ? (
            <span className="h-9 w-24 animate-pulse rounded-lg bg-neutral-200" aria-label="Loading account" />
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <Link
                className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-950"
                href="/login"
              >
                Sign in
              </Link>
              <Link
                className="whitespace-nowrap rounded-lg bg-neutral-950 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                href="/register"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </header>

      {isPortal ? (
        <div className="mx-auto flex w-full max-w-[1440px] flex-1">
          <Sidebar
            title={role === 'admin' ? 'Campus Admin' : role === 'super_admin' ? 'Platform' : 'Workspace'}
            items={items.map((item) => {
              const Icon = item.icon;
              return {
                href: item.href,
                label: item.label,
                matchPrefixes: item.matchPrefixes,
                icon: <Icon className="h-4 w-4" aria-hidden="true" />,
              };
            })}
            className="hidden lg:flex"
          />
          <main className="min-w-0 flex-1 pb-24 lg:pb-10">{children}</main>

          <nav
            aria-label="Workspace navigation"
            className="fixed inset-x-0 bottom-0 z-40 grid border-t border-neutral-200 bg-white px-2 py-1.5 lg:hidden"
            style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
          >
            {items.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(pathname, item.href, item.matchPrefixes);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[11px] font-medium transition-colors ${
                    active ? 'text-blue-600' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="max-w-full truncate">{item.shortLabel}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ) : (
        <>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
          <Footer />
        </>
      )}
    </div>
  );
}
