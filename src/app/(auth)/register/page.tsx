import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata = {
  title: 'Register - CampusFix',
  description: 'Create an account on CampusFix to report issues and track campus repairs.',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/80 bg-white/70 shadow-2xl backdrop-blur-xl lg:grid-cols-2">
       <section className="hidden flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-orange-900 p-10 text-white lg:flex"><div className="text-sm font-bold tracking-wide">CAMPUSFIX</div><div><p className="text-sm font-semibold uppercase tracking-[.2em] text-orange-300">Your campus, improved</p><h1 className="mt-4 text-4xl font-bold leading-tight">Small reports.<br/>Real change.</h1><p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">Create your student account to submit and follow campus maintenance issues.</p></div><p className="text-xs text-slate-400">One workspace for every campus.</p></section>
       <Card className="w-full rounded-none border-0 bg-transparent shadow-none">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">Join CampusFix</CardTitle>
          <CardDescription>
            Select your college and register to report maintenance problems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
       </Card>
      </div>
    </div>
  );
}
