import type { Metadata } from 'next';
import { DM_Sans, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { connection } from 'next/server';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CampusFix — Campus Maintenance & Issue Reporting',
  description:
    'A clean campus maintenance platform for reporting facility issues, selecting campus buildings, and tracking repairs.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
