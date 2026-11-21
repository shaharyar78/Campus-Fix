import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'CampusFix - Campus Maintenance & Issue Reporting Platform',
  description:
    'A multi-college maintenance reporting platform empowering students to report campus issues and campus staff to triage and fix them effectively.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased"><AppShell>{children}</AppShell></body>
    </html>
  );
}
