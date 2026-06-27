import Link from "next/link";
import { ArrowRight, ClipboardList, Gauge, Headphones, ShieldCheck, Trophy } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
        <nav className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#181713] text-white">
              <Trophy size={20} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--muted)]">STEM Bee</p>
              <h1 className="text-xl font-semibold">Competition Console</h1>
            </div>
          </div>
          <Link
            href="/admin/setup"
            className="hidden rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium hover:border-[var(--accent)] sm:inline-flex"
          >
            First admin setup
          </Link>
        </nav>

        <div className="grid flex-1 gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-8">
            <div className="space-y-5">
              <p className="inline-flex rounded-md bg-[#e8fff4] px-3 py-1 text-sm font-semibold text-[#086449]">
                Built for live spelling rounds
              </p>
              <h2 className="max-w-2xl text-4xl font-semibold leading-[1.08] sm:text-6xl">
                Fast contest control for audio spelling teams.
              </h2>
              <p className="max-w-xl text-lg leading-8 text-[var(--muted)]">
                Upload your ZIP, generate team credentials, open the contest window, and collect exact spelling submissions without exposing the answer key.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/arena"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-5 py-3 font-semibold text-white hover:bg-[var(--accent-strong)]"
              >
                <Headphones size={19} aria-hidden="true" />
                Team arena
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-5 py-3 font-semibold hover:border-[var(--accent)]"
              >
                <ShieldCheck size={19} aria-hidden="true" />
                Admin console
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Gauge,
                title: "Fast submissions",
                body: "Each answer goes straight to the database through an atomic scoring function.",
              },
              {
                icon: ClipboardList,
                title: "ZIP import",
                body: "Reads your sample CSV shape and uploads matching WAV files to Supabase Storage.",
              },
              {
                icon: ShieldCheck,
                title: "Hidden answers",
                body: "Contestants only receive serials and signed audio URLs while the contest is active.",
              },
              {
                icon: Trophy,
                title: "Live results",
                body: "Admins get a refreshing scoreboard and a final CSV export for records.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <item.icon className="mb-5 text-[var(--accent)]" size={24} aria-hidden="true" />
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
