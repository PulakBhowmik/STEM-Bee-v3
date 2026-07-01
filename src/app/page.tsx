import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Headphones, ShieldCheck, Users } from "lucide-react";

const RULEBOOK_URL = "https://drive.google.com/file/d/1cxrpBt3_mzxgzDrTv_5IgWjBfxTr1uKE/view?usp=drive_link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
        <nav className="flex items-center justify-between border-b border-[var(--line)] pb-4">
          <Image
            src="/brand/sciblitz-logo.png"
            alt="SciBlitz 2.0"
            width={1600}
            height={967}
            className="h-9 w-auto sm:h-10"
            sizes="120px"
            priority
          />
          <Link
            href="/arena"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-strong)]"
          >
            <Headphones size={16} aria-hidden="true" />
            Team arena
          </Link>
        </nav>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 py-12 text-center">
          <Image
            src="/brand/sciblitz-logo.png"
            alt="SciBlitz 2.0"
            width={1600}
            height={967}
            className="h-20 w-auto sm:h-28"
            sizes="300px"
            priority
          />

          <div className="space-y-5">
            <h1 className="max-w-2xl text-3xl font-semibold leading-[1.15] sm:text-5xl">
              A lightning-fast spelling showdown for STEM minds.
            </h1>
            <p className="mx-auto max-w-xl text-lg leading-8 text-[var(--muted)]">
              Listen to the word, type the spelling, and lock in your answer before time runs out. Every submission
              is scored and saved the instant you confirm it.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/arena"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-5 py-3 font-semibold text-white hover:bg-[var(--accent-strong)]"
            >
              <Headphones size={19} aria-hidden="true" />
              Enter team arena
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a
              href={RULEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-5 py-3 font-semibold hover:border-[var(--accent)]"
            >
              <BookOpen size={19} aria-hidden="true" />
              Read the rulebook
            </a>
          </div>

          <div className="grid w-full gap-4 pt-6 text-left sm:grid-cols-2">
            {[
              {
                icon: Users,
                title: "Contest format",
                body: "Teams compete together, but only one member plays. Answer audio spelling questions during the live contest window.",
              },
              {
                icon: ShieldCheck,
                title: "One login, one device",
                body: "Logging in on a new device automatically signs the old one out. Your team's score is never lost — it always picks up where you left off.",
              },
              {
                icon: CheckCircle2,
                title: "Scoring",
                body: "Capitalization and stray spaces never count against you. Each question can be submitted once, so make it count before confirming.",
              },
              {
                icon: Clock,
                title: "Timing",
                body: "The arena unlocks automatically at contest start time and locks at the end. No need to refresh — just keep the page open.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <item.icon className="mb-4 text-[var(--accent)]" size={22} aria-hidden="true" />
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <footer className="flex flex-col items-center gap-2 border-t border-[var(--line)] py-5 text-sm text-[var(--muted)] sm:flex-row sm:justify-between">
          <p>SciBlitz 2.0</p>
          <div className="flex gap-4">
            <Link href="/admin" className="hover:text-[var(--accent-strong)]">
              Admin console
            </Link>
          </div>
        </footer>
      </section>
    </main>
  );
}
