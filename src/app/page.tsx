import Link from 'next/link';

const highlights = [
  { number: '01', title: 'Report clearly', text: 'Add the location, a short description, and a photo when it helps.' },
  { number: '02', title: 'Follow progress', text: 'See each update in one place, from submitted to resolved.' },
  { number: '03', title: 'Fix it together', text: 'Support existing reports so campus teams can prioritize the right work.' },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:px-8">
      <section className="glass-panel relative isolate overflow-hidden rounded-[2rem] px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full bg-blue-300/45 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 -z-10 h-80 w-80 rounded-full bg-violet-300/35 blur-3xl" />
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/55 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-800 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Campus care, made simple
          </div>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
            A better campus starts with <span className="text-blue-700">one report.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Report maintenance issues, follow the repair, and help your campus team focus on what matters.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/report/new" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-950/15 transition hover:-translate-y-0.5 hover:bg-blue-800">
              Report an issue <span aria-hidden="true">→</span>
            </Link>
            <Link href="/track" className="inline-flex items-center gap-2 rounded-xl border border-white/90 bg-white/55 px-5 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-white/85">
              Track a report <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <p className="mt-5 text-xs font-medium text-slate-500">One simple place for students and campus teams.</p>
        </div>

        <div className="mt-14 grid gap-3 border-t border-white/70 pt-6 sm:mt-20 sm:grid-cols-3 sm:gap-5 sm:pt-8">
          {highlights.map((item) => (
            <article key={item.number} className="glass-soft rounded-2xl p-5 sm:p-6">
              <span className="text-xs font-bold tracking-[0.16em] text-blue-700">{item.number}</span>
              <h2 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
