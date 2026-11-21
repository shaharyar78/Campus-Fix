import Link from 'next/link';

export const Footer = () => (
  <footer className="mt-auto px-4 pb-4 sm:px-6">
    <div className="glass-soft mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 rounded-2xl px-5 py-4 text-xs text-slate-500 sm:flex-row">
      <Link href="/" className="font-semibold text-slate-700">Campus<span className="text-blue-700">Fix</span></Link>
      <p>Small fixes make a better campus.</p>
      <span>© {new Date().getFullYear()} CampusFix</span>
    </div>
  </footer>
);
