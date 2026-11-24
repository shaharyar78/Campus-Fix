import React from 'react';
import { requirePageAuth } from '@/lib/pageAuth';

export const dynamic = 'force-dynamic';

export default async function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAuth(['student', 'admin', 'super_admin']);
  return <>{children}</>;
}
