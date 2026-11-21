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
}

export interface SidebarProps {
  title?: string;
  items: SidebarItem[];
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ title, items, className }) => {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'sticky top-[5rem] flex h-[calc(100vh-5rem)] w-64 shrink-0 flex-col justify-between border-r border-white/70 p-4',
        className
      )}
      aria-label="Sidebar navigation"
    >
      <div className="space-y-4">
        {title && (
          <h2 className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {title}
          </h2>
        )}
        <nav className="space-y-1.5">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex min-h-11 items-center justify-between rounded-xl px-3 text-sm transition-colors',
                  isActive
                    ? 'bg-white/90 font-semibold text-blue-800 shadow-sm ring-1 ring-blue-100'
                    : 'font-medium text-slate-600 hover:bg-white/65 hover:text-slate-950'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="flex items-center gap-3">
                  {item.icon && (
                    <span
                      className={cn(
                        'transition-colors',
                        isActive ? 'text-blue-700' : 'text-slate-400 group-hover:text-slate-700'
                      )}
                    >
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'ml-auto rounded-full px-2 py-0.5 text-xs font-semibold',
                      isActive ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs leading-5 text-slate-600">
        <p className="font-semibold text-slate-800">Need immediate help?</p>
        <p className="mt-1">For safety emergencies or urgent water/power cuts, contact your campus helpline.</p>
      </div>
    </aside>
  );
};
