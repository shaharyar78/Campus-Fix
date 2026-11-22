import Link from 'next/link';
import { ArrowLeft, FilePenLine } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ReportForm } from '@/components/report/ReportForm';

export const metadata = {
  title: 'Report New Issue - CampusFix',
  description: 'Submit an issue report for campus facility and infrastructure repairs.',
};

export default function NewReportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b border-neutral-200 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700">
              <FilePenLine className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">Report an Infrastructure Issue</CardTitle>
              <CardDescription>
                Provide issue details, select your campus building location, and attach optional photos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <ReportForm />
        </CardContent>
      </Card>
    </div>
  );
}
