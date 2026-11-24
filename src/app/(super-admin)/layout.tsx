import React from 'react';
import { requirePageAuth } from '@/lib/pageAuth';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAuth(['super_admin']);
  return <>{children}</>;
}
