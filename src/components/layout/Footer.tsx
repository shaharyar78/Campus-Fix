import Link from 'next/link';

export const Footer = () => (
  <footer className="mt-auto border-t border-neutral-200 bg-white">
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-neutral-500 sm:flex-row sm:px-6">
      <Link href="/" className="font-display font-semibold text-neutral-900">
        CampusFix
      </Link>
      <p>Structured campus maintenance reporting and resolution tracking.</p>
      <span className="tabular-nums">© {new Date().getFullYear()} CampusFix</span>
    </div>
  </footer>
);
