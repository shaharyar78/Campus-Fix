import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Login - CampusFix',
  description: 'Sign in to CampusFix to report issues and track campus maintenance requests.',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/80 bg-white/70 shadow-2xl backdrop-blur-xl lg:grid-cols-2">
       <section className="hidden flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-orange-900 p-10 text-white lg:flex"><div className="text-sm font-bold tracking-wide">CAMPUSFIX</div><div><p className="text-sm font-semibold uppercase tracking-[.2em] text-orange-300">A better campus starts here</p><h1 className="mt-4 text-4xl font-bold leading-tight">Report it.<br/>Track it.<br/>Get it fixed.</h1><p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">One place for campus issues and updates from your maintenance team.</p></div><p className="text-xs text-slate-400">Made for every campus.</p></section>
       <Card className="w-full rounded-none border-0 bg-transparent shadow-none">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your campus dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
       </Card>
      </div>
    </div>
  );
}
