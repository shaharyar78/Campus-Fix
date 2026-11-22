import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Building2, ShieldCheck, Wrench } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Report with precision',
    text: 'Select your campus building, floor, and room, and attach a photo with a brief note.',
    icon: Building2,
  },
  {
    number: '02',
    title: 'Follow live progress',
    text: 'Monitor every status change from submitted to resolved using your unique tracking ID.',
    icon: Wrench,
  },
  {
    number: '03',
    title: 'Prioritize together',
    text: 'Upvote existing campus reports so facilities teams focus on the highest-impact fixes first.',
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl py-6 sm:py-12">
      <section className="rounded-2xl border border-neutral-200 bg-white px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
        <div className="max-w-3xl">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-blue-600">
            Campus maintenance workspace
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-950 [text-wrap:balance] sm:text-5xl lg:text-6xl">
            A better campus starts with one report.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg">
            Report facility issues in seconds, follow live repair updates, and help your campus team focus on what matters.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/report/new"
              className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-neutral-950 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <span>Report an issue</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/track"
              className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <span>Track a report</span>
              <ArrowUpRight className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-6 border-t border-neutral-200 pt-10 sm:mt-16 sm:grid-cols-3">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.number} className="space-y-3">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="font-mono text-xs font-medium tracking-wider text-blue-600">
                    {item.number}
                  </span>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <h2 className="font-display text-base font-semibold text-neutral-950">{item.title}</h2>
                <p className="text-sm leading-relaxed text-neutral-600">{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
