'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  matchPrefixes?: string[];
}

export interface SidebarProps {
  title?: string;
  items: SidebarItem[];
  className?: string;
}

export function isRouteActive(pathname: string, href: string, matchPrefixes?: string[]): boolean {
  if (pathname === href) return true;
  if (matchPrefixes?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  if (href === '/admin' || href === '/super-admin' || href === '/dashboard') {
    return false;
  }
  return pathname.startsWith(`${href}/`);
}

export const Sidebar: React.FC<SidebarProps> = ({ title, items, className }) => {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'sticky top-14 flex h-[calc(100vh-3.5rem)] w-60 shrink-0 flex-col justify-between border-r border-neutral-200 bg-white px-3 py-5',
        className
      )}
      aria-label="Sidebar navigation"
    >
      <div className="space-y-4">
        {title && (
          <h2 className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            {title}
          </h2>
        )}
        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = isRouteActive(pathname, item.href, item.matchPrefixes);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex min-h-10 items-center justify-between rounded-lg px-3 text-sm transition-colors duration-150',
                  isActive
                    ? 'bg-neutral-100 font-medium text-neutral-950'
                    : 'font-normal text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {item.icon && (
                    <span
                      className={cn(
                        'shrink-0 transition-colors duration-150',
                        isActive ? 'text-blue-600' : 'text-neutral-400 group-hover:text-neutral-700'
                      )}
                    >
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="ml-2 font-mono text-xs tabular-nums text-neutral-500">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-600">
        <p className="font-medium text-neutral-900">Urgent safety issue?</p>
        <p className="mt-1 text-neutral-500">
          For active electrical hazards, leaks, or power outages, contact your campus security desk directly.
        </p>
      </div>
    </aside>
  );
};
