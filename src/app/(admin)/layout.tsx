import React from 'react';
import { requirePageAuth } from '@/lib/pageAuth';

export const dynamic = 'force-dynamic';

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAuth(['admin', 'super_admin']);
  return <>{children}</>;
}
