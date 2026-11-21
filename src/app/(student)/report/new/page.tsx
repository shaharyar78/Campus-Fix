import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ReportForm } from '@/components/report/ReportForm';
import Link from 'next/link';

export const metadata = {
  title: 'Report New Issue - CampusFix',
  description: 'Submit an issue report for campus facility and infrastructure repairs.',
};

export default function NewReportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back breadcrumb */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Report an Infrastructure Issue</CardTitle>
              <CardDescription>
                Provide issue details, building location, and optional photos for rapid resolution
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
